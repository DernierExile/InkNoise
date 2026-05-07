export type DitheringAlgorithm =
  | 'floyd-steinberg'
  | 'atkinson'
  | 'jarvis-judice-ninke'
  | 'stucki'
  | 'burkes'
  | 'sierra'
  | 'sierra-lite'
  | 'stevenson-arce'
  | 'ordered-2x2'
  | 'ordered-4x4'
  | 'ordered-8x8'
  | 'bayer-3x3'
  | 'bayer-16x16'
  | 'halftone'
  | 'blue-noise'
  | 'riemersma'
  | 'dot-pattern'
  | 'cross-pattern'
  | 'diagonal-pattern'
  | 'cluster-dot'
  | 'vertical-stripes'
  | 'horizontal-stripes'
  | 'checkerboard'
  | 'random'
  | 'none';

export type ColorMode =
  | 'mono'
  | 'duo-tone'
  | 'tri-tone'
  | 'tonal'
  | 'indexed'
  | 'rgb'
  | 'rgb-split'
  | 'modulation';

export type ResamplingMethod = 'nearest-neighbor' | 'bilinear' | 'bicubic';

export interface ColorPalette {
  name: string;
  colors: string[];
}

export interface TonalControls {
  highlights: number;
  midtones: number;
  shadows: number;
}

export interface LevelsControl {
  inputBlack: number;
  inputWhite: number;
  outputBlack: number;
  outputWhite: number;
  gamma: number;
}

export interface ImageAdjustments {
  brightness: number;
  contrast: number;
  blur: number;
  sharpen: number;
  sharpenRadius: number;
  saturation: number;
  noise: number;
  tonalControls: TonalControls;
  levels: LevelsControl;
}

export interface DuoToneSettings {
  shadowColor: string;
  highlightColor: string;
}

export interface TriToneSettings {
  shadowColor: string;
  midtoneColor: string;
  highlightColor: string;
}

export interface TonalMappingSettings {
  shadowColor: string;
  midtoneColor: string;
  highlightColor: string;
  preserveOriginal: number;
}

export interface RgbSplitSettings {
  redOffsetX: number;
  redOffsetY: number;
  blueOffsetX: number;
  blueOffsetY: number;
  intensity: number;
}

export type ModulationPreset = 'none' | 'crt' | 'glitch' | 'chromatic' | 'vhs' | 'digital';

export interface ModulationSettings {
  preset: ModulationPreset;
  scanlineIntensity: number;
  scanlineGap: number;
  chromaticOffset: number;
  rgbShift: number;
  noiseAmount: number;
  pixelation: number;
  interference: number;
}

export interface PaletteModifiers {
  hueShift: number;
  saturationBoost: number;
  brightnessShift: number;
  intensity: number;
}

export interface PostProcessing {
  crtCurve: number;
  scanlines: number;
  chromaticAberration: number;
  vignette: number;
  bloom: number;
}

export interface ColorModeSettings {
  duoTone: DuoToneSettings;
  triTone: TriToneSettings;
  tonalMapping: TonalMappingSettings;
  rgbSplit: RgbSplitSettings;
  modulation: ModulationSettings;
}

export interface DitheringSettings {
  algorithm: DitheringAlgorithm;
  colorMode: ColorMode;
  palette: ColorPalette;
  colorCount: number;
  adjustments: ImageAdjustments;
  resamplingMethod: ResamplingMethod;
}

export interface ImageAnalysis {
  meanBrightness: number;
  contrastStdDev: number;
  highFreqEnergy: number;
  edgeDensity: number;
  shadowClipPercent: number;
  highlightClipPercent: number;
  tonalRangeMin: number;
  tonalRangeMax: number;
  imageHeight: number;
}
