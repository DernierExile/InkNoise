import { ImageAnalysis, ImageAdjustments, ColorMode, ColorModeSettings, PostProcessing, DitheringAlgorithm, PaletteModifiers } from '../types';

export interface SmartDefaults {
  adjustments: ImageAdjustments;
  colorModeSettings?: Partial<ColorModeSettings>;
  postProcessing?: Partial<PostProcessing>;
}

export function computeSmartDefaults(analysis: ImageAnalysis): SmartDefaults {
  let brightness = 0;
  if (analysis.meanBrightness < 80) brightness = 20;
  else if (analysis.meanBrightness < 100) brightness = 10;
  else if (analysis.meanBrightness > 200) brightness = -10;
  else if (analysis.meanBrightness > 180) brightness = -5;

  let contrast = 0;
  if (analysis.contrastStdDev > 70) contrast = -25;
  else if (analysis.contrastStdDev > 55) contrast = -15;
  else if (analysis.contrastStdDev > 40) contrast = -8;

  let blur = 0;
  if (analysis.highFreqEnergy > 0.6) blur = 5;
  else if (analysis.highFreqEnergy > 0.4) blur = 3;
  else if (analysis.highFreqEnergy > 0.25) blur = 1;

  if (analysis.edgeDensity > 0.5) {
    blur = Math.max(blur, 2);
    contrast = Math.min(contrast, -10);
  }

  const inputBlack = Math.max(0, analysis.tonalRangeMin - 5);
  const inputWhite = Math.min(255, analysis.tonalRangeMax + 5);

  let gamma = 1.0;
  if (analysis.meanBrightness < 90) gamma = 1.15;
  else if (analysis.meanBrightness > 180) gamma = 0.9;

  if (analysis.shadowClipPercent > 15) {
    gamma = Math.max(gamma, 1.1);
  }

  return {
    adjustments: {
      brightness,
      contrast,
      blur,
      sharpen: 0,
      sharpenRadius: 10,
      saturation: 100,
      noise: 0,
      tonalControls: { highlights: 0, midtones: 0, shadows: 0 },
      levels: {
        inputBlack,
        inputWhite,
        outputBlack: 0,
        outputWhite: 255,
        gamma,
      },
    },
  };
}

export interface CreativePresetConfig {
  id: string;
  label: string;
  algorithm: DitheringAlgorithm;
  colorMode: ColorMode;
  selectedPalette?: number;
  colorCount?: number;
  adjustments: Partial<ImageAdjustments>;
  colorModeSettings?: Partial<ColorModeSettings>;
  paletteModifiers?: Partial<PaletteModifiers>;
  postProcessing?: Partial<PostProcessing>;
}

export function getCreativePresets(analysis: ImageAnalysis | null): CreativePresetConfig[] {
  const baseContrast = analysis && analysis.contrastStdDev > 55 ? -20 : -10;
  const baseBlur = analysis && analysis.highFreqEnergy > 0.3 ? 3 : 1;

  return [
    {
      id: 'smooth',
      label: 'SMOOTH',
      algorithm: 'floyd-steinberg',
      colorMode: 'modulation',
      adjustments: {
        brightness: 5,
        contrast: baseContrast,
        blur: Math.max(baseBlur, 3),
        sharpen: 0,
        noise: 0,
      },
      colorModeSettings: {
        modulation: {
          preset: 'crt',
          scanlineIntensity: 45,
          scanlineGap: 3,
          chromaticOffset: 1,
          rgbShift: 0,
          noiseAmount: 3,
          pixelation: 1,
          interference: 0,
        },
      },
      postProcessing: {
        bloom: 15,
        vignette: 10,
        scanlines: 0,
        chromaticAberration: 0,
        crtCurve: 0,
      },
    },
    {
      id: 'dense',
      label: 'DENSE',
      algorithm: 'ordered-8x8',
      colorMode: 'modulation',
      adjustments: {
        brightness: 0,
        contrast: baseContrast + 5,
        blur: baseBlur,
        sharpen: 0,
        noise: 0,
      },
      colorModeSettings: {
        modulation: {
          preset: 'crt',
          scanlineIntensity: 60,
          scanlineGap: 2,
          chromaticOffset: 2,
          rgbShift: 0,
          noiseAmount: 5,
          pixelation: 1,
          interference: 0,
        },
      },
      postProcessing: {
        bloom: 20,
        scanlines: 30,
        chromaticAberration: 0,
        vignette: 0,
        crtCurve: 0,
      },
    },
    {
      id: 'signal',
      label: 'SIGNAL',
      algorithm: 'atkinson',
      colorMode: 'modulation',
      adjustments: {
        brightness: -5,
        contrast: -15,
        blur: 2,
        sharpen: 0,
        noise: 0,
      },
      colorModeSettings: {
        modulation: {
          preset: 'vhs',
          scanlineIntensity: 35,
          scanlineGap: 4,
          chromaticOffset: 3,
          rgbShift: 2,
          noiseAmount: 18,
          pixelation: 1,
          interference: 30,
        },
      },
      postProcessing: {
        chromaticAberration: 20,
        scanlines: 15,
        bloom: 0,
        vignette: 15,
        crtCurve: 0,
      },
    },
    {
      id: 'mesh',
      label: 'MESH',
      algorithm: 'halftone',
      colorMode: 'rgb',
      adjustments: {
        brightness: 0,
        contrast: -5,
        blur: baseBlur,
        sharpen: 0,
        noise: 0,
      },
      postProcessing: {
        scanlines: 20,
        bloom: 0,
        chromaticAberration: 0,
        vignette: 0,
        crtCurve: 0,
      },
    },
    {
      id: 'glow',
      label: 'GLOW',
      algorithm: 'floyd-steinberg',
      colorMode: 'tonal',
      adjustments: {
        brightness: 5,
        contrast: -10,
        blur: 2,
        sharpen: 0,
        noise: 0,
      },
      postProcessing: {
        bloom: 45,
        vignette: 25,
        chromaticAberration: 15,
        scanlines: 0,
        crtCurve: 0,
      },
    },
    {
      id: 'raw',
      label: 'RAW',
      algorithm: 'floyd-steinberg',
      colorMode: 'rgb',
      adjustments: {
        brightness: 0,
        contrast: 0,
        blur: 0,
        sharpen: 0,
        sharpenRadius: 10,
        saturation: 100,
        noise: 0,
      },
      postProcessing: {
        crtCurve: 0,
        scanlines: 0,
        chromaticAberration: 0,
        vignette: 0,
        bloom: 0,
      },
    },
  ];
}

export const LOOK_PRESETS: CreativePresetConfig[] = [
  { id: 'screentone', label: 'Screentone', algorithm: 'halftone', colorMode: 'mono', selectedPalette: 0,
    adjustments: { contrast: 8, brightness: 0, blur: 0, noise: 0 },
    postProcessing: { crtCurve: 0, scanlines: 0, chromaticAberration: 0, vignette: 0, bloom: 0 } },

  { id: 'neo-tokyo', label: 'Neo-Tokyo', algorithm: 'atkinson', colorMode: 'indexed', selectedPalette: 39,
    adjustments: { contrast: 6, blur: 0, noise: 0 },
    postProcessing: { crtCurve: 0, scanlines: 0, chromaticAberration: 0, vignette: 0, bloom: 0 } },

  { id: 'neon-noir', label: 'Neon Noir', algorithm: 'blue-noise', colorMode: 'indexed', selectedPalette: 9,
    adjustments: { contrast: -5, blur: 1, noise: 0 },
    postProcessing: { crtCurve: 0, scanlines: 0, chromaticAberration: 12, vignette: 10, bloom: 15 } },

  { id: 'replicant', label: 'Replicant', algorithm: 'ordered-8x8', colorMode: 'indexed', selectedPalette: 40,
    adjustments: { contrast: 0, blur: 1, noise: 0 },
    postProcessing: { crtCurve: 0, scanlines: 0, chromaticAberration: 0, vignette: 10, bloom: 15 } },

  { id: 'retro-console', label: 'Retro Console', algorithm: 'bayer-3x3', colorMode: 'indexed', selectedPalette: 3,
    adjustments: { contrast: 0, blur: 0, noise: 0 },
    postProcessing: { crtCurve: 0, scanlines: 0, chromaticAberration: 0, vignette: 0, bloom: 0 } },

  { id: 'vapor', label: 'Vapor', algorithm: 'ordered-4x4', colorMode: 'indexed', selectedPalette: 19,
    adjustments: { brightness: 3, contrast: -5, blur: 1, noise: 0 },
    postProcessing: { crtCurve: 0, scanlines: 0, chromaticAberration: 8, vignette: 0, bloom: 8 } },

  { id: 'outrun', label: 'Outrun', algorithm: 'ordered-8x8', colorMode: 'indexed', selectedPalette: 26,
    adjustments: { contrast: -5, blur: 1, noise: 0 },
    postProcessing: { crtCurve: 0, scanlines: 0, chromaticAberration: 0, vignette: 8, bloom: 22 } },

  { id: 'riso-zine', label: 'Riso Zine', algorithm: 'halftone', colorMode: 'indexed', selectedPalette: 41,
    adjustments: { contrast: 5, blur: 0, noise: 0 },
    postProcessing: { crtCurve: 0, scanlines: 0, chromaticAberration: 0, vignette: 0, bloom: 0 } },

  { id: 'xerox', label: 'Xerox', algorithm: 'floyd-steinberg', colorMode: 'mono', selectedPalette: 0,
    adjustments: { brightness: -3, contrast: 22, blur: 0, noise: 12 },
    postProcessing: { crtCurve: 0, scanlines: 0, chromaticAberration: 0, vignette: 0, bloom: 0 } },

  { id: 'newsprint', label: 'Newsprint', algorithm: 'dot-pattern', colorMode: 'indexed', selectedPalette: 42,
    adjustments: { contrast: 6, blur: 0, noise: 4 },
    postProcessing: { crtCurve: 0, scanlines: 0, chromaticAberration: 0, vignette: 0, bloom: 0 } },

  { id: 'vhs', label: 'VHS', algorithm: 'ordered-4x4', colorMode: 'modulation', selectedPalette: 0,
    adjustments: { contrast: -10, blur: 2, noise: 0 },
    colorModeSettings: { modulation: { preset: 'vhs', scanlineIntensity: 35, scanlineGap: 4, chromaticOffset: 3, rgbShift: 2, noiseAmount: 18, pixelation: 1, interference: 30 } },
    postProcessing: { crtCurve: 0, scanlines: 15, chromaticAberration: 20, vignette: 15, bloom: 0 } },

  { id: 'ink-press', label: 'Ink Press', algorithm: 'blue-noise', colorMode: 'indexed', selectedPalette: 28,
    adjustments: { contrast: 4, blur: 0, noise: 0 },
    postProcessing: { crtCurve: 0, scanlines: 0, chromaticAberration: 0, vignette: 0, bloom: 0 } },

  { id: 'comic', label: 'Comic', algorithm: 'halftone', colorMode: 'indexed', selectedPalette: 43,
    adjustments: { contrast: 8, blur: 0, noise: 0 },
    postProcessing: { crtCurve: 0, scanlines: 0, chromaticAberration: 0, vignette: 0, bloom: 0 } },

  { id: 'daguerreotype', label: 'Daguerreotype', algorithm: 'atkinson', colorMode: 'indexed', selectedPalette: 12,
    adjustments: { brightness: -2, contrast: 5, blur: 0, noise: 0 },
    postProcessing: { crtCurve: 0, scanlines: 0, chromaticAberration: 0, vignette: 20, bloom: 5 } },

  { id: 'phosphor', label: 'Phosphor', algorithm: 'ordered-4x4', colorMode: 'indexed', selectedPalette: 44,
    adjustments: { contrast: 5, blur: 0, noise: 0 },
    postProcessing: { crtCurve: 20, scanlines: 30, chromaticAberration: 0, vignette: 0, bloom: 10 } },

  { id: 'blueprint', label: 'Blueprint', algorithm: 'ordered-8x8', colorMode: 'duo-tone', selectedPalette: 0,
    adjustments: { contrast: 0, blur: 0, noise: 0 },
    colorModeSettings: { duoTone: { shadowColor: '#0A2A5E', highlightColor: '#CFE8FF' } },
    postProcessing: { crtCurve: 0, scanlines: 0, chromaticAberration: 0, vignette: 0, bloom: 0 } },

  { id: 'thermal', label: 'Thermal', algorithm: 'blue-noise', colorMode: 'indexed', selectedPalette: 45,
    adjustments: { saturation: 120, contrast: 0, blur: 0, noise: 0 },
    postProcessing: { crtCurve: 0, scanlines: 0, chromaticAberration: 0, vignette: 0, bloom: 10 } },

  { id: 'gold-leaf', label: 'Gold Leaf', algorithm: 'halftone', colorMode: 'duo-tone', selectedPalette: 0,
    adjustments: { contrast: 6, blur: 0, noise: 0 },
    colorModeSettings: { duoTone: { shadowColor: '#111111', highlightColor: '#C9A24B' } },
    postProcessing: { crtCurve: 0, scanlines: 0, chromaticAberration: 0, vignette: 0, bloom: 0 } },
];
