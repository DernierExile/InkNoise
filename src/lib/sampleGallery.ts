// =============================================================================
// Sample gallery · 9 sample subjects × 8 dither treatments
// Used on the home page to demonstrate the engine before the user uploads.
//
// Subject images live in public/samples/ as JPG files named NN-slug.jpg.
// Treatment "filters" are CSS approximations — the real engine renders
// pixel-perfect output, these are just visual hints for the showcase.
// =============================================================================

export interface SampleSubject {
  slug: string;
  label: string;
  src: string;
}

export interface DitherTreatment {
  id: string;
  num: string;
  short: string;
  name: string;
  filter: string;
}

export const SAMPLE_SUBJECTS: readonly SampleSubject[] = [
  { slug: 'object',    label: 'Object',    src: '/samples/01-object.jpg' },
  { slug: 'portrait',  label: 'Portrait',  src: '/samples/02-portrait.jpg' },
  { slug: 'sculpture', label: 'Sculpture', src: '/samples/03-sculpture.jpg' },
  { slug: 'drink',     label: 'Drink',     src: '/samples/04-drink.jpg' },
  { slug: 'food',      label: 'Food',      src: '/samples/05-food.jpg' },
  { slug: 'wildlife',  label: 'Wildlife',  src: '/samples/06-wildlife.jpg' },
  { slug: 'urban',     label: 'Urban',     src: '/samples/07-urban.jpg' },
  { slug: 'anime',     label: 'Anime',     src: '/samples/08-anime.jpg' },
  { slug: 'editorial', label: 'Editorial', src: '/samples/09-editorial.jpg' },
] as const;

export const DITHER_TREATMENTS: readonly DitherTreatment[] = [
  { id: 'floyd',          num: '01', short: 'FLOYD',    name: 'FLOYD-STEINBERG · MONO', filter: 'grayscale(1) contrast(1.4)' },
  { id: 'bayer',          num: '02', short: 'BAYER',    name: 'BAYER 16×16',            filter: 'grayscale(1) contrast(2) brightness(0.95)' },
  { id: 'halftone-cyan',  num: '03', short: 'HALFTONE', name: 'HALFTONE · CYAN',        filter: 'grayscale(1) sepia(1) hue-rotate(170deg) saturate(8) contrast(1.3)' },
  { id: 'riso-magenta',   num: '04', short: 'RISO',     name: 'RISO · MAGENTA',         filter: 'grayscale(1) sepia(1) hue-rotate(310deg) saturate(5) contrast(1.5)' },
  { id: 'tritone',        num: '05', short: 'TRI-TONE', name: 'TRI-TONE · WARM',        filter: 'contrast(1.7) saturate(1.4) hue-rotate(40deg)' },
  { id: 'duo-violet',     num: '06', short: 'DUO',      name: 'DUO-TONE · VIOLET',      filter: 'hue-rotate(220deg) saturate(2.5) contrast(1.3)' },
  { id: 'monoinv',        num: '07', short: 'INV',      name: 'MONO · INVERTED',        filter: 'grayscale(1) invert(1) contrast(1.1)' },
  { id: 'grain',          num: '08', short: 'GRAIN',    name: 'GRAIN · 35MM',           filter: 'grayscale(1) contrast(1.2) brightness(1.05)' },
] as const;
