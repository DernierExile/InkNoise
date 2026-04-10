import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertCircle, Sparkles } from 'lucide-react';
import ImageUpload from './components/ImageUpload';
import ControlPanel from './components/ControlPanel';
import ImagePreview from './components/ImagePreview';
import ProModal from './components/ProModal';
import { DitheringAlgorithm, ColorMode, ImageAdjustments, ResamplingMethod } from './types';
import { PREDEFINED_PALETTES } from './utils/palettes';
import { getResizeInfo } from './utils/imageResize';
import { loadWatermarkImage, drawWatermarkOnCanvas } from './utils/watermark';
import DitheringWorker from './workers/dithering.worker?worker';

function App() {
  const [showProModal, setShowProModal] = useState(false);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [processedImageData, setProcessedImageData] = useState<ImageData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resizeWarning, setResizeWarning] = useState<string | null>(null);
  const [algorithm, setAlgorithm] = useState<DitheringAlgorithm>('floyd-steinberg');
  const [colorMode, setColorMode] = useState<ColorMode>('mono');
  const [selectedPalette, setSelectedPalette] = useState(0);
  const [colorCount, setColorCount] = useState(8);
  const [resamplingMethod, setResamplingMethod] = useState<ResamplingMethod>('bilinear');
  const [adjustments, setAdjustments] = useState<ImageAdjustments>({
    brightness: 0,
    contrast: 0,
    blur: 0,
    sharpen: 0,
    sharpenRadius: 10,
    saturation: 100,
    noise: 0,
    tonalControls: {
      highlights: 0,
      midtones: 0,
      shadows: 0
    },
    levels: {
      inputBlack: 0,
      inputWhite: 255,
      outputBlack: 0,
      outputWhite: 255,
      gamma: 1
    }
  });

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new DitheringWorker();

    workerRef.current.onmessage = (e) => {
      const { success, imageData, error } = e.data;
      if (success) {
        setProcessedImageData(imageData);
      } else {
        console.error('Worker error:', error);
      }
      setIsProcessing(false);
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const handleImageLoad = useCallback((img: HTMLImageElement) => {
    const resizeInfo = getResizeInfo(img.width, img.height);

    if (resizeInfo.isResized) {
      setResizeWarning(
        `Image resized from ${img.width}x${img.height} to ${resizeInfo.newWidth}x${resizeInfo.newHeight} for performance`
      );

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = resizeInfo.newWidth;
      canvas.height = resizeInfo.newHeight;

      switch (resamplingMethod) {
        case 'nearest-neighbor':
          ctx.imageSmoothingEnabled = false;
          break;
        case 'bilinear':
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'low';
          break;
        case 'bicubic':
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          break;
      }

      ctx.drawImage(img, 0, 0, resizeInfo.newWidth, resizeInfo.newHeight);

      const resizedImage = new Image();
      resizedImage.onload = () => setOriginalImage(resizedImage);
      resizedImage.src = canvas.toDataURL();
    } else {
      setResizeWarning(null);
      setOriginalImage(img);
    }
  }, [resamplingMethod]);

  useEffect(() => {
    if (!originalImage || !workerRef.current) return;

    const processImage = () => {
      setIsProcessing(true);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = originalImage.width;
      canvas.height = originalImage.height;
      ctx.drawImage(originalImage, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      let palette = PREDEFINED_PALETTES[selectedPalette].colors;

      if (colorMode === 'mono') {
        palette = PREDEFINED_PALETTES[0].colors;
      } else if (colorMode === 'indexed' && colorCount < palette.length) {
        palette = palette.slice(0, colorCount);
      }

      workerRef.current?.postMessage({
        imageData,
        algorithm,
        palette,
        adjustments
      });
    };

    const timeoutId = setTimeout(processImage, 200);
    return () => clearTimeout(timeoutId);
  }, [originalImage, algorithm, colorMode, selectedPalette, colorCount, adjustments]);

  const handleExport = async (format: 'png' | 'jpg' | 'webp', quality?: number) => {
    if (!processedImageData) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = processedImageData.width;
    canvas.height = processedImageData.height;
    ctx.putImageData(processedImageData, 0, 0);

    // Watermark (free version)
    try {
      const wmImage = await loadWatermarkImage();
      drawWatermarkOnCanvas(ctx, canvas.width, canvas.height, wmImage);
    } catch {
      // Export proceeds without watermark if image fails to load
    }

    const mimeType = format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
    const extension = format;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inknoise-${Date.now()}.${extension}`;
      a.click();
      URL.revokeObjectURL(url);
    }, mimeType, quality);
  };

  return (
    <div className="min-h-screen retro-gradient text-white scanline-bg">
      <header className="border-b border-[#00ff41]/20 bg-black/60 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/capture_d'ecran_2026-02-03_201802.png"
                alt="InkNoise Logo"
                className="w-10 h-10 rounded-lg object-cover border border-[#00ff41]/60"
              />
              <div>
                <h1 className="text-xl font-bold text-[#00ff41] text-glow-green tracking-wider leading-none">InkNoise</h1>
                <p className="text-xs text-[#00ffff]/50 mt-0.5 leading-none">Professional image dithering</p>
              </div>
            </div>
            <button
              onClick={() => setShowProModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[#00ffff]/55 border border-[#00ffff]/15 rounded-lg hover:border-[#00ffff]/40 hover:text-[#00ffff]/85 transition-all text-xs font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Pro
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {!originalImage ? (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] py-8">
            <div className="w-full max-w-lg">
              <ImageUpload onImageLoad={handleImageLoad} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {resizeWarning && (
              <div className="bg-yellow-900/20 border-2 border-yellow-500/50 text-yellow-300 px-4 py-3 rounded-lg flex items-start gap-3 glow-cyan">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{resizeWarning}</p>
              </div>
            )}

            {isProcessing && (
              <div className="bg-[#00ffff]/5 border border-[#00ffff]/30 text-[#00ffff]/80 px-4 py-2.5 rounded-lg flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00ffff] animate-pulse" />
                <p className="text-xs font-medium">Processing...</p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-1 space-y-3">
                <button
                  onClick={() => {
                    setOriginalImage(null);
                    setResizeWarning(null);
                  }}
                  className="w-full px-4 py-2 bg-black/50 text-[#00ff41]/75 border border-[#00ff41]/30 rounded-lg hover:border-[#00ff41]/70 hover:text-[#00ff41] transition-all text-sm font-semibold"
                >
                  Load New Image
                </button>
                <ControlPanel
                  algorithm={algorithm}
                  onAlgorithmChange={setAlgorithm}
                  colorMode={colorMode}
                  onColorModeChange={setColorMode}
                  selectedPalette={selectedPalette}
                  onPaletteChange={setSelectedPalette}
                  colorCount={colorCount}
                  onColorCountChange={setColorCount}
                  adjustments={adjustments}
                  onAdjustmentsChange={setAdjustments}
                  resamplingMethod={resamplingMethod}
                  onResamplingMethodChange={setResamplingMethod}
                />
              </div>

              <div className="lg:col-span-2">
                <ImagePreview
                  originalImage={originalImage}
                  processedImageData={processedImageData}
                  onExport={handleExport}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-[#00ff41]/10 bg-black/40 backdrop-blur-sm mt-12">
        <div className="max-w-7xl mx-auto px-4 py-5 text-center text-xs text-[#00ffff]/40">
          <p className="font-semibold tracking-wider">Made by BEZIER</p>
          <img
            src="https://res.cloudinary.com/djgufyqs5/image/upload/v1775561208/BEZIER200x200_pybhdw.png"
            alt="BEZIER"
            className="w-16 h-16 mx-auto mt-2 opacity-60"
          />
        </div>
      </footer>

      <ProModal isOpen={showProModal} onClose={() => setShowProModal(false)} />
    </div>
  );
}

export default App;
