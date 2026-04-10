import { useEffect, useRef, useState, useCallback } from 'react';
import { Download, Sparkles, Columns2, SlidersHorizontal } from 'lucide-react';
import ProModal from './ProModal';

interface ImagePreviewProps {
  originalImage: HTMLImageElement | null;
  processedImageData: ImageData | null;
  onExport: (format: 'png' | 'jpg' | 'webp', quality?: number) => void;
}

type ViewMode = 'split' | 'compare';

export default function ImagePreview({ originalImage, processedImageData, onExport }: ImagePreviewProps) {
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement>(null);
  const compareContainerRef = useRef<HTMLDivElement>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpg' | 'webp'>('png');
  const [exportQuality, setExportQuality] = useState(95);
  const [showProModal, setShowProModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!originalImage || !originalCanvasRef.current) return;
    const canvas = originalCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;
    ctx.drawImage(originalImage, 0, 0);
  }, [originalImage]);

  useEffect(() => {
    if (!processedImageData || !processedCanvasRef.current) return;
    const canvas = processedCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = processedImageData.width;
    canvas.height = processedImageData.height;
    ctx.putImageData(processedImageData, 0, 0);
  }, [processedImageData]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !compareContainerRef.current) return;
    const rect = compareContainerRef.current.getBoundingClientRect();
    const pct = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    setSliderPos(pct);
  }, [isDragging]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!compareContainerRef.current) return;
    e.preventDefault();
    const rect = compareContainerRef.current.getBoundingClientRect();
    const pct = Math.min(100, Math.max(0, ((e.touches[0].clientX - rect.left) / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  if (!originalImage) return null;

  return (
    <div className="space-y-4">
      {processedImageData && (
        <div className="sticky top-4 z-10 bg-[#080f0a]/80 backdrop-blur-md rounded-xl border border-[#00ff41]/20 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-black/40 rounded-lg p-1 border border-[#00ff41]/15">
              <button
                onClick={() => setViewMode('split')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'split'
                    ? 'bg-[#00ff41]/15 text-[#00ff41] border border-[#00ff41]/40'
                    : 'text-[#00ff41]/40 hover:text-[#00ff41]/70'
                }`}
              >
                <Columns2 className="w-3.5 h-3.5" />
                Split
              </button>
              <button
                onClick={() => setViewMode('compare')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'compare'
                    ? 'bg-[#00ff41]/15 text-[#00ff41] border border-[#00ff41]/40'
                    : 'text-[#00ff41]/40 hover:text-[#00ff41]/70'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Compare
              </button>
            </div>

            <div className="flex gap-2 flex-1 justify-end">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-3 py-2 bg-black/40 text-[#00ff41]/70 border border-[#00ff41]/20 rounded-lg hover:border-[#00ff41]/50 hover:text-[#00ff41] transition-all text-xs font-semibold"
              >
                {showExportMenu ? 'Hide' : 'Options'}
              </button>
              <button
                onClick={() => onExport(exportFormat, exportFormat === 'png' ? undefined : exportQuality / 100)}
                className="flex items-center gap-2 px-5 py-2 bg-[#ff006e] hover:bg-[#ff006e]/85 text-white font-bold rounded-lg transition-all glow-pink border border-[#ff006e]/60 text-sm"
              >
                <Download className="w-4 h-4" />
                {exportFormat.toUpperCase()}
              </button>
            </div>
          </div>

          {showExportMenu && (
            <div className="space-y-3 pt-1 border-t border-[#00ff41]/12">
              <div>
                <label className="block text-xs text-[#00ffff]/55 mb-1.5">Format</label>
                <div className="flex gap-1.5">
                  {(['png', 'jpg', 'webp'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setExportFormat(fmt)}
                      className={`flex-1 px-2 py-1.5 rounded-lg font-bold transition-all border text-xs ${
                        exportFormat === fmt
                          ? 'bg-[#00ffff]/12 text-[#00ffff] border-[#00ffff]/55 glow-cyan'
                          : 'bg-black/20 text-[#00ff41]/45 border-[#00ff41]/12 hover:border-[#00ff41]/35'
                      }`}
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              {(exportFormat === 'jpg' || exportFormat === 'webp') && (
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-xs text-[#00ffff]/55">Quality</label>
                    <span className="text-xs font-mono text-[#00ff41] bg-[#00ff41]/10 px-1.5 rounded">{exportQuality}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={exportQuality}
                    onChange={(e) => setExportQuality(Number(e.target.value))}
                    className="w-full custom-slider"
                  />
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setShowProModal(true)}
            className="w-full flex items-center justify-center gap-2 py-1.5 text-[#00ffff]/40 border border-[#00ffff]/10 rounded-lg hover:border-[#00ffff]/35 hover:text-[#00ffff]/70 transition-all text-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            InkNoise Pro — Coming Soon
          </button>
        </div>
      )}

      {viewMode === 'split' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold text-[#00ff41]/60 mb-2 tracking-widest uppercase">Original</p>
            <div className="control-panel-bg rounded-xl p-3 flex items-center justify-center min-h-[200px]">
              <canvas
                ref={originalCanvasRef}
                className="max-w-full h-auto rounded"
              />
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-[#00ffff]/60 mb-2 tracking-widest uppercase">Dithered</p>
            <div className="control-panel-bg rounded-xl p-3 flex items-center justify-center min-h-[200px]">
              {processedImageData ? (
                <canvas
                  ref={processedCanvasRef}
                  className="max-w-full h-auto rounded"
                />
              ) : (
                <div className="text-[#00ffff]/40 text-sm">Processing...</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-xs font-bold text-[#00ff41]/60 mb-2 tracking-widest uppercase">
            Drag slider to compare
          </p>
          <div
            ref={compareContainerRef}
            className="relative overflow-hidden rounded-xl border border-[#00ff41]/20 cursor-ew-resize select-none"
            onMouseMove={handleMouseMove}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => setIsDragging(false)}
          >
            <canvas
              ref={originalCanvasRef}
              className="w-full h-auto block"
            />
            <div
              className="absolute inset-0"
              style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
            >
              <canvas
                ref={processedCanvasRef}
                className="block"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                }}
              />
            </div>
            <div
              className="absolute top-0 bottom-0 w-px bg-white/80"
              style={{ left: `${sliderPos}%` }}
            />
            <div
              className="absolute top-0 bottom-0"
              style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)', width: '40px' }}
              onMouseDown={() => setIsDragging(true)}
              onTouchStart={() => setIsDragging(true)}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border-2 border-gray-800 flex items-center justify-center shadow-lg">
                <SlidersHorizontal className="w-3.5 h-3.5 text-gray-800" />
              </div>
            </div>
            <div className="absolute top-2 left-2 text-xs text-white/80 bg-black/60 px-2 py-1 rounded-md backdrop-blur-sm pointer-events-none">
              Original
            </div>
            <div className="absolute top-2 right-2 text-xs text-white/80 bg-black/60 px-2 py-1 rounded-md backdrop-blur-sm pointer-events-none">
              Dithered
            </div>
          </div>
        </div>
      )}

      <ProModal isOpen={showProModal} onClose={() => setShowProModal(false)} />
    </div>
  );
}
