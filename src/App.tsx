import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertCircle, Sparkles, Hexagon } from 'lucide-react';
import ImageUpload from './components/ImageUpload';
import ControlPanel from './components/ControlPanel';
import ImagePreview from './components/ImagePreview';
import ProModal from './components/ProModal';
import { DitheringAlgorithm, ColorMode, ImageAdjustments, ResamplingMethod, ColorModeSettings, PaletteModifiers, PostProcessing } from './types';
import { PREDEFINED_PALETTES } from './utils/palettes';
import { getResizeInfo } from './utils/imageResize';
import { loadWatermarkImage, drawWatermarkOnCanvas } from './utils/watermark';
import DitheringWorker from './workers/dithering.worker?worker';

const DEFAULT_COLOR_MODE_SETTINGS: ColorModeSettings = {
  duoTone: { shadowColor: '#000000', highlightColor: '#00ff41' },
  triTone: { shadowColor: '#000000', midtoneColor: '#00ffff', highlightColor: '#ffffff' },
  tonalMapping: { shadowColor: '#1a0533', midtoneColor: '#ff006e', highlightColor: '#fffbe6', preserveOriginal: 30 },
  rgbSplit: { redOffsetX: 3, redOffsetY: 0, blueOffsetX: -3, blueOffsetY: 0, intensity: 80 },
  modulation: { preset: 'none', scanlineIntensity: 40, scanlineGap: 3, chromaticOffset: 2, rgbShift: 1, noiseAmount: 10, pixelation: 1, interference: 0 },
};

const DEFAULT_PALETTE_MODIFIERS: PaletteModifiers = {
  hueShift: 0,
  saturationBoost: 0,
  brightnessShift: 0,
  intensity: 100,
};

const DEFAULT_POST_PROCESSING: PostProcessing = {
  crtCurve: 0,
  scanlines: 0,
  chromaticAberration: 0,
  vignette: 0,
  bloom: 0,
};

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
  const [colorModeSettings, setColorModeSettings] = useState<ColorModeSettings>(DEFAULT_COLOR_MODE_SETTINGS);
  const [paletteModifiers, setPaletteModifiers] = useState<PaletteModifiers>(DEFAULT_PALETTE_MODIFIERS);
  const [postProcessing, setPostProcessing] = useState<PostProcessing>(DEFAULT_POST_PROCESSING);
  const [adjustments, setAdjustments] = useState<ImageAdjustments>({
    brightness: 0, contrast: 0, blur: 0, sharpen: 0, sharpenRadius: 10,
    saturation: 100, noise: 0,
    tonalControls: { highlights: 0, midtones: 0, shadows: 0 },
    levels: { inputBlack: 0, inputWhite: 255, outputBlack: 0, outputWhite: 255, gamma: 1 },
  });

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new DitheringWorker();
    workerRef.current.onmessage = (e) => {
      const { success, imageData, error } = e.data;
      if (success) setProcessedImageData(imageData);
      else console.error('Worker error:', error);
      setIsProcessing(false);
    };
    return () => { workerRef.current?.terminate(); };
  }, []);

  const handleImageLoad = useCallback((img: HTMLImageElement) => {
    const resizeInfo = getResizeInfo(img.width, img.height);
    if (resizeInfo.isResized) {
      setResizeWarning(`Resized from ${img.width}x${img.height} to ${resizeInfo.newWidth}x${resizeInfo.newHeight}`);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = resizeInfo.newWidth;
      canvas.height = resizeInfo.newHeight;
      switch (resamplingMethod) {
        case 'nearest-neighbor': ctx.imageSmoothingEnabled = false; break;
        case 'bilinear': ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low'; break;
        case 'bicubic': ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; break;
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
        adjustments,
        colorMode,
        colorModeSettings,
        paletteModifiers,
        postProcessing,
      });
    };
    const timeoutId = setTimeout(processImage, 150);
    return () => clearTimeout(timeoutId);
  }, [originalImage, algorithm, colorMode, selectedPalette, colorCount, adjustments, colorModeSettings, paletteModifiers, postProcessing]);

  const handleExport = async (format: 'png' | 'jpg' | 'webp', quality?: number) => {
    if (!processedImageData) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = processedImageData.width;
    canvas.height = processedImageData.height;
    ctx.putImageData(processedImageData, 0, 0);
    try {
      const wmImage = await loadWatermarkImage();
      drawWatermarkOnCanvas(ctx, canvas.width, canvas.height, wmImage);
    } catch { /* noop */ }
    const mimeType = format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inknoise-${Date.now()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    }, mimeType, quality);
  };

  const goHome = () => {
    setOriginalImage(null);
    setResizeWarning(null);
  };

  return (
    <div className="min-h-screen bg-[#080a0c] text-white">
      <header className="border-b border-white/[0.04] bg-[#0a0c0e]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 h-12 flex items-center justify-between">
          <button onClick={goHome} className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-md bg-[#00ff41]/10 border border-[#00ff41]/25 flex items-center justify-center group-hover:bg-[#00ff41]/15 group-hover:border-[#00ff41]/40 transition-all">
              <Hexagon className="w-3.5 h-3.5 text-[#00ff41]" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold text-white/90 tracking-wide">InkNoise</span>
              <span className="text-[10px] font-mono-ui text-white/25 hidden sm:inline">v2.0</span>
            </div>
          </button>

          <div className="flex items-center gap-2">
            {isProcessing && (
              <div className="flex items-center gap-1.5 px-2 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse" />
                <span className="text-[10px] font-mono-ui text-[#00ff41]/70">PROCESSING</span>
              </div>
            )}
            <button
              onClick={() => setShowProModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff006e]/10 text-[#ff006e] border border-[#ff006e]/25 rounded-md hover:bg-[#ff006e]/15 hover:border-[#ff006e]/40 transition-all text-[10px] font-mono-ui tracking-wider glow-pink"
            >
              <Sparkles className="w-3 h-3" />
              PRO
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4">
        {!originalImage ? (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3rem)] py-12">
            <div className="w-full max-w-md">
              <ImageUpload onImageLoad={handleImageLoad} />
            </div>
          </div>
        ) : (
          <div className="py-3">
            {resizeWarning && (
              <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-md bg-amber-500/[0.06] border border-amber-500/10">
                <AlertCircle className="w-3 h-3 text-amber-400/60 flex-shrink-0" />
                <p className="text-[10px] font-mono-ui text-amber-300/60">{resizeWarning}</p>
              </div>
            )}
            <div className="flex gap-3">
              <div className="w-[280px] flex-shrink-0 space-y-2">
                <button
                  onClick={goHome}
                  className="w-full px-3 py-2 panel-surface rounded-md text-[10px] font-mono-ui text-white/40 hover:text-white/60 tracking-wider transition-all"
                >
                  LOAD NEW IMAGE
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
                  colorModeSettings={colorModeSettings}
                  onColorModeSettingsChange={setColorModeSettings}
                  paletteModifiers={paletteModifiers}
                  onPaletteModifiersChange={setPaletteModifiers}
                  postProcessing={postProcessing}
                  onPostProcessingChange={setPostProcessing}
                />
                <div className="flex justify-center py-3">
                  <img src="/BEZIER200x200.png" alt="Bezier" className="h-7 opacity-15 hover:opacity-30 transition-opacity" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <ImagePreview originalImage={originalImage} processedImageData={processedImageData} onExport={handleExport} />
              </div>
            </div>
          </div>
        )}
      </main>

      <ProModal isOpen={showProModal} onClose={() => setShowProModal(false)} />
    </div>
  );
}

export default App;
