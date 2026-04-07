import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import ImageUpload from './components/ImageUpload';
import ControlPanel from './components/ControlPanel';
import ImagePreview from './components/ImagePreview';
import { DitheringAlgorithm, ColorMode, ImageAdjustments, ResamplingMethod } from './types';
import { PREDEFINED_PALETTES } from './utils/palettes';
import { getResizeInfo } from './utils/imageResize';
import { loadWatermarkImage, drawWatermarkOnCanvas } from './utils/watermark';
import DitheringWorker from './workers/dithering.worker?worker';

function App() {
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
      <header className="border-b border-glow-green bg-black/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <img
              src="/capture_d'ecran_2026-02-03_201802.png"
              alt="InkNoise Logo"
              className="w-14 h-14 rounded-lg object-cover glow-green border-2 border-[#00ff41]"
            />
            <div>
              <h1 className="text-3xl font-bold text-[#00ff41] text-glow-green tracking-wider">InkNoise</h1>
              <p className="text-sm text-[#00ffff]/80">Professional image dithering tool</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {!originalImage ? (
          <div className="max-w-2xl mx-auto">
            <ImageUpload onImageLoad={handleImageLoad} />
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
              <div className="bg-cyan-900/20 border-2 border-[#00ffff]/50 text-[#00ffff] px-4 py-3 rounded-lg glow-cyan">
                <p className="text-sm">Processing image...</p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-4">
                <button
                  onClick={() => {
                    setOriginalImage(null);
                    setResizeWarning(null);
                  }}
                  className="w-full px-4 py-2 bg-[#0f1f18] text-[#00ff41] border-2 border-[#00ff41]/50 rounded-lg hover:border-[#00ff41] hover:glow-green transition-all sticky top-4 z-10 font-semibold"
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

      <footer className="border-t border-glow-cyan bg-black/50 backdrop-blur-sm mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-[#00ffff]/70">
          <p className="font-semibold tracking-wider">Made by BEZIER</p>
          <img
            src="https://res.cloudinary.com/djgufyqs5/image/upload/v1775561208/BEZIER200x200_pybhdw.png"
            alt="BEZIER"
            className="w-28 h-28 mx-auto mt-3"
          />
        </div>
      </footer>
    </div>
  );
}

export default App;
