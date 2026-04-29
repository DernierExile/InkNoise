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
