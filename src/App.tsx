import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertCircle, LogOut, CheckCircle2 } from 'lucide-react';
import ImageUpload from './components/ImageUpload';
import ControlPanel from './components/ControlPanel';
import ImagePreview from './components/ImagePreview';
import ProModal from './components/ProModal';
import EmailCaptureModal from './components/EmailCaptureModal';
import AuthModal from './components/AuthModal';
import LanguageSwitcher from './components/LanguageSwitcher';
import PresetsManager from './components/PresetsManager';
import BatchProcessor from './components/BatchProcessor';
import ModeSwitch, { type AppMode } from './components/ModeSwitch';
import { Layers } from 'lucide-react';
import { DitherMark, OutlineMark } from './components/brand';
import { useAuth, useIsPro } from './contexts/use-auth';
import { useT } from './i18n/use-i18n';
import { redirectToCustomerPortal } from './lib/stripe';
import type { Preset, PresetConfig } from './lib/presets';
import { DitheringAlgorithm, ColorMode, ImageAdjustments, ResamplingMethod, ColorModeSettings, PaletteModifiers, PostProcessing, ImageAnalysis } from './types';
import { PREDEFINED_PALETTES } from './utils/palettes';
import { getResizeInfo, MAX_DIMENSION_FREE, MAX_DIMENSION_PRO } from './utils/imageResize';
import { loadWatermarkImage, drawWatermarkOnCanvas } from './utils/watermark';
import { analyzeImage } from './utils/imageAnalysis';
import { computeSmartDefaults, getCreativePresets, CreativePresetConfig, LOOK_PRESETS } from './utils/smartDefaults';
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
  const t = useT();
  const { session, plan, signOut, refresh } = useAuth();
  const isPro = useIsPro();
  const maxDimension = isPro ? MAX_DIMENSION_PRO : MAX_DIMENSION_FREE;

  const [showProModal, setShowProModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [checkoutBanner, setCheckoutBanner] = useState<'success' | 'cancelled' | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const handleAccountClick = useCallback(async () => {
    if (portalLoading) return;
    setPortalLoading(true);
    try {
      await redirectToCustomerPortal();
    } catch (err) {
      console.error('Failed to open customer portal', err);
      setPortalLoading(false);
    }
  }, [portalLoading]);

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
  const [activeUserPresetId, setActiveUserPresetId] = useState<string | null>(null);
  const [mode, setMode] = useState<AppMode>('single');

  // Defined AFTER the state declarations above · these useCallbacks reference
  // the state values in their dependency arrays, so the consts must exist
  // first. Defining them before the useState calls triggers a Temporal Dead
  // Zone error ("Cannot access X before initialization").
  const getCurrentConfig = useCallback((): PresetConfig => ({
    algorithm,
    colorMode,
    selectedPalette,
    colorCount,
    resamplingMethod,
    adjustments,
    colorModeSettings,
    paletteModifiers,
    postProcessing,
  }), [algorithm, colorMode, selectedPalette, colorCount, resamplingMethod, adjustments, colorModeSettings, paletteModifiers, postProcessing]);

  const handleUserPresetApply = useCallback((preset: Preset) => {
    const c = preset.config;
    setAlgorithm(c.algorithm);
    setColorMode(c.colorMode);
    setSelectedPalette(c.selectedPalette);
    setColorCount(c.colorCount);
    setResamplingMethod(c.resamplingMethod);
    setAdjustments(c.adjustments);
    setColorModeSettings(c.colorModeSettings);
    setPaletteModifiers(c.paletteModifiers);
    setPostProcessing(c.postProcessing);
    setActivePreset(null);
    setIsAutoTuned(false);
  }, []);

  const handleModeToggle = useCallback((next: AppMode) => {
    if (next === 'batch' && !isPro) {
      setShowProModal(true);
      return;
    }
    setMode(next);
  }, [isPro]);

  const workerRef = useRef<Worker | null>(null);
  const emailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Handle Stripe checkout return (?checkout=success or ?checkout=cancelled)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutParam = params.get('checkout');
    if (checkoutParam === 'success') {
      setCheckoutBanner('success');
      // Refresh the session so the new app_metadata.plan is read in
      refresh();
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      // Auto-dismiss banner after 8s
      setTimeout(() => setCheckoutBanner(null), 8000);
    } else if (checkoutParam === 'cancelled') {
      setCheckoutBanner('cancelled');
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => setCheckoutBanner(null), 5000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const resizeInfo = getResizeInfo(img.width, img.height, maxDimension);
    if (resizeInfo.isResized) {
      setResizeWarning(t('banner.resized', {
        orig: `${img.width}×${img.height}`,
        resized: `${resizeInfo.newWidth}×${resizeInfo.newHeight}`,
      }));
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
  }, [resamplingMethod, runSmartAnalysis, maxDimension, t]);

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

  // Reset every control back to the state a freshly loaded image gets ·
  // app defaults + re-run smart analysis on the current image. No preset.
  const handleResetAll = useCallback(() => {
    setAlgorithm('floyd-steinberg');
    setColorMode('rgb');
    setSelectedPalette(getRandomPaletteIndex());
    setColorCount(8);
    setResamplingMethod('bilinear');
    setColorModeSettings(DEFAULT_COLOR_MODE_SETTINGS);
    setPaletteModifiers(DEFAULT_PALETTE_MODIFIERS);
    setPostProcessing(DEFAULT_POST_PROCESSING);
    setActivePreset(null);
    setActiveUserPresetId(null);
    if (originalImage) {
      runSmartAnalysis(originalImage);
    } else {
      setAdjustments(DEFAULT_ADJUSTMENTS);
      setIsAutoTuned(false);
    }
  }, [originalImage, runSmartAnalysis]);

  const handlePresetApply = useCallback((preset: CreativePresetConfig) => {
    setAlgorithm(preset.algorithm);
    setColorMode(preset.colorMode);
    if (preset.selectedPalette !== undefined) setSelectedPalette(preset.selectedPalette);
    if (preset.colorCount !== undefined) {
      setColorCount(preset.colorCount);
    } else if (preset.colorMode === 'indexed' && preset.selectedPalette !== undefined) {
      // A Look is designed around its full palette. Reset the colour count to the
      // palette length so a previously lowered "Colors" value cannot truncate it.
      setColorCount(PREDEFINED_PALETTES[preset.selectedPalette].colors.length);
    }
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

    // Plan-aware watermark: only applied on free plan
    if (!isPro) {
      try {
        const wmImage = await loadWatermarkImage();
        drawWatermarkOnCanvas(ctx, canvas.width, canvas.height, wmImage);
      } catch { /* noop */ }
    }

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
    <div className="min-h-screen bg-bz-graphite text-bz-interface">
      <header className="border-b border-bz-grid bg-bz-graphite/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Bezier.one · ecosystem parent link */}
            <a
              href="https://bezier.one"
              className="font-semibold text-base text-bz-paper hover:text-bz-cyan transition-colors duration-240 tracking-tight relative pr-6"
              aria-label={t('header.bezierAria')}
            >
              Bezier.one
              <span
                aria-hidden="true"
                className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-4 bg-bz-grid"
              />
            </a>

            {/* Product nav · current product highlighted */}
            <nav className="flex items-center gap-5 font-mono-ui text-[11px] tracking-[0.22em] uppercase font-medium">
              <button
                type="button"
                onClick={goHome}
                className="relative text-bz-paper transition-colors duration-240 py-4 inline-flex items-center gap-2"
                aria-label={t('header.homeAria')}
              >
                <DitherMark size={14} accent />
                InkNoise
                <span aria-hidden="true" className="absolute left-0 right-0 -bottom-px h-0.5 bg-bz-cyan" />
              </button>
              <a
                href="https://outline.bezier.one"
                className="text-bz-system hover:text-bz-paper transition-colors duration-240 py-4 inline-flex items-center gap-2"
              >
                <OutlineMark size={14} accent />
                Outline
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {isProcessing && (
              <div className="flex items-center gap-1.5 px-2 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-bz-cyan animate-signal-pulse" />
                <span className="text-[10px] font-mono-ui text-bz-cyan tracking-widest uppercase">{t('header.rendering')}</span>
              </div>
            )}

            <a
              href="https://discord.gg/eXZngtZhx"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-bz-system hover:text-bz-paper border border-bz-grid hover:border-bz-system transition-colors duration-240"
              title="Discord"
              aria-label="Discord"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="w-3 h-3">
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
              </svg>
            </a>

            <LanguageSwitcher />

            {session ? (
              <>
                {isPro ? (
                  <button
                    onClick={handleAccountClick}
                    disabled={portalLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-bz-cyan bg-bz-cyan/10 text-bz-cyan font-mono-ui text-[10px] tracking-widest hover:bg-bz-cyan/15 transition-colors duration-240 uppercase disabled:opacity-60 disabled:cursor-wait"
                    title={plan === 'founder' ? t('header.founderActive') : t('header.studioActive')}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-bz-cyan" />
                    {portalLoading ? t('common.loading') : t('header.account')}
                  </button>
                ) : (
                  <button
                    onClick={() => setShowProModal(true)}
                    className="px-3 py-1.5 text-[10px] font-mono-ui text-bz-paper border border-bz-grid hover:border-bz-cyan transition-colors duration-240 tracking-widest uppercase"
                  >
                    {t('header.goPro')}
                  </button>
                )}
                <button
                  onClick={() => signOut()}
                  className="p-2 text-bz-system hover:text-bz-paper border border-bz-grid hover:border-bz-system transition-colors duration-240"
                  title={t('header.signOutTooltip', { email: session.user.email ?? '' })}
                  aria-label={t('header.signOut')}
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-3 py-1.5 text-[10px] font-mono-ui text-bz-system hover:text-bz-paper transition-colors duration-240 tracking-widest uppercase"
                >
                  {t('header.signIn')}
                </button>
                <button
                  onClick={() => setShowProModal(true)}
                  className="px-3 py-1.5 text-[10px] font-mono-ui text-bz-paper border border-bz-grid hover:border-bz-cyan transition-colors duration-240 tracking-widest uppercase"
                >
                  {t('header.goPro')}
                </button>
              </>
            )}
          </div>
        </div>

        {checkoutBanner && (
          <div className={`border-b ${checkoutBanner === 'success' ? 'bg-bz-cyan/10 border-bz-cyan' : 'bg-bz-deep border-bz-grid'}`}>
            <div className="max-w-[1400px] mx-auto px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {checkoutBanner === 'success' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-bz-cyan" />
                    <span className="text-[11px] font-mono-ui text-bz-cyan tracking-wide">
                      {t('banner.checkoutSuccess')}
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-bz-system" />
                    <span className="text-[11px] font-mono-ui text-bz-system tracking-wide">
                      {t('banner.checkoutCancelled')}
                    </span>
                  </>
                )}
              </div>
              <button
                onClick={() => setCheckoutBanner(null)}
                className="text-[10px] font-mono-ui text-bz-system hover:text-bz-paper tracking-widest uppercase"
              >
                {t('banner.dismiss')}
              </button>
            </div>
          </div>
        )}
      </header>

      <main>
        {!originalImage || mode === 'batch' ? (
          mode === 'single' ? (
            <ImageUpload
              onImageLoad={handleImageLoad}
              onSignInNeeded={() => setShowAuthModal(true)}
              toolbar={
                <ModeSwitch
                  mode={mode}
                  isPro={isPro}
                  onChange={handleModeToggle}
                />
              }
            />
          ) : (
            <div className="max-w-[1400px] mx-auto px-4">
              <BatchProcessor
                config={getCurrentConfig()}
                isPro={isPro}
                mode={mode}
                onModeChange={handleModeToggle}
              />
            </div>
          )
        ) : (
          <div className="max-w-[1400px] mx-auto px-4 py-3">
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
                  className="w-full px-3 py-2 panel-surface text-[10px] font-mono-ui text-bz-system hover:text-bz-interface tracking-widest uppercase transition-colors duration-240"
                >
                  {t('banner.loadNewImage')}
                </button>
                <button
                  onClick={() => {
                    if (!isPro) {
                      setShowProModal(true);
                      return;
                    }
                    setMode('batch');
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 panel-surface text-[10px] font-mono-ui text-bz-system hover:text-bz-interface tracking-widest uppercase transition-colors duration-240"
                  title={t('batch.switchTooltip')}
                >
                  <Layers className="w-3 h-3" />
                  {t('batch.switchToBatch')}
                  {!isPro && <span className="text-bz-cyan">PRO</span>}
                </button>
                <PresetsManager
                  isPro={isPro}
                  isAuthed={!!session}
                  currentConfig={getCurrentConfig()}
                  activePresetId={activeUserPresetId}
                  onApply={handleUserPresetApply}
                  onActivePresetIdChange={setActiveUserPresetId}
                  onUpgradeClick={() => setShowProModal(true)}
                  onSignInClick={() => setShowAuthModal(true)}
                />
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
                  lookPresets={LOOK_PRESETS}
                  activePreset={activePreset}
                  onPresetApply={handlePresetApply}
                  onResetAll={handleResetAll}
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
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="login"
      />
      <EmailCaptureModal isOpen={showEmailModal} onClose={handleEmailModalClose} />

    </div>
  );
}

export default App;
