import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertCircle, Volume2, VolumeX } from 'lucide-react';
import ImageUpload from './components/ImageUpload';
import { BZTile } from './components/brand';
import ControlPanel from './components/ControlPanel';
import ImagePreview from './components/ImagePreview';
import ProModal from './components/ProModal';
import EmailCaptureModal from './components/EmailCaptureModal';
import { DitheringAlgorithm, ColorMode, ImageAdjustments, ResamplingMethod, ColorModeSettings, PaletteModifiers, PostProcessing, ImageAnalysis } from './types';
import { PREDEFINED_PALETTES } from './utils/palettes';
import { getResizeInfo } from './utils/imageResize';
import { loadWatermarkImage, drawWatermarkOnCanvas } from './utils/watermark';
import { analyzeImage } from './utils/imageAnalysis';
import { computeSmartDefaults, getCreativePresets, CreativePresetConfig } from './utils/smartDefaults';
import DitheringWorker from './workers/dithering.worker?worker';

function getRandomPaletteIndex(): number {
  return Math.floor(Math.random() * PREDEFINED_PALETTES.length);
}

const DEFAULT_COLOR_MODE_SETTINGS: ColorModeSettings = {
  duoTone: { shadowColor: '#000000', highlightColor: '#00D5FF' },
  triTone: { shadowColor: '#000000', midtoneColor: '#5361FF', highlightColor: '#F4F4F1' },
  tonalMapping: { shadowColor: '#11151C', midtoneColor: '#5361FF', highlightColor: '#F4F4F1', preserveOriginal: 30 },
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

const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  brightness: 0, contrast: 0, blur: 0, sharpen: 0, sharpenRadius: 10,
  saturation: 100, noise: 0,
  tonalControls: { highlights: 0, midtones: 0, shadows: 0 },
  levels: { inputBlack: 0, inputWhite: 255, outputBlack: 0, outputWhite: 255, gamma: 1 },
};

const EMAIL_MODAL_KEY = 'inknoise_email_modal_dismissed';
const EMAIL_MODAL_DELAY = 2 * 60 * 1000;

function App() {
  const [showProModal, setShowProModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [processedImageData, setProcessedImageData] = useState<ImageData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resizeWarning, setResizeWarning] = useState<string | null>(null);
  const [algorithm, setAlgorithm] = useState<DitheringAlgorithm>('floyd-steinberg');
  const [colorMode, setColorMode] = useState<ColorMode>('rgb');
  const [selectedPalette, setSelectedPalette] = useState(() => getRandomPaletteIndex());
  const [colorCount, setColorCount] = useState(8);
  const [resamplingMethod, setResamplingMethod] = useState<ResamplingMethod>('bilinear');
  const [colorModeSettings, setColorModeSettings] = useState<ColorModeSettings>(DEFAULT_COLOR_MODE_SETTINGS);
  const [paletteModifiers, setPaletteModifiers] = useState<PaletteModifiers>(DEFAULT_PALETTE_MODIFIERS);
  const [postProcessing, setPostProcessing] = useState<PostProcessing>(DEFAULT_POST_PROCESSING);
  const [adjustments, setAdjustments] = useState<ImageAdjustments>(DEFAULT_ADJUSTMENTS);

  const [imageAnalysisData, setImageAnalysisData] = useState<ImageAnalysis | null>(null);
  const [isAutoTuned, setIsAutoTuned] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  const workerRef = useRef<Worker | null>(null);
  const emailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

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

  useEffect(() => {
    const dismissed = localStorage.getItem(EMAIL_MODAL_KEY);
    if (dismissed) return;

    emailTimerRef.current = setTimeout(() => {
      setShowEmailModal(true);
    }, EMAIL_MODAL_DELAY);

    return () => {
      if (emailTimerRef.current) clearTimeout(emailTimerRef.current);
    };
  }, []);

  const handleEmailModalClose = () => {
    setShowEmailModal(false);
    localStorage.setItem(EMAIL_MODAL_KEY, 'true');
  };

  const runSmartAnalysis = useCallback((img: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    try {
      const analysis = analyzeImage(imgData);
      setImageAnalysisData(analysis);
      const smart = computeSmartDefaults(analysis);
      setAdjustments(smart.adjustments);
      setIsAutoTuned(true);
      setActivePreset(null);
    } catch {
      setImageAnalysisData(null);
      setAdjustments(DEFAULT_ADJUSTMENTS);
      setIsAutoTuned(false);
    }
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
      resizedImage.onload = () => {
        setOriginalImage(resizedImage);
        runSmartAnalysis(resizedImage);
      };
      resizedImage.src = canvas.toDataURL();
    } else {
      setResizeWarning(null);
      setOriginalImage(img);
      runSmartAnalysis(img);
    }
  }, [resamplingMethod, runSmartAnalysis]);

  const handleManualAdjustmentChange = useCallback((newAdj: ImageAdjustments) => {
    setAdjustments(newAdj);
    setIsAutoTuned(false);
    setActivePreset(null);
  }, []);

  const handleReAnalyze = useCallback(() => {
    if (originalImage) {
      runSmartAnalysis(originalImage);
    }
  }, [originalImage, runSmartAnalysis]);

  const handlePresetApply = useCallback((preset: CreativePresetConfig) => {
    setAlgorithm(preset.algorithm);
    setColorMode(preset.colorMode);
    setActivePreset(preset.id);
    setIsAutoTuned(false);

    const baseAdj = { ...DEFAULT_ADJUSTMENTS };
    const newAdj: ImageAdjustments = {
      ...baseAdj,
      ...preset.adjustments,
      tonalControls: {
        ...baseAdj.tonalControls,
        ...(preset.adjustments.tonalControls || {}),
      },
      levels: {
        ...baseAdj.levels,
        ...(preset.adjustments.levels || {}),
      },
    };
    setAdjustments(newAdj);

    if (preset.colorModeSettings) {
      setColorModeSettings(prev => {
        const updated = { ...prev };
        if (preset.colorModeSettings!.modulation) {
          updated.modulation = preset.colorModeSettings!.modulation;
        }
        if (preset.colorModeSettings!.duoTone) {
          updated.duoTone = preset.colorModeSettings!.duoTone;
        }
        if (preset.colorModeSettings!.triTone) {
          updated.triTone = preset.colorModeSettings!.triTone;
        }
        if (preset.colorModeSettings!.tonalMapping) {
          updated.tonalMapping = preset.colorModeSettings!.tonalMapping;
        }
        if (preset.colorModeSettings!.rgbSplit) {
          updated.rgbSplit = preset.colorModeSettings!.rgbSplit;
        }
        return updated;
      });
    }

    if (preset.paletteModifiers) {
      setPaletteModifiers(prev => ({ ...prev, ...preset.paletteModifiers }));
    }

    if (preset.postProcessing) {
      setPostProcessing(prev => ({ ...prev, ...preset.postProcessing }));
    } else {
      setPostProcessing(DEFAULT_POST_PROCESSING);
    }
  }, []);

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
    setImageAnalysisData(null);
    setIsAutoTuned(false);
    setActivePreset(null);
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setColorMode('rgb');
    setAlgorithm('floyd-steinberg');
    setColorModeSettings(DEFAULT_COLOR_MODE_SETTINGS);
    setPaletteModifiers(DEFAULT_PALETTE_MODIFIERS);
    setPostProcessing(DEFAULT_POST_PROCESSING);
  };

  const creativePresets = getCreativePresets(imageAnalysisData);

  return (
    <div className="min-h-screen bg-bz-graphite text-bz-paper">
      <header className="border-b border-bz-grid bg-bz-graphite/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 h-12 flex items-center justify-between">
          <button onClick={goHome} className="flex items-center gap-3 group">
            <BZTile schematic size={32} className="text-bz-paper transition-opacity duration-240 group-hover:opacity-80" />
            <div className="flex items-baseline gap-2">
              <span className="text-bz-label font-semibold text-bz-paper tracking-tight">InkNoise</span>
              <span className="text-[10px] font-mono-ui text-bz-system tracking-widest">BY BEZIER</span>
            </div>
          </button>

          <div className="flex items-center gap-3">
            {isProcessing && (
              <div className="flex items-center gap-1.5 px-2 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-bz-cyan animate-signal-pulse" />
                <span className="text-[10px] font-mono-ui text-bz-cyan tracking-widest">RENDERING</span>
              </div>
            )}
            <button
              onClick={() => setShowProModal(true)}
              className="px-3 py-1.5 text-[10px] font-mono-ui text-bz-interface border border-bz-grid hover:border-bz-cyan transition-colors duration-240 tracking-widest"
            >
              GO PRO
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4">
        {!originalImage ? (
          <div className="relative flex flex-col items-center min-h-[calc(100vh-3rem)] pt-16 pb-12 overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              loop
              playsInline
              muted={isMuted}
              className="absolute inset-0 w-full h-full object-cover opacity-[0.10] pointer-events-none"
              src="https://www.playbook.com/b23/dpM8TD4hHV8DRcLk1TbnAnkw?assetToken=U3S87XwfErSc1RpjMpLeXUxb"
              onLoadedMetadata={(e) => { (e.target as HTMLVideoElement).volume = 0.15; }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-bz-graphite/60 via-transparent to-bz-graphite pointer-events-none" />
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="absolute top-4 right-4 z-10 p-2 border border-bz-grid text-bz-system hover:text-bz-paper hover:border-bz-system transition-colors duration-240"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <div className="relative z-10 w-full max-w-2xl">
              <ImageUpload onImageLoad={handleImageLoad} />
            </div>
          </div>
        ) : (
          <div className="py-3">
            {resizeWarning && (
              <div className="mb-3 flex items-center gap-2 px-3 py-2 border border-bz-grid bg-bz-deep">
                <AlertCircle className="w-3 h-3 text-bz-cyan flex-shrink-0" />
                <p className="text-[10px] font-mono-ui text-bz-system tracking-wide">{resizeWarning}</p>
              </div>
            )}
            <div className="flex gap-3">
              <div className="w-[280px] flex-shrink-0 space-y-2">
                <button
                  onClick={goHome}
                  className="w-full px-3 py-2 panel-surface text-[10px] font-mono-ui text-bz-system hover:text-bz-paper tracking-widest transition-colors duration-240"
                >
                  LOAD NEW IMAGE
                </button>
                <ControlPanel
                  algorithm={algorithm}
                  onAlgorithmChange={(a) => { setAlgorithm(a); setActivePreset(null); }}
                  colorMode={colorMode}
                  onColorModeChange={(m) => { setColorMode(m); setActivePreset(null); }}
                  selectedPalette={selectedPalette}
                  onPaletteChange={setSelectedPalette}
                  colorCount={colorCount}
                  onColorCountChange={setColorCount}
                  adjustments={adjustments}
                  onAdjustmentsChange={handleManualAdjustmentChange}
                  resamplingMethod={resamplingMethod}
                  onResamplingMethodChange={setResamplingMethod}
                  colorModeSettings={colorModeSettings}
                  onColorModeSettingsChange={(s) => { setColorModeSettings(s); setActivePreset(null); }}
                  paletteModifiers={paletteModifiers}
                  onPaletteModifiersChange={setPaletteModifiers}
                  postProcessing={postProcessing}
                  onPostProcessingChange={(pp) => { setPostProcessing(pp); setActivePreset(null); }}
                  isAutoTuned={isAutoTuned}
                  onReAnalyze={handleReAnalyze}
                  creativePresets={creativePresets}
                  activePreset={activePreset}
                  onPresetApply={handlePresetApply}
                />
                <div className="flex justify-center py-3">
                  <span className="text-[10px] font-mono-ui text-bz-system tracking-widest opacity-50 hover:opacity-100 transition-opacity duration-240">BEZIER · MMXXVI</span>
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
      <EmailCaptureModal isOpen={showEmailModal} onClose={handleEmailModalClose} />
    </div>
  );
}

export default App;
