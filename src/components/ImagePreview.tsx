import { useEffect, useRef, useState, useCallback } from 'react';
import { Download, Columns2, SlidersHorizontal, ChevronDown } from 'lucide-react';

interface ImagePreviewProps {
  originalImage: HTMLImageElement | null;
  processedImageData: ImageData | null;
  onExport: (format: 'png' | 'jpg' | 'webp', quality?: number) => void;
}

type ViewMode = 'split' | 'compare';

function drawToCanvas(canvas: HTMLCanvasElement | null, source: HTMLImageElement | ImageData | null) {
  if (!canvas || !source) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (source instanceof HTMLImageElement) {
    canvas.width = source.width;
    canvas.height = source.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0);
  } else {
    canvas.width = source.width;
    canvas.height = source.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(source, 0, 0);
  }
}

export default function ImagePreview({ originalImage, processedImageData, onExport }: ImagePreviewProps) {
  const splitOrigRef = useRef<HTMLCanvasElement>(null);
  const splitProcRef = useRef<HTMLCanvasElement>(null);
  const cmpOrigRef = useRef<HTMLCanvasElement>(null);
  const cmpProcRef = useRef<HTMLCanvasElement>(null);
  const compareContainerRef = useRef<HTMLDivElement>(null);

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpg' | 'webp'>('png');
  const [exportQuality, setExportQuality] = useState(95);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      if (viewMode === 'split') {
        drawToCanvas(splitOrigRef.current, originalImage);
        drawToCanvas(splitProcRef.current, processedImageData);
      } else {
        drawToCanvas(cmpOrigRef.current, originalImage);
        drawToCanvas(cmpProcRef.current, processedImageData);
      }
    });
  }, [originalImage, processedImageData, viewMode]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !compareContainerRef.current) return;
    const rect = compareContainerRef.current.getBoundingClientRect();
    setSliderPos(Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)));
  }, [isDragging]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!compareContainerRef.current) return;
    e.preventDefault();
    const rect = compareContainerRef.current.getBoundingClientRect();
    setSliderPos(Math.min(100, Math.max(0, ((e.touches[0].clientX - rect.left) / rect.width) * 100)));
  }, []);

  if (!originalImage) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex bg-bz-deep border border-bz-grid p-0.5">
          <button
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono-ui tracking-widest transition-colors duration-240 ${
              viewMode === 'split'
                ? 'bg-bz-cyan/10 text-bz-cyan'
                : 'text-bz-system hover:text-bz-paper'
            }`}
          >
            <Columns2 className="w-3 h-3" />
            SPLIT
          </button>
          <button
            onClick={() => setViewMode('compare')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono-ui tracking-widest transition-colors duration-240 ${
              viewMode === 'compare'
                ? 'bg-bz-cyan/10 text-bz-cyan'
                : 'text-bz-system hover:text-bz-paper'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" />
            COMPARE
          </button>
        </div>

        {processedImageData && (
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono-ui text-bz-paper border border-bz-grid hover:border-bz-system transition-colors duration-240 tracking-widest"
              >
                {exportFormat.toUpperCase()}
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 z-20 bg-bz-deep border border-bz-grid p-2 min-w-[160px]">
                  <div className="space-y-0.5">
                    {(['png', 'jpg', 'webp'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => { setExportFormat(fmt); setShowExportMenu(false); }}
                        className={`w-full text-left px-2 py-1.5 text-[10px] font-mono-ui tracking-widest transition-colors duration-240 ${
                          exportFormat === fmt
                            ? 'bg-bz-cyan/10 text-bz-cyan'
                            : 'text-bz-paper hover:bg-bz-grid'
                        }`}
                      >
                        {fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  {(exportFormat === 'jpg' || exportFormat === 'webp') && (
                    <div className="mt-2 pt-2 border-t border-bz-grid space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[9px] font-mono-ui text-bz-system tracking-widest">QUALITY</span>
                        <span className="text-[9px] font-mono-ui text-bz-cyan">{exportQuality}%</span>
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
            </div>
            <button
              onClick={() => onExport(exportFormat, exportFormat === 'png' ? undefined : exportQuality / 100)}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-bz-cyan text-bz-graphite font-mono-ui text-[10px] tracking-widest hover:bg-bz-cyan/90 transition-colors duration-240 font-semibold"
            >
              <Download className="w-3 h-3" />
              EXPORT
            </button>
          </div>
        )}
      </div>

      {viewMode === 'split' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-bz-system" />
              <span className="text-[9px] font-mono-ui text-bz-system tracking-[0.2em]">INPUT · ORIGINAL</span>
            </div>
            <div className="panel p-1 flex items-center justify-center min-h-[200px]">
              <canvas ref={splitOrigRef} className="max-w-full h-auto" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-bz-cyan animate-signal-pulse" />
              <span className="text-[9px] font-mono-ui text-bz-cyan tracking-[0.2em]">OUTPUT · DITHERED</span>
            </div>
            <div className="panel p-1 flex items-center justify-center min-h-[200px]">
              {processedImageData ? (
                <canvas ref={splitProcRef} className="max-w-full h-auto" />
              ) : (
                <div className="text-[10px] font-mono-ui text-bz-system tracking-widest">RENDERING...</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-bz-cyan animate-signal-pulse" />
            <span className="text-[9px] font-mono-ui text-bz-system tracking-[0.2em]">DRAG TO COMPARE</span>
          </div>
          <div
            ref={compareContainerRef}
            className="relative overflow-hidden border border-bz-grid cursor-col-resize select-none"
            onMouseMove={handleMouseMove}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => setIsDragging(false)}
          >
            <canvas ref={cmpOrigRef} className="w-full h-auto block" />

            {processedImageData && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
              >
                <canvas
                  ref={cmpProcRef}
                  className="w-full h-auto block"
                />
              </div>
            )}

            <div
              className="absolute top-0 bottom-0 w-px bg-bz-cyan"
              style={{ left: `${sliderPos}%` }}
            />

            <div
              className="absolute top-0 bottom-0"
              style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)', width: '40px' }}
              onMouseDown={() => setIsDragging(true)}
              onTouchStart={() => setIsDragging(true)}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 bg-bz-graphite border border-bz-cyan flex items-center justify-center">
                <SlidersHorizontal className="w-3 h-3 text-bz-cyan" />
              </div>
            </div>

            <div className="absolute top-2 left-2 text-[9px] font-mono-ui text-bz-paper bg-bz-graphite/80 px-1.5 py-0.5 pointer-events-none tracking-[0.2em]">
              ORIGINAL
            </div>
            <div className="absolute top-2 right-2 text-[9px] font-mono-ui text-bz-cyan bg-bz-graphite/80 px-1.5 py-0.5 pointer-events-none tracking-[0.2em]">
              DITHERED
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
