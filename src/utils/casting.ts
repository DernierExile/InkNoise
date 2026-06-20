import {
  DitheringAlgorithm, ColorMode, ResamplingMethod, ImageAdjustments,
  ColorModeSettings, PaletteModifiers, PostProcessing, ImageAnalysis,
} from '../types';
import { PREDEFINED_PALETTES, extractPaletteFromImage } from './palettes';
import { CreativePresetConfig, LOOK_PRESETS } from './smartDefaults';

/* Defauts repris a l'identique de App.tsx · une variante doit etre une config
   complete, exactement comme ce que produit handlePresetApply + processImage. */
export const DEFAULT_COLOR_MODE_SETTINGS: ColorModeSettings = {
  duoTone: { shadowColor: '#000000', highlightColor: '#00D5FF' },
  triTone: { shadowColor: '#000000', midtoneColor: '#5361FF', highlightColor: '#F4F4F1' },
  tonalMapping: { shadowColor: '#11151C', midtoneColor: '#5361FF', highlightColor: '#F4F4F1', preserveOriginal: 30 },
  rgbSplit: { redOffsetX: 3, redOffsetY: 0, blueOffsetX: -3, blueOffsetY: 0, intensity: 80 },
  modulation: { preset: 'none', scanlineIntensity: 40, scanlineGap: 3, chromaticOffset: 2, rgbShift: 1, noiseAmount: 10, pixelation: 1, interference: 0 },
};
export const DEFAULT_PALETTE_MODIFIERS: PaletteModifiers = { hueShift: 0, saturationBoost: 0, brightnessShift: 0, intensity: 100 };
export const DEFAULT_POST_PROCESSING: PostProcessing = { crtCurve: 0, scanlines: 0, chromaticAberration: 0, vignette: 0, bloom: 0 };
export const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  brightness: 0, contrast: 0, blur: 0, sharpen: 0, sharpenRadius: 10,
  saturation: 100, noise: 0,
  tonalControls: { highlights: 0, midtones: 0, shadows: 0 },
  levels: { inputBlack: 0, inputWhite: 255, outputBlack: 0, outputWhite: 255, gamma: 1 },
};

export interface VariantConfig {
  algorithm: DitheringAlgorithm;
  colorMode: ColorMode;
  selectedPalette: number;
  colorCount: number;
  resamplingMethod: ResamplingMethod;
  adjustments: ImageAdjustments;
  colorModeSettings: ColorModeSettings;
  paletteModifiers: PaletteModifiers;
  postProcessing: PostProcessing;
  paletteOverride?: string[];
  meta: { id: string; label: string; family: string; algoLabel: string };
}

const ALGO_LABEL: Record<string, string> = {
  'floyd-steinberg': 'Floyd-Steinberg', 'atkinson': 'Atkinson', 'jarvis-judice-ninke': 'Jarvis-Judice-Ninke',
  'stucki': 'Stucki', 'burkes': 'Burkes', 'sierra': 'Sierra', 'sierra-lite': 'Sierra Lite', 'stevenson-arce': 'Stevenson-Arce',
  'ordered-2x2': 'Ordered 2×2', 'ordered-4x4': 'Ordered 4×4', 'ordered-8x8': 'Ordered 8×8', 'bayer-3x3': 'Bayer 3×3', 'bayer-16x16': 'Bayer 16×16',
  'halftone': 'Halftone', 'blue-noise': 'Blue Noise', 'riemersma': 'Riemersma', 'dot-pattern': 'Dot Pattern',
  'cross-pattern': 'Cross Pattern', 'diagonal-pattern': 'Diagonal', 'cluster-dot': 'Cluster Dot',
  'vertical-stripes': 'Vertical Stripes', 'horizontal-stripes': 'Horizontal Stripes', 'checkerboard': 'Checkerboard',
  'random': 'Random', 'none': 'None',
};
export const algoLabel = (a: string) => ALGO_LABEL[a] || a;

/* Familles visuelles pour garantir la diversite du casting (pas 5 cousines). */
const LOOK_FAMILY: Record<string, string> = {
  screentone: 'ink', xerox: 'ink',
  'riso-zine': 'print', newsprint: 'print', 'ink-press': 'print', comic: 'print',
  'neo-tokyo': 'retro', 'neon-noir': 'retro', replicant: 'retro', 'retro-console': 'retro', vapor: 'retro', outrun: 'retro',
  vhs: 'glow', daguerreotype: 'glow', phosphor: 'glow', thermal: 'glow',
  blueprint: 'duo', 'gold-leaf': 'duo',
  // pop-culture / cinéma
  nosferatu: 'ink', 'sin-city': 'ink', 'film-noir': 'ink',
  giallo: 'print', western: 'print', pulp: 'print', 'kill-bill': 'print',
  suspiria: 'retro', akira: 'retro', dune: 'retro', maverick: 'retro', 'wes-anderson': 'retro', technicolor: 'retro', polaroid: 'retro',
  carpenter: 'glow', miami: 'glow', tron: 'glow', matrix: 'glow', grindhouse: 'glow',
  slasher: 'duo',
};
const familyOf = (id: string) => LOOK_FAMILY[id] || 'print';

/* Reproduit le merge de handlePresetApply (App.tsx) : preset -> config complete. */
export function presetToConfig(p: CreativePresetConfig): VariantConfig {
  const baseAdj = { ...DEFAULT_ADJUSTMENTS };
  const adjustments: ImageAdjustments = {
    ...baseAdj,
    ...p.adjustments,
    tonalControls: { ...baseAdj.tonalControls, ...(p.adjustments.tonalControls || {}) },
    levels: { ...baseAdj.levels, ...(p.adjustments.levels || {}) },
  };
  let colorCount = 8;
  if (p.colorCount !== undefined) colorCount = p.colorCount;
  else if (p.colorMode === 'indexed' && p.selectedPalette !== undefined) {
    colorCount = PREDEFINED_PALETTES[p.selectedPalette].colors.length;
  }
  const colorModeSettings: ColorModeSettings = { ...DEFAULT_COLOR_MODE_SETTINGS };
  if (p.colorModeSettings) {
    const s = p.colorModeSettings;
    if (s.modulation) colorModeSettings.modulation = s.modulation;
    if (s.duoTone) colorModeSettings.duoTone = s.duoTone;
    if (s.triTone) colorModeSettings.triTone = s.triTone;
    if (s.tonalMapping) colorModeSettings.tonalMapping = s.tonalMapping;
    if (s.rgbSplit) colorModeSettings.rgbSplit = s.rgbSplit;
  }
  const paletteModifiers: PaletteModifiers = { ...DEFAULT_PALETTE_MODIFIERS, ...(p.paletteModifiers || {}) };
  const postProcessing: PostProcessing = p.postProcessing
    ? { ...DEFAULT_POST_PROCESSING, ...p.postProcessing }
    : { ...DEFAULT_POST_PROCESSING };

  return {
    algorithm: p.algorithm,
    colorMode: p.colorMode,
    selectedPalette: p.selectedPalette ?? 0,
    colorCount,
    resamplingMethod: 'bilinear',
    adjustments,
    colorModeSettings,
    paletteModifiers,
    postProcessing,
    meta: { id: p.id, label: p.label, family: familyOf(p.id), algoLabel: algoLabel(p.algorithm) },
  };
}

/* Reproduit la selection de palette de processImage (App.tsx). */
export function paletteForConfig(cfg: VariantConfig): string[] {
  if (cfg.paletteOverride && cfg.paletteOverride.length) return cfg.paletteOverride;
  let palette = PREDEFINED_PALETTES[cfg.selectedPalette].colors;
  if (cfg.colorMode === 'mono') palette = PREDEFINED_PALETTES[0].colors;
  else if (cfg.colorMode === 'indexed' && cfg.colorCount < palette.length) palette = palette.slice(0, cfg.colorCount);
  return palette;
}

/* Variante "Ta palette" : indexed sur la palette extraite de l'image. */
export function imagePaletteConfig(imageData: ImageData): VariantConfig {
  const pal = extractPaletteFromImage(imageData, 6);
  const colors = pal.length >= 2 ? pal : ['#0a0a0a', '#808080', '#f4f4f5'];
  return {
    algorithm: 'floyd-steinberg',
    colorMode: 'indexed',
    selectedPalette: 0,
    colorCount: colors.length,
    resamplingMethod: 'bilinear',
    adjustments: { ...DEFAULT_ADJUSTMENTS, contrast: 8 },
    colorModeSettings: { ...DEFAULT_COLOR_MODE_SETTINGS },
    paletteModifiers: { ...DEFAULT_PALETTE_MODIFIERS },
    postProcessing: { ...DEFAULT_POST_PROCESSING },
    paletteOverride: colors,
    meta: { id: '__image__', label: 'Ta palette', family: 'image', algoLabel: 'Indexed · image' },
  };
}

/* Variation bornee par tirage : meme Look, rendu visiblement different a chaque
   "Surprends-moi" (jitter contraste/luminosite + rotation de teinte pour les
   looks couleur). Reste tasteful · pas de hasard qui casse le rendu. */
const clampN = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
function jit(amt: number): number { return Math.round((Math.random() * 2 - 1) * amt); }
function varyConfig(cfg: VariantConfig): VariantConfig {
  const adjustments = {
    ...cfg.adjustments,
    contrast: clampN((cfg.adjustments.contrast || 0) + jit(8), -45, 60),
    brightness: clampN((cfg.adjustments.brightness || 0) + jit(5), -30, 30),
  };
  const paletteModifiers = { ...cfg.paletteModifiers };
  if (cfg.colorMode === 'indexed' || cfg.colorMode === 'tonal') {
    paletteModifiers.hueShift = clampN((paletteModifiers.hueShift || 0) + jit(22), -180, 180);
    paletteModifiers.saturationBoost = clampN((paletteModifiers.saturationBoost || 0) + jit(12), -30, 45);
  }
  return { ...cfg, adjustments, paletteModifiers };
}

const ALL_LOOKS = LOOK_PRESETS;
function looksByFamily(fam: string): CreativePresetConfig[] {
  return ALL_LOOKS.filter(l => familyOf(l.id) === fam);
}
function pickLook(fam: string, exclude: Set<string>): CreativePresetConfig | null {
  const pool = looksByFamily(fam).filter(l => !exclude.has(l.id));
  const src = pool.length ? pool : looksByFamily(fam);
  if (!src.length) return null;
  return src[Math.floor(Math.random() * src.length)];
}

function mainFamily(a: ImageAnalysis | null): string {
  if (!a) return 'print';
  if (a.meanBrightness < 85) return 'glow';
  if (a.edgeDensity > 0.4 || a.highFreqEnergy > 0.4) return 'ink';
  if (a.highFreqEnergy < 0.2) return 'print';
  return 'retro';
}

/* Casting de 5 : 1 principale routee par l'analyse + 3 looks de familles
   distinctes + 1 "Ta palette". keep[] = ids epingles a conserver, exclude =
   deja vus a eviter au re-tirage. */
export function buildCasting(
  analysis: ImageAnalysis | null,
  imageData: ImageData,
  keep: (VariantConfig | null)[],
  exclude: Set<string>,
): VariantConfig[] {
  const out: (VariantConfig | null)[] = [null, null, null, null, null];
  const usedFam = new Set<string>();
  const ex = new Set(exclude);

  for (let i = 0; i < 5; i++) {
    if (keep[i]) { out[i] = keep[i]; usedFam.add(keep[i]!.meta.family); ex.add(keep[i]!.meta.id); }
  }

  // slot 4 reserve a la palette image (sauf s'il est deja epingle)
  if (!out[4]) { out[4] = imagePaletteConfig(imageData); usedFam.add('image'); }

  const order = [mainFamily(analysis), 'ink', 'print', 'retro', 'glow', 'duo'];
  for (let i = 0; i < 4; i++) {
    if (out[i]) continue;
    let fam = order.find(f => !usedFam.has(f)) || order[i % order.length];
    let look = pickLook(fam, ex);
    if (!look) { // fallback : n'importe quel look non vu
      const any = ALL_LOOKS.filter(l => !ex.has(l.id));
      look = any.length ? any[Math.floor(Math.random() * any.length)] : ALL_LOOKS[i % ALL_LOOKS.length];
      fam = familyOf(look.id);
    }
    out[i] = varyConfig(presetToConfig(look));
    usedFam.add(fam); ex.add(look.id);
  }
  return out as VariantConfig[];
}
