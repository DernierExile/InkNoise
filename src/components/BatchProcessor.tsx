import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, X, CheckCircle2, AlertCircle, Loader2, Download, Trash2 } from 'lucide-react';
import { useT } from '../i18n/use-i18n';
import {
  buildOutputName,
  downloadBlob,
  filterAndCapImageFiles,
  loadImageFromFile,
  makeBatchItem,
  packZip,
  MAX_BATCH_SIZE,
  type BatchItem,
} from '../lib/batch';
import type { PresetConfig } from '../lib/presets';
import { PREDEFINED_PALETTES } from '../utils/palettes';
import { MAX_DIMENSION_PRO } from '../utils/imageResize';
import DitheringWorker from '../workers/dithering.worker?worker';

interface BatchProcessorProps {
  config: PresetConfig;
}

function resolvePalette(config: PresetConfig): string[] {
  let palette = PREDEFINED_PALETTES[config.selectedPalette]?.colors
    ?? PREDEFINED_PALETTES[0].colors;
  if (config.colorMode === 'mono') {
    palette = PREDEFINED_PALETTES[0].colors;
  } else if (config.colorMode === 'indexed' && config.colorCount < palette.length) {
    palette = palette.slice(0, config.colorCount);
  }
  return palette;
}

async function imageToImageData(
  img: HTMLImageElement,
  maxDim: number,
): Promise<ImageData> {
  let { width, height } = img;
  if (width > maxDim || height > maxDim) {
    const ratio = width > height ? maxDim / width : maxDim / height;
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_context_unavailable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

function imageDataToBlob(data: ImageData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = data.width;
  canvas.height = data.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('canvas_context_unavailable'));
  ctx.putImageData(data, 0, 0);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('blob_failed'));
    }, 'image/png');
  });
}

export default function BatchProcessor({ config }: BatchProcessorProps) {
  const t = useT();
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [zipBuilding, setZipBuilding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Item management
  // ---------------------------------------------------------------------------

  const addFiles = useCallback((files: FileList | File[]) => {
    const { accepted, rejectedCount, truncatedCount } = filterAndCapImageFiles(files);

    setItems((prev) => {
      const remaining = MAX_BATCH_SIZE - prev.length;
      if (remaining <= 0) {
        setNotice(t('batch.errorMaxReached', { max: MAX_BATCH_SIZE }));
        return prev;
      }
      const toAdd = accepted.slice(0, remaining).map(makeBatchItem);
      const overflowCount = Math.max(0, accepted.length - remaining);
      const messages: string[] = [];
      if (rejectedCount > 0) {
        messages.push(t('batch.errorUnsupported', { count: rejectedCount }));
      }
      if (truncatedCount > 0 || overflowCount > 0) {
        messages.push(t('batch.errorTruncated', { count: truncatedCount + overflowCount, max: MAX_BATCH_SIZE }));
      }
      setNotice(messages.length ? messages.join(' · ') : null);
      return [...prev, ...toAdd];
    });
  }, [t]);

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const clearAll = () => {
    setItems([]);
    setNotice(null);
  };

  // ---------------------------------------------------------------------------
  // Drag & drop / file picker
  // ---------------------------------------------------------------------------

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) addFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ---------------------------------------------------------------------------
  // Processing queue (sequential, single worker)
  // ---------------------------------------------------------------------------

  const processOne = (worker: Worker, item: BatchItem): Promise<BatchItem> =>
    new Promise(async (resolve) => {
      try {
        const img = await loadImageFromFile(item.file);
        const imageData = await imageToImageData(img, MAX_DIMENSION_PRO);
        const palette = resolvePalette(config);

        const handler = async (e: MessageEvent) => {
          worker.removeEventListener('message', handler);
          const { success, imageData: out, error } = e.data ?? {};
          if (!success || !out) {
            resolve({ ...item, status: 'error', error: error ?? 'worker_failed' });
            return;
          }
          try {
            const blob = await imageDataToBlob(out as ImageData);
            resolve({ ...item, status: 'done', resultBlob: blob });
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'blob_failed';
            resolve({ ...item, status: 'error', error: msg });
          }
        };
        worker.addEventListener('message', handler);
        worker.postMessage({
          imageData,
          algorithm: config.algorithm,
          palette,
          adjustments: config.adjustments,
          colorMode: config.colorMode,
          colorModeSettings: config.colorModeSettings,
          paletteModifiers: config.paletteModifiers,
          postProcessing: config.postProcessing,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'load_failed';
        resolve({ ...item, status: 'error', error: msg });
      }
    });

  const handleProcessAll = async () => {
    if (isProcessing || items.length === 0) return;
    setIsProcessing(true);
    cancelRef.current = false;
    setNotice(null);

    const worker = new DitheringWorker();
    try {
      for (let i = 0; i < items.length; i++) {
        if (cancelRef.current) break;
        const current = items[i];
        if (current.status === 'done') continue;

        setItems((prev) =>
          prev.map((it) => (it.id === current.id ? { ...it, status: 'processing' } : it)),
        );

        const updated = await processOne(worker, current);

        setItems((prev) =>
          prev.map((it) => (it.id === current.id ? updated : it)),
        );
      }
    } finally {
      worker.terminate();
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    cancelRef.current = true;
  };

  // ---------------------------------------------------------------------------
  // ZIP & download
  // ---------------------------------------------------------------------------

  const handleDownloadZip = async () => {
    const done = items.filter((i) => i.status === 'done' && i.resultBlob);
    if (done.length === 0) return;
    setZipBuilding(true);
    try {
      const entries = done.map((i) => ({
        name: buildOutputName(i.name),
        blob: i.resultBlob!,
      }));
      const zipBlob = await packZip(entries);
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      downloadBlob(zipBlob, `inknoise-batch-${stamp}.zip`);
    } catch (err) {
      console.error('zip build failed', err);
      setNotice(t('batch.errorZip'));
    } finally {
      setZipBuilding(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Cleanup blob URLs on unmount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      cancelRef.current = true;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const doneCount = items.filter((i) => i.status === 'done').length;
  const errorCount = items.filter((i) => i.status === 'error').length;

  return (
    <div className="w-full max-w-4xl mx-auto py-8 space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border ${isDragging ? 'border-bz-cyan bg-bz-cyan/5' : 'border-bz-grid hover:border-bz-system'} bg-bz-deep p-8 cursor-pointer transition-colors duration-240`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-2 text-center">
          <Upload className="w-5 h-5 text-bz-system" />
          <span className="text-[11px] font-mono-ui text-bz-paper tracking-widest uppercase">
            {t('batch.dropZone')}
          </span>
          <span className="text-[10px] font-mono-ui text-bz-system tracking-wide">
            {t('batch.dropZoneHint', { current: items.length, max: MAX_BATCH_SIZE })}
          </span>
          <span className="text-[10px] font-mono-ui text-bz-system tracking-wide">
            PNG · JPG · WEBP · GIF
          </span>
        </div>
      </div>

      {notice && (
        <div className="flex items-center gap-2 px-3 py-2 border border-bz-grid bg-bz-deep">
          <AlertCircle className="w-3 h-3 text-bz-cyan flex-shrink-0" />
          <p className="text-[10px] font-mono-ui text-bz-system tracking-wide">{notice}</p>
        </div>
      )}

      {/* Item list */}
      {items.length > 0 && (
        <div className="panel-surface divide-y divide-bz-grid">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-[10px] font-mono-ui text-bz-system tracking-widest uppercase">
              {t('batch.queue', { count: items.length })} · {t('batch.queueDone', { done: doneCount })}{errorCount > 0 ? ` · ${t('batch.queueError', { count: errorCount })}` : ''}
            </span>
            <button
              onClick={clearAll}
              disabled={isProcessing}
              className="flex items-center gap-1 text-[10px] font-mono-ui text-bz-system hover:text-bz-paper tracking-widest uppercase disabled:opacity-50 transition-colors duration-240"
            >
              <Trash2 className="w-3 h-3" />
              {t('batch.clearAll')}
            </button>
          </div>

          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 px-3 py-2">
              <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                {item.status === 'pending' && (
                  <span className="block w-1.5 h-1.5 bg-bz-system" />
                )}
                {item.status === 'processing' && (
                  <Loader2 className="w-3.5 h-3.5 text-bz-cyan animate-spin" />
                )}
                {item.status === 'done' && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-bz-cyan" />
                )}
                {item.status === 'error' && (
                  <AlertCircle className="w-3.5 h-3.5 text-bz-cyan" />
                )}
              </span>
              <span className="flex-1 min-w-0 text-[11px] font-mono-ui text-bz-paper tracking-wide truncate">
                {item.name}
              </span>
              <span className="text-[10px] font-mono-ui text-bz-system tracking-widest uppercase flex-shrink-0">
                {t(`batch.status.${item.status}`)}
              </span>
              <button
                onClick={() => removeItem(item.id)}
                disabled={isProcessing && item.status === 'processing'}
                className="flex-shrink-0 p-1 text-bz-system hover:text-bz-paper disabled:opacity-30 transition-colors duration-240"
                aria-label={t('batch.removeItem', { name: item.name })}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Action bar */}
      {items.length > 0 && (
        <div className="flex items-center justify-end gap-2">
          {isProcessing ? (
            <button
              onClick={handleCancel}
              className="px-3 py-2 text-[10px] font-mono-ui text-bz-system border border-bz-grid hover:text-bz-paper tracking-widest uppercase transition-colors duration-240"
            >
              {t('batch.cancel')}
            </button>
          ) : (
            <>
              <button
                onClick={handleDownloadZip}
                disabled={doneCount === 0 || zipBuilding}
                className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-mono-ui text-bz-paper border border-bz-grid hover:border-bz-cyan tracking-widest uppercase disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-240"
              >
                {zipBuilding ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                {zipBuilding ? t('common.loading') : t('batch.downloadZip', { count: doneCount })}
              </button>
              <button
                onClick={handleProcessAll}
                disabled={items.length === 0}
                className="px-3 py-2 text-[10px] font-mono-ui text-bz-paper border border-bz-cyan bg-bz-cyan/10 hover:bg-bz-cyan/15 tracking-widest uppercase disabled:opacity-50 transition-colors duration-240"
              >
                {t('batch.processAll', { count: items.length })}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
