import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';

interface ImagePreviewProps {
  originalImage: HTMLImageElement | null;
  processedImageData: ImageData | null;
  onExport: (format: 'png' | 'jpg' | 'webp', quality?: number) => void;
}

export default function ImagePreview({ originalImage, processedImageData, onExport }: ImagePreviewProps) {
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpg' | 'webp'>('png');
  const [exportQuality, setExportQuality] = useState(95);

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

  if (!originalImage) {
    return null;
  }

  return (
    <div className="space-y-4">
      {processedImageData && (
        <div className="sticky top-4 z-10 bg-black/70 backdrop-blur-sm pb-2 rounded-lg p-4">
          <div className="space-y-3">
            {showExportMenu && (
              <div className="space-y-3 mb-3">
                <div>
                  <label className="block text-xs text-[#00ffff] mb-2">Format</label>
                  <div className="flex gap-2">
                    {(['png', 'jpg', 'webp'] as const).map((format) => (
                      <button
                        key={format}
                        onClick={() => setExportFormat(format)}
                        className={`flex-1 px-3 py-2 rounded-lg font-semibold transition-all border-2 text-sm ${
                          exportFormat === format
                            ? 'bg-[#00ffff]/20 text-[#00ffff] border-[#00ffff] glow-cyan'
                            : 'bg-black/30 text-[#00ff41]/60 border-[#00ff41]/20 hover:border-[#00ff41]/50'
                        }`}
                      >
                        {format.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                {(exportFormat === 'jpg' || exportFormat === 'webp') && (
                  <div>
                    <label className="block text-xs text-[#00ffff] mb-2">
                      Quality: {exportQuality}%
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={exportQuality}
                      onChange={(e) => setExportQuality(Number(e.target.value))}
                      className="w-full accent-[#00ffff]"
                    />
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-4 py-3 bg-[#0f1f18] text-[#00ff41] border-2 border-[#00ff41]/50 rounded-lg hover:border-[#00ff41] hover:glow-green transition-all font-semibold"
              >
                {showExportMenu ? 'Hide' : 'Options'}
              </button>
              <button
                onClick={() => onExport(exportFormat, exportFormat === 'png' ? undefined : exportQuality / 100)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#ff006e] hover:bg-[#ff006e]/80 text-white font-bold rounded-lg transition-all glow-pink border-2 border-[#ff006e]/50 hover:border-[#ff006e]"
              >
                <Download className="w-5 h-5" />
                Download {exportFormat.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-bold text-[#00ff41] mb-2 tracking-wider uppercase">Original</h3>
          <div className="control-panel-bg rounded-lg p-4 flex items-center justify-center">
            <canvas
              ref={originalCanvasRef}
              className="max-w-full h-auto rounded"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-[#00ffff] mb-2 tracking-wider uppercase">Dithered</h3>
          <div className="control-panel-bg rounded-lg p-4 flex items-center justify-center">
            {processedImageData ? (
              <canvas
                ref={processedCanvasRef}
                className="max-w-full h-auto rounded"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <div className="text-[#00ffff]/60">Processing...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
