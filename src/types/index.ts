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

export type ColorMode = 'mono' | 'indexed' | 'rgb';

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

export interface DitheringSettings {
  algorithm: DitheringAlgorithm;
  colorMode: ColorMode;
  palette: ColorPalette;
  colorCount: number;
  adjustments: ImageAdjustments;
  resamplingMethod: ResamplingMethod;
}
