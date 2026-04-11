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
        <div className="flex gap-px bg-white/[0.02] rounded-md border border-white/[0.04] p-0.5">
          <button
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-mono-ui tracking-wider transition-all ${
              viewMode === 'split'
                ? 'bg-[#00ff41]/10 text-[#00ff41]'
                : 'text-white/25 hover:text-white/45'
            }`}
          >
            <Columns2 className="w-3 h-3" />
            SPLIT
          </button>
          <button
            onClick={() => setViewMode('compare')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-mono-ui tracking-wider transition-all ${
              viewMode === 'compare'
                ? 'bg-[#00ff41]/10 text-[#00ff41]'
                : 'text-white/25 hover:text-white/45'
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
                className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-mono-ui text-white/30 border border-white/[0.06] rounded-md hover:border-white/[0.12] hover:text-white/50 transition-all tracking-wider"
              >
                {exportFormat.toUpperCase()}
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 z-20 bg-[#0e1012] border border-white/[0.06] rounded-md shadow-xl p-2 min-w-[140px]">
                  <div className="space-y-1">
                    {(['png', 'jpg', 'webp'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => { setExportFormat(fmt); setShowExportMenu(false); }}
                        className={`w-full text-left px-2 py-1.5 rounded text-[10px] font-mono-ui tracking-wider transition-all ${
                          exportFormat === fmt
                            ? 'bg-[#00ff41]/10 text-[#00ff41]'
                            : 'text-white/40 hover:text-white/60 hover:bg-white/[0.03]'
                        }`}
                      >
                        {fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  {(exportFormat === 'jpg' || exportFormat === 'webp') && (
                    <div className="mt-2 pt-2 border-t border-white/[0.04] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[9px] font-mono-ui text-white/25">QUALITY</span>
                        <span className="text-[9px] font-mono-ui text-[#00ff41]">{exportQuality}%</span>
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
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00ff41]/15 hover:bg-[#00ff41]/20 text-[#00ff41] font-mono-ui text-[10px] tracking-wider rounded-md transition-all border border-[#00ff41]/20 hover:border-[#00ff41]/35"
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
              <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
              <span className="text-[9px] font-mono-ui text-white/25 tracking-widest">ORIGINAL</span>
            </div>
            <div className="panel rounded-lg p-1 flex items-center justify-center min-h-[200px]">
              <canvas ref={splitOrigRef} className="max-w-full h-auto rounded" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00ff41]/50" />
              <span className="text-[9px] font-mono-ui text-[#00ff41]/40 tracking-widest">DITHERED</span>
            </div>
            <div className="panel rounded-lg p-1 flex items-center justify-center min-h-[200px]">
              {processedImageData ? (
                <canvas ref={splitProcRef} className="max-w-full h-auto rounded" />
              ) : (
                <div className="text-[10px] font-mono-ui text-white/20">Processing...</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00ff41]/50" />
            <span className="text-[9px] font-mono-ui text-white/25 tracking-widest">DRAG TO COMPARE</span>
          </div>
          <div
            ref={compareContainerRef}
            className="relative overflow-hidden rounded-lg border border-white/[0.04] cursor-col-resize select-none"
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
              className="absolute top-0 bottom-0 w-px"
              style={{ left: `${sliderPos}%`, background: 'rgba(0, 255, 65, 0.4)' }}
            />

            <div
              className="absolute top-0 bottom-0"
              style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)', width: '40px' }}
              onMouseDown={() => setIsDragging(true)}
              onTouchStart={() => setIsDragging(true)}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#080a0c] border border-[#00ff41]/40 flex items-center justify-center shadow-lg">
                <SlidersHorizontal className="w-2.5 h-2.5 text-[#00ff41]/70" />
              </div>
            </div>

            <div className="absolute top-2 left-2 text-[9px] font-mono-ui text-white/50 bg-black/60 px-1.5 py-0.5 rounded pointer-events-none tracking-wider">
              ORIGINAL
            </div>
            <div className="absolute top-2 right-2 text-[9px] font-mono-ui text-[#00ff41]/60 bg-black/60 px-1.5 py-0.5 rounded pointer-events-none tracking-wider">
              DITHERED
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
