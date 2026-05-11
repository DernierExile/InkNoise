// =============================================================================
// Type declarations for the dither-preview vanilla JS engine.
// The actual implementation lives in src/lib/dither-preview.js (ported from
// the Claude Design redesign handoff). It's an IIFE that attaches
// window.InkNoiseDither at load time.
//
// Import the JS file once for the side effect:
//   import '../lib/dither-preview.js';
// Then use window.InkNoiseDither typed via this declaration.
// =============================================================================

export interface DitherAlgo {
  id: string;
  name: string;
  family: 'error-diffusion' | 'ordered' | 'halftone' | 'stochastic' | 'threshold';
  cell?: number;
  angle?: number;
  threshold?: number;
  seed?: number;
}

export interface DitherOptions {
  fg?: [number, number, number];
  bg?: [number, number, number];
  cell?: number;
  angle?: number;
  threshold?: number;
  seed?: number;
}

export interface InkNoiseDitherAPI {
  /** Generate a procedural source image canvas. */
  renderSource: (w: number, h: number, seed?: number) => HTMLCanvasElement;
  /** Render a dithered output canvas from a source canvas/image. */
  render: (
    source: HTMLCanvasElement | HTMLImageElement,
    algoId: string,
    opts?: DitherOptions,
  ) => HTMLCanvasElement;
  /** The full algorithm catalog (25 algorithms across 5 families). */
  CATALOG: DitherAlgo[];
}

declare global {
  interface Window {
    InkNoiseDither?: InkNoiseDitherAPI;
  }
}

export {};
