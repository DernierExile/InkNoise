// =============================================================================
// MarketingSections · 4 marketing blocks ported from Claude Design redesign
// (sections.jsx · Manifesto, Workflow, Ecosystem, Pricing). Adapted to our
// Tailwind tokens and the strict Bezier lineage rule (no "invented").
//
// These render below the gallery, before the footer, on the home view.
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import { redirectToCheckout, getTierConfig } from '../../lib/stripe';
import { useAuth } from '../../contexts/use-auth';
import { useT } from '../../i18n/use-i18n';
import { supabase } from '../../lib/supabase';
import type { DitherOptions } from '../../types/dither-preview';

// =============================================================================
// Source image hook + DitherCanvas component (used by Algorithms / ColorModes /
// UseCases live render sections). The canonical hero sample lives at
// /samples/inknoisesample.jpg. If absent, falls back to the procedural source
// rendered by InkNoiseDither.renderSource().
// =============================================================================

function useSourceImage(src = '/samples/inknoisesample.jpg', w = 720): HTMLCanvasElement | null {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const renderFallback = () => {
      if (cancelled || typeof window === 'undefined' || !window.InkNoiseDither) return;
      const c = window.InkNoiseDither.renderSource(w, Math.round(w * 0.5625), 7);
      setCanvas(c);
    };

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      const ratio = img.height / img.width;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = Math.round(w * ratio);
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, c.width, c.height);
      setCanvas(c);
    };
    img.onerror = renderFallback;
    img.src = src;

    return () => { cancelled = true; };
  }, [src, w]);

  return canvas;
}

function DitherCanvas({
  source,
  algo,
  opts,
  className,
}: {
  source: HTMLCanvasElement | null;
  algo: string;
  opts?: DitherOptions;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!source || !ref.current || typeof window === 'undefined' || !window.InkNoiseDither) return;
    const out = window.InkNoiseDither.render(source, algo, opts);
    const c = ref.current;
    c.width = out.width;
    c.height = out.height;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(out, 0, 0);
  }, [source, algo, opts?.cell, opts?.angle, opts?.threshold, opts?.seed]);

  return <canvas ref={ref} className={className} style={{ width: '100%', height: '100%', display: 'block', imageRendering: 'auto' }} />;
}

// ─── Algorithms · 25 thumbs in 5×5 grid, all live rendered ──────────────────

// 6 color pairs in rotation, one per thumb. First slot is canonical B&W
// (paper on graphite), then color signals follow. Designed to read at
// thumbnail scale: each pair has strong contrast and a recognizable hue.
const ALGO_PALETTES: Array<{ fg: [number, number, number]; bg: [number, number, number] }> = [
  { fg: [244, 244, 241], bg: [5, 6, 7] },      // paper on graphite · canonical B&W
  { fg: [232, 74, 31],   bg: [5, 6, 7] },      // Riso orange on graphite
  { fg: [0, 213, 255],   bg: [5, 6, 7] },      // cyan on graphite
  { fg: [255, 61, 127],  bg: [5, 6, 7] },      // hot magenta on graphite
  { fg: [83, 97, 255],   bg: [244, 244, 241] },// violet on paper (inverted feel)
  { fg: [244, 211, 94],  bg: [5, 6, 7] },      // gold on graphite
];

const ALGO_INITIAL_COUNT = 10;

export function Algorithms() {
  // Eye detail crop · richer contrast and finer texture make algorithm
  // signatures more legible at thumbnail scale. Source asset:
  // public/samples/eyesample.jpg (added 2026-05-12).
  const source = useSourceImage('/samples/eyesample.jpg', 400);
  const catalog = typeof window !== 'undefined' && window.InkNoiseDither ? window.InkNoiseDither.CATALOG : [];
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? catalog : catalog.slice(0, ALGO_INITIAL_COUNT);
  const hiddenCount = Math.max(0, catalog.length - ALGO_INITIAL_COUNT);

  return (
    <section id="algorithms" className="border-t border-bz-grid py-20 px-4 sm:px-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid md:grid-cols-[320px_1fr] gap-12 mb-10 items-baseline">
          <div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system">02</span>
              <span className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system">Algorithms</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-[-0.02em] text-bz-paper leading-[1.1]">
              Twenty-five real algorithms. No reskins.
            </h2>
          </div>
          <p className="text-bz-interface leading-relaxed max-w-[560px]">
            Error diffusion (Floyd-Steinberg, Atkinson, Burkes, Stucki, Sierra family, Jarvis, Riemersma), ordered (Bayer 2×2 → 16×16, cluster dot), halftone (round, square, diamond, line, newsprint, crosshatch), stochastic (white, blue, stipple), and threshold. Each ships with its own threshold curve, palette mapping, and serpentine option.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {visible.map((a, i) => {
            const palette = ALGO_PALETTES[i % ALGO_PALETTES.length];
            return (
              <div key={i} className="panel-surface p-3 flex flex-col gap-2">
                <span className="font-mono-ui text-[9px] tracking-[0.22em] uppercase text-bz-system">{String(i + 1).padStart(2, '0')}</span>
                <div className="bg-bz-graphite border border-bz-grid aspect-square overflow-hidden">
                  {source ? (
                    <DitherCanvas
                      source={source}
                      algo={a.id}
                      opts={{
                        cell: a.cell,
                        angle: a.angle,
                        threshold: a.threshold,
                        seed: a.seed,
                        fg: palette.fg,
                        bg: palette.bg,
                      }}
                    />
                  ) : null}
                </div>
                <div>
                  <div className="text-bz-paper text-[12px] font-medium leading-tight">{a.name}</div>
                  <div className="font-mono-ui text-[9px] tracking-[0.18em] uppercase text-bz-system">{a.family}</div>
                </div>
              </div>
            );
          })}
        </div>

        {hiddenCount > 0 && (
          <div className="flex justify-center mt-8">
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-bz-grid hover:border-bz-cyan transition-colors duration-240 font-mono-ui text-[11px] tracking-[0.22em] uppercase text-bz-paper"
            >
              {showAll ? `Show less · keep ${ALGO_INITIAL_COUNT}` : `View all ${catalog.length} algorithms · +${hiddenCount} more`}
              <span aria-hidden>{showAll ? '↑' : '↓'}</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Color modes · 8 cards with live dither preview + palette swatch ─────────
// Each card shows the eye sample rendered as a duo-tone dither using the two
// strongest-contrast colors from the mode's palette · then the full palette
// swatch is rendered below for the full picture.

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  return [
    parseInt(c.slice(0, 2), 16),
    parseInt(c.slice(2, 4), 16),
    parseInt(c.slice(4, 6), 16),
  ];
}

interface ColorMode {
  name: string;
  desc: string;
  palette: string[];
  /** Algorithm used for the preview render · picked to flatter each mode. */
  algo: string;
  /** Optional override · which palette indices to use as fg / bg for the
   *  duo-tone preview. Defaults to first (bg) and last (fg). */
  preview?: { fg: number; bg: number };
}

const MODES: ColorMode[] = [
  { name: 'Mono',       desc: 'One ink. Pure 1-bit.',                       palette: ['#0a0a0c', '#f4f4f5'],                                    algo: 'atkinson' },
  { name: 'Duo-tone',   desc: 'Two ink Riso pairings.',                     palette: ['#1a1820', '#ff3d7f', '#3d5afe'],                         algo: 'halftone-circle', preview: { bg: 0, fg: 1 } },
  { name: 'Tri-tone',   desc: 'Highlight, mid, shadow.',                    palette: ['#0a0a0c', '#e84a1f', '#f4d35e', '#f5f1e8'],              algo: 'bayer-8',         preview: { bg: 0, fg: 1 } },
  { name: 'Tonal',      desc: 'Continuous palette ramp.',                   palette: ['#0a0a0c', '#3a3540', '#7a3a4a', '#d97757', '#f4d35e', '#f5f1e8'], algo: 'floyd-steinberg', preview: { bg: 0, fg: 5 } },
  { name: 'Indexed',    desc: 'Map to a fixed library.',                    palette: ['#0a0a0c', '#e84a1f', '#3d5afe', '#1f8a5b', '#f4d35e', '#f5f1e8'], algo: 'stucki',          preview: { bg: 0, fg: 4 } },
  { name: 'RGB-split',  desc: 'Channel-by-channel dither.',                 palette: ['#ff0040', '#00ff80', '#3060ff'],                         algo: 'halftone-line',   preview: { bg: 2, fg: 0 } },
  { name: 'Modulation', desc: 'Hue / sat / lum drives noise.',              palette: ['#1a1820', '#7c4dff', '#00d4ff', '#ffd54f'],              algo: 'bayer-16',        preview: { bg: 0, fg: 2 } },
  { name: 'CMYK Sep.',  desc: 'Print-ready four-channel separation.',       palette: ['#0a0a0c', '#00b4ff', '#ff3d7f', '#ffd83d'],              algo: 'halftone-circle', preview: { bg: 0, fg: 2 } },
];

function ColorModeCard({ mode, source }: { mode: ColorMode; source: HTMLCanvasElement | null }) {
  const fgIdx = mode.preview?.fg ?? mode.palette.length - 1;
  const bgIdx = mode.preview?.bg ?? 0;
  const fg = hexToRgb(mode.palette[fgIdx]);
  const bg = hexToRgb(mode.palette[bgIdx]);

  return (
    <div className="panel-surface p-4 flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <div className="text-bz-paper font-medium text-[15px]">{mode.name}</div>
        <span className="font-mono-ui text-[9px] tracking-[0.22em] uppercase text-bz-system">{mode.palette.length} ink</span>
      </div>
      <div className="bg-bz-graphite border border-bz-grid aspect-square overflow-hidden">
        {source ? (
          <DitherCanvas source={source} algo={mode.algo} opts={{ fg, bg, cell: 4 }} />
        ) : null}
      </div>
      <div
        className="grid h-3 border border-bz-grid"
        style={{ gridTemplateColumns: `repeat(${mode.palette.length}, 1fr)` }}
      >
        {mode.palette.map((c, i) => (
          <div key={i} style={{ background: c }} />
        ))}
      </div>
      <p className="text-bz-system text-[12px] leading-relaxed">{mode.desc}</p>
    </div>
  );
}

// ─── PostProd · 6 effect demo cards (CSS-only previews) ──────────────────────

const POST_EFFECTS = [
  { name: 'CRT Curve',           desc: 'Phosphor curvature with chromatic falloff. Old-television feel without the smear.',          cls: 'fx-crt' },
  { name: 'Scanlines',           desc: 'Configurable density and bleed. Stack with bloom for arcade output.',                        cls: 'fx-scan' },
  { name: 'Chromatic Aberr.',    desc: 'Per-channel offset and angle. Pull RGB apart on highlights only.',                           cls: 'fx-aber' },
  { name: 'Vignette',            desc: 'Optical falloff. Radial or linear, hard- or soft-edged.',                                    cls: 'fx-vig' },
  { name: 'Bloom',               desc: 'Highlight diffusion with threshold and radius. Print bleed approximation.',                  cls: 'fx-bloom' },
  { name: 'Grain',               desc: 'Monochromatic or chroma. Driven by luminance, not uniform.',                                 cls: 'fx-grain' },
];

export function PostProd() {
  return (
    <section id="post" className="border-t border-bz-grid py-20 px-4 sm:px-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid md:grid-cols-[320px_1fr] gap-12 mb-10 items-baseline">
          <div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system">04</span>
              <span className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system">Post-production</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-[-0.02em] text-bz-paper leading-[1.1]">
              Stack effects after the dither. Or don't.
            </h2>
          </div>
          <p className="text-bz-interface leading-relaxed max-w-[560px]">
            CRT, scanlines, chromatic aberration, vignette, bloom, grain. Each effect is its own node · toggle, reorder, render. Save the chain to a preset; it travels with the algorithm.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {POST_EFFECTS.map((p) => (
            <div key={p.name} className="panel-surface flex flex-col">
              <div className={`relative aspect-[16/10] ${p.cls}`} aria-hidden />
              <div className="p-4">
                <h4 className="text-bz-paper font-medium">{p.name}</h4>
                <p className="text-bz-system text-[12px] leading-relaxed mt-1">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── InterfaceMock · auto-cycling fake workbench screenshot ──────────────────

export function InterfaceMock() {
  const source = useSourceImage('/samples/inknoisesample.jpg', 800);
  const catalog = typeof window !== 'undefined' && window.InkNoiseDither ? window.InkNoiseDither.CATALOG.slice(0, 8) : [];
  const [active, setActive] = useState(1);
  const [knobs, setKnobs] = useState({ thr: 50, ang: 30, cell: 60, str: 70 });

  useEffect(() => {
    if (catalog.length === 0) return;
    const t = setInterval(() => setActive((a) => (a + 1) % catalog.length), 2200);
    return () => clearInterval(t);
  }, [catalog.length]);

  useEffect(() => {
    const t = setInterval(() => {
      setKnobs({
        thr: 30 + Math.random() * 50,
        ang: Math.random() * 100,
        cell: 30 + Math.random() * 60,
        str: 50 + Math.random() * 40,
      });
    }, 2200);
    return () => clearInterval(t);
  }, []);

  const activeAlgo = catalog[active];

  return (
    <section id="interface" className="border-t border-bz-grid py-20 px-4 sm:px-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid md:grid-cols-[320px_1fr] gap-12 mb-10 items-baseline">
          <div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system">05</span>
              <span className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system">Interface</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-[-0.02em] text-bz-paper leading-[1.1]">
              A workbench. Every knob exposed.
            </h2>
          </div>
          <p className="text-bz-interface leading-relaxed max-w-[560px]">
            Three panes: catalog, canvas, controls. Keyboard-first. Monospace at every label so you can read parameters across a 27-inch screen without leaning in.
          </p>
        </div>

        <div className="border border-bz-grid bg-bz-deep p-3">
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_200px] gap-2">
            {/* Left pane · algorithm list */}
            <div className="bg-bz-graphite border border-bz-grid p-3 flex flex-col gap-4">
              <div>
                <h5 className="font-mono-ui text-[9px] tracking-[0.22em] uppercase text-bz-system mb-2">Algorithm</h5>
                <div className="flex flex-col gap-0.5">
                  {catalog.map((a, i) => (
                    <div key={i} className={`flex items-center justify-between text-[12px] px-2 py-1 ${i === active ? 'bg-bz-deep text-bz-paper' : 'text-bz-interface'}`}>
                      <span className="truncate">{a.name}</span>
                      <span className={i === active ? 'text-bz-cyan' : 'text-transparent'}>●</span>
                    </div>
                  ))}
                  <div className="text-[12px] text-bz-system px-2 py-1 mt-1">+ 17 more</div>
                </div>
              </div>
              <div>
                <h5 className="font-mono-ui text-[9px] tracking-[0.22em] uppercase text-bz-system mb-2">Color mode</h5>
                <div className="flex flex-col gap-0.5">
                  {['Mono', 'Duo-tone', 'Tri-tone', 'Indexed', 'RGB-split'].map((m, i) => (
                    <div key={m} className={`text-[12px] px-2 py-1 ${i === 0 ? 'bg-bz-deep text-bz-paper' : 'text-bz-interface'}`}>{m}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Center pane · live canvas */}
            <div className="relative bg-bz-graphite border border-bz-grid aspect-[16/10] overflow-hidden">
              {source && activeAlgo ? (
                <DitherCanvas
                  source={source}
                  algo={activeAlgo.id}
                  opts={{ cell: activeAlgo.cell, angle: activeAlgo.angle, threshold: activeAlgo.threshold, seed: activeAlgo.seed }}
                />
              ) : null}
              {activeAlgo && (
                <div className="absolute bottom-0 left-0 right-0 flex justify-between px-3 py-2 bg-bz-graphite/85 border-t border-bz-grid font-mono-ui text-[10px] tracking-[0.18em] uppercase text-bz-system">
                  <span>{activeAlgo.name.toUpperCase()} · 4096×2730 · {Math.round(60 + Math.random() * 30)}ms</span>
                  <span>preset / live.json</span>
                </div>
              )}
            </div>

            {/* Right pane · parameters */}
            <div className="bg-bz-graphite border border-bz-grid p-3 flex flex-col gap-3">
              <h5 className="font-mono-ui text-[9px] tracking-[0.22em] uppercase text-bz-system">Parameters</h5>
              {([
                ['threshold', knobs.thr, '%'],
                ['angle',     knobs.ang, '°'],
                ['cell size', knobs.cell, 'px'],
                ['strength',  knobs.str, '%'],
              ] as const).map(([label, val, unit]) => (
                <div key={label}>
                  <div className="flex justify-between font-mono-ui text-[10px] tracking-[0.18em] uppercase mb-1">
                    <span className="text-bz-system">{label}</span>
                    <span className="text-bz-paper">{val.toFixed(0)}{unit}</span>
                  </div>
                  <div className="h-[2px] bg-bz-grid relative overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-bz-cyan transition-[width] duration-700" style={{ width: `${val}%` }} />
                  </div>
                </div>
              ))}
              <h5 className="font-mono-ui text-[9px] tracking-[0.22em] uppercase text-bz-system mt-2">Post-stack</h5>
              <div className="flex flex-col gap-0.5">
                {['Scanlines · 0.4', 'Bloom · 0.2', 'Vignette · 0.6'].map((p) => (
                  <div key={p} className="flex items-center justify-between text-[12px] px-2 py-1 text-bz-interface">
                    <span>{p}</span>
                    <span className="text-bz-cyan">●</span>
                  </div>
                ))}
                <div className="text-[12px] text-bz-system px-2 py-1">+ add effect</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── BeforeAfter · interactive split slider with algorithm chips ─────────────

export function BeforeAfter() {
  const t = useT();
  const source = useSourceImage('/samples/inknoisesample.jpg', 1200);
  const [split, setSplit] = useState(50);
  const [algo, setAlgo] = useState('atkinson');
  const draggingRef = useRef(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const leftRef = useRef<HTMLCanvasElement | null>(null);
  const rightRef = useRef<HTMLCanvasElement | null>(null);

  // Each algo has its own duo-tone palette · rotation of brand-aligned colors
  // so the demo never looks B&W only. The chip's swatch and the DITHERED tag
  // both reflect the active algo's palette.
  const algos = [
    { id: 'atkinson',         name: 'Atkinson',         fg: [244, 244, 241] as [number, number, number], bg: [5, 6, 7] as [number, number, number],         swatch: '#F4F4F1' }, // B&W
    { id: 'floyd-steinberg',  name: 'Floyd-Steinberg',  fg: [232, 74, 31]   as [number, number, number], bg: [5, 6, 7] as [number, number, number],         swatch: '#E84A1F' }, // Riso orange
    { id: 'bayer-8',          name: 'Bayer 8×8',        fg: [0, 213, 255]   as [number, number, number], bg: [5, 6, 7] as [number, number, number],         swatch: '#00D5FF' }, // cyan
    { id: 'halftone-circle',  name: 'Halftone',         fg: [255, 61, 127]  as [number, number, number], bg: [5, 6, 7] as [number, number, number],         swatch: '#FF3D7F' }, // magenta
    { id: 'halftone-line',    name: 'Halftone Line',    fg: [244, 211, 94]  as [number, number, number], bg: [5, 6, 7] as [number, number, number],         swatch: '#F4D35E' }, // gold
    { id: 'stucki',           name: 'Stucki',           fg: [83, 97, 255]   as [number, number, number], bg: [244, 244, 241] as [number, number, number],   swatch: '#5361FF' }, // violet on paper
  ];

  const activeAlgo = algos.find((a) => a.id === algo) ?? algos[0];

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!draggingRef.current || !wrapRef.current) return;
      const rect = wrapRef.current.getBoundingClientRect();
      const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const x = cx - rect.left;
      setSplit(Math.max(2, Math.min(98, (x / rect.width) * 100)));
    };
    const stop = () => { draggingRef.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', stop);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', stop);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', stop);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', stop);
    };
  }, []);

  useEffect(() => {
    if (!source || !leftRef.current || !rightRef.current || typeof window === 'undefined' || !window.InkNoiseDither) return;
    leftRef.current.width = source.width;
    leftRef.current.height = source.height;
    const lc = leftRef.current.getContext('2d');
    if (!lc) return;
    lc.drawImage(source, 0, 0);
    const out = window.InkNoiseDither.render(source, algo, { fg: activeAlgo.fg, bg: activeAlgo.bg });
    rightRef.current.width = out.width;
    rightRef.current.height = out.height;
    const rc = rightRef.current.getContext('2d');
    if (!rc) return;
    rc.drawImage(out, 0, 0);
  }, [source, algo, activeAlgo]);

  return (
    <section className="border-t border-bz-grid pt-6 pb-16 px-4 sm:px-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-baseline gap-3 mb-4">
          <span className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system">{t('home.demo.eyebrow')}</span>
          <span className="text-bz-paper text-[14px]">{t('home.demo.title')}</span>
        </div>

        <div
          ref={wrapRef}
          onMouseDown={() => { draggingRef.current = true; }}
          onTouchStart={() => { draggingRef.current = true; }}
          className="relative bg-bz-graphite border border-bz-grid aspect-[16/9] overflow-hidden cursor-ew-resize select-none"
          style={{ ['--split' as string]: `${split}%` }}
        >
          <div className="absolute inset-0">
            <canvas ref={leftRef} className="w-full h-full object-cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${split}%)` }}>
            <canvas ref={rightRef} className="w-full h-full object-cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div
            className="absolute top-0 bottom-0 w-px bg-bz-paper pointer-events-none"
            style={{ left: `${split}%` }}
          />
          <div
            className="absolute top-1/2 w-9 h-9 -translate-y-1/2 -translate-x-1/2 bg-bz-cyan text-bz-graphite border border-bz-paper rounded-full flex items-center justify-center font-mono-ui text-[12px] font-bold pointer-events-none"
            style={{ left: `${split}%` }}
          >
            ⇆
          </div>
          <div className="absolute top-3 left-3 font-mono-ui text-[10px] tracking-[0.22em] uppercase bg-bz-graphite/80 border border-bz-grid px-2 py-1 text-bz-paper">
            INPUT
          </div>
          <div
            className="absolute top-3 right-3 inline-flex items-center gap-2 font-mono-ui text-[10px] tracking-[0.22em] uppercase bg-bz-graphite/80 border px-2 py-1"
            style={{ borderColor: activeAlgo.swatch, color: activeAlgo.swatch }}
          >
            <span className="w-1.5 h-1.5" style={{ background: activeAlgo.swatch }} />
            DITHERED · {activeAlgo.name.toUpperCase()}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {algos.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAlgo(a.id)}
              className={`inline-flex items-center gap-2 px-3 py-2 font-mono-ui text-[10px] tracking-[0.22em] uppercase border transition-colors duration-240 ${
                a.id === algo ? 'bg-bz-paper text-bz-graphite' : 'text-bz-paper hover:opacity-80'
              }`}
              style={{
                borderColor: a.id === algo ? a.swatch : 'var(--bz-grid)',
                ...(a.id === algo ? { background: 'var(--bz-paper)' } : {}),
              }}
            >
              <span className="w-2 h-2" style={{ background: a.swatch }} aria-hidden />
              {a.name}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ColorModes() {
  const source = useSourceImage('/samples/eyesample.jpg', 300);

  return (
    <section id="modes" className="border-t border-bz-grid py-20 px-4 sm:px-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid md:grid-cols-[320px_1fr] gap-12 mb-10 items-baseline">
          <div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system">03</span>
              <span className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system">Color modes</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-[-0.02em] text-bz-paper leading-[1.1]">
              Eight ways to push pixels through ink.
            </h2>
          </div>
          <p className="text-bz-interface leading-relaxed max-w-[560px]">
            From pure 1-bit mono to four-channel CMYK separation. Modulate hue, saturation, and brightness independently. Lock channels for plate-faithful Riso output.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
          {MODES.map((m) => (
            <ColorModeCard key={m.name} mode={m} source={source} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Use cases · 4 cards with live render ───────────────────────────────────

export function UseCases() {
  const source = useSourceImage('/samples/inknoisesample.jpg', 600);
  const cases = [
    { name: 'Riso & screen-print pre-press',
      desc: 'Plate-faithful 1-bit and indexed output for two-color and three-color Riso runs. Locked angle, locked density, locked palette.',
      algo: 'halftone-circle', opts: { cell: 6, angle: 22 },
      tags: ['Mono → 2 plate', 'Channel separation', 'CMYK direct', '1200 DPI export'] },
    { name: 'AxiDraw, HP & plotter art',
      desc: 'Vector-clean halftone and crosshatch output ready for plotter ingestion. Stroke-density mode for pen-up / pen-down efficiency.',
      algo: 'halftone-line', opts: { cell: 5, angle: 45 },
      tags: ['SVG export', 'Stroke ordering', 'AxiDraw preset', 'Pen-up min.'] },
    { name: 'Editorial halftone',
      desc: 'Newsprint-faithful halftone with B&W tonal mapping. Drop a press-kit, get a 50-image set with one consistent texture.',
      algo: 'halftone-circle', opts: { cell: 4, angle: 45 },
      tags: ['Newsprint angle', 'Tonal curve', 'Magazine', 'TIFF · 600 DPI'] },
    { name: 'Pixel art shading',
      desc: 'Bayer matrices and stochastic dither sized to your sprite grid. Preserve hard edges, shade gradients without banding.',
      algo: 'bayer-4', opts: {},
      tags: ['Snap-to-grid', '8 / 16 / 32 px', 'Palette lock', 'GIF · APNG'] },
  ];

  return (
    <section className="border-t border-bz-grid py-20 px-4 sm:px-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid md:grid-cols-[320px_1fr] gap-12 mb-10 items-baseline">
          <div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system">07</span>
              <span className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system">Use cases</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-[-0.02em] text-bz-paper leading-[1.1]">
              Built for designers who control every pixel.
            </h2>
          </div>
          <p className="text-bz-interface leading-relaxed max-w-[560px]">
            If your medium is plate, pen, press or pixel · InkNoise was made for the constraints you actually hit on press day.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {cases.map((c) => (
            <div key={c.name} className="panel-surface p-5 flex flex-col sm:flex-row gap-5 items-stretch">
              <div className="flex-shrink-0 w-full sm:w-48 bg-bz-graphite border border-bz-grid aspect-[4/3]">
                {source ? <DitherCanvas source={source} algo={c.algo} opts={c.opts} /> : null}
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <h4 className="text-bz-paper font-medium">{c.name}</h4>
                <p className="text-bz-interface text-[13px] leading-relaxed flex-1">{c.desc}</p>
                <ul className="flex flex-wrap gap-1.5 pt-1">
                  {c.tags.map((t, j) => (
                    <li key={j} className="font-mono-ui text-[9px] tracking-[0.18em] uppercase text-bz-system border border-bz-grid px-2 py-0.5">
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Manifesto ────────────────────────────────────────────────────────────────

export function Manifesto() {
  return (
    <section className="border-t border-bz-grid py-20 px-4 sm:px-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid md:grid-cols-[320px_1fr] gap-12 mb-12 items-baseline">
          <div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system">01</span>
              <span className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system">Manifesto</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-[-0.02em] text-bz-paper leading-[1.1]">
              Not a filter. <span className="text-bz-system">Not a wrapper.</span> An engine.
            </h2>
          </div>
          <p className="text-bz-interface leading-relaxed max-w-[560px]">
            InkNoise sits between your source files and your output medium · Riso press, plotter, halftone newsprint, sub-pixel display. It is deterministic, parametric, and reproducible. It is the opposite of "magic mode."
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-8">
          <ManifestoCell variant="neg" title="Instagram filter"
            body="One opaque preset per look. No control over thresholds, kernels, palette mapping. Fine for a story. Useless for a campaign." />
          <ManifestoCell variant="neg" title="AI texture model"
            body="Hallucinated noise that drifts across runs. Different output every time you press render. Beautiful, occasionally. Reproducible, never." />
          <ManifestoCell variant="neg" title="Photoshop preset"
            body="Stacked actions with hidden state. Rebuilds break the second you open the document on another machine. Versioning is a hope." />
          <ManifestoCell variant="pos" title="InkNoise"
            body="One JSON preset. Twenty-five algorithms. Eight color modes. Six post-prod stacks. Same input → same output, every time, on every machine. Press save. Reproduce on 100 visuals." />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { k: 'Algorithms', v: '25' },
            { k: 'Color models', v: '8' },
            { k: 'Post stacks', v: '6' },
            { k: 'Export', v: '4K · PNG · TIFF · SVG' },
          ].map((cell) => (
            <div key={cell.k} className="panel-surface px-4 py-5 flex flex-col gap-1.5">
              <span className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system">{cell.k}</span>
              <span className="text-bz-paper text-xl sm:text-2xl font-medium tracking-tight">{cell.v}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ManifestoCell({ variant, title, body }: { variant: 'neg' | 'pos'; title: string; body: string }) {
  const isPos = variant === 'pos';
  return (
    <div className={`p-5 border ${isPos ? 'border-bz-cyan bg-bz-cyan/[0.04]' : 'border-bz-grid bg-bz-deep'} flex flex-col gap-2`}>
      <h3 className={`font-medium text-base ${isPos ? 'text-bz-paper' : 'text-bz-interface'}`}>{title}</h3>
      <p className={`text-[13px] leading-relaxed ${isPos ? 'text-bz-interface' : 'text-bz-system'}`}>{body}</p>
    </div>
  );
}

// ─── Workflow ─────────────────────────────────────────────────────────────────

export function Workflow() {
  const steps = [
    { n: 'Step 01', h: 'Drop. Preview live.', p: 'Drag a single image, or a folder of fifty. The preview canvas updates at 16ms per render · no spinner, no upload, no server.', glyph: <DropGlyph /> },
    { n: 'Step 02', h: 'Save preset.',        p: 'Every parameter · algorithm, palette, post-stack, threshold curve · serializes to a portable JSON file. Drag it back in to restore the exact look on any machine.', glyph: <PresetGlyph /> },
    { n: 'Step 03', h: 'Batch the campaign.', p: 'Drop the same preset on a folder of 50 images. Get a zip back with consistent texture across every visual. Same input, same output. No drift.', glyph: <BatchGlyph /> },
  ];

  return (
    <section className="border-t border-bz-grid py-20 px-4 sm:px-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid md:grid-cols-[320px_1fr] gap-12 mb-12 items-baseline">
          <div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system">06</span>
              <span className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system">Workflow</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-[-0.02em] text-bz-paper leading-[1.1]">
              Single image, fifty images, same preset.
            </h2>
          </div>
          <p className="text-bz-interface leading-relaxed max-w-[560px]">
            InkNoise was built to handle a campaign · not one hero shot. Set the look once, save it, run it across every visual you ship.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {steps.map((s) => (
            <div key={s.n} className="panel-surface p-6 flex flex-col gap-3 min-h-[280px]">
              <span className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system">{s.n}</span>
              <h4 className="text-xl text-bz-paper font-medium tracking-tight">{s.h}</h4>
              <p className="text-[13px] text-bz-interface leading-relaxed flex-1">{s.p}</p>
              <div className="text-bz-system">{s.glyph}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DropGlyph() {
  return (
    <svg width="100%" height="80" viewBox="0 0 200 96" fill="none">
      <rect x="40" y="20" width="120" height="56" rx="0" stroke="currentColor" strokeWidth="1" strokeDasharray="3 4" opacity="0.4" />
      <path d="M100 36 L100 60 M88 50 L100 60 L112 50" stroke="var(--bz-cyan)" strokeWidth="1.5" />
    </svg>
  );
}
function PresetGlyph() {
  return (
    <svg width="100%" height="80" viewBox="0 0 200 96" fill="none">
      <rect x="36" y="14" width="128" height="68" rx="0" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      {[22, 32, 42, 52, 62, 72].map((y, i) => (
        <line key={i} x1="44" y1={y} x2={i % 2 ? 130 : 150} y2={y}
          stroke={i === 2 ? 'var(--bz-cyan)' : 'currentColor'} strokeWidth="1" opacity={i === 2 ? 1 : 0.4} />
      ))}
      <text x="160" y="18" fontSize="8" fill="currentColor" opacity="0.5">.json</text>
    </svg>
  );
}
function BatchGlyph() {
  return (
    <svg width="100%" height="80" viewBox="0 0 200 96" fill="none">
      {Array.from({ length: 10 }).map((_, i) => {
        const x = 30 + (i % 5) * 30;
        const y = 18 + Math.floor(i / 5) * 36;
        return (
          <rect key={i} x={x} y={y} width="22" height="24" rx="0"
            stroke={i === 4 ? 'var(--bz-cyan)' : 'currentColor'} strokeWidth="1"
            opacity={i === 4 ? 1 : 0.4}
            fill={i === 4 ? 'var(--bz-cyan)' : 'transparent'}
            fillOpacity={i === 4 ? 0.15 : 0} />
        );
      })}
      <path d="M170 50 L186 50 M178 44 L186 50 L178 56" stroke="var(--bz-cyan)" strokeWidth="1.5" />
    </svg>
  );
}

// ─── Ecosystem ────────────────────────────────────────────────────────────────
// IMPORTANT · Pierre Bezier lineage rule applies. Never attribute the
// invention of curves to Pierre publicly. Use the validated formulation:
// "from a line of Pierres and Claudes, engineers and one PhD in mathematics,
// who left a mark."

export function Ecosystem() {
  return (
    <section className="border-t border-bz-grid py-20 px-4 sm:px-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid md:grid-cols-[320px_1fr] gap-12 mb-12 items-baseline">
          <div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system">08</span>
              <span className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system">Ecosystem</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-[-0.02em] text-bz-paper leading-[1.1]">
              Part of Bezier One.
            </h2>
          </div>
          <p className="text-bz-interface leading-relaxed max-w-[560px]">
            A suite of small, opinionated tools for image makers · built one at a time, around the same workbench philosophy. InkNoise is the first.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div className="space-y-4">
            <a href="https://bezier.one" className="inline-flex items-center gap-2 font-mono-ui text-[11px] tracking-[0.22em] uppercase text-bz-cyan hover:underline">
              bezier.one <span>↗</span>
            </a>
            <h3 className="text-2xl sm:text-3xl font-medium tracking-tight text-bz-paper">
              A name, not a brand.
            </h3>
            <p className="text-bz-interface leading-relaxed">
              Bezier isn't a brand. It's my name. I come from a line of Pierres and Claudes · engineers and one PhD in mathematics · who left a mark. Bezier One is the suite I'm building under that name.
            </p>
            <p className="text-bz-system text-sm leading-relaxed">
              Same philosophy across every app · controls you can reason about, parameters you can save, outputs you can reproduce.
            </p>
            <div className="pt-4">
              <a href="https://bezier.one" className="inline-flex items-center gap-2 px-4 py-2.5 border border-bz-grid hover:border-bz-cyan transition-colors duration-240 font-mono-ui text-[11px] tracking-[0.22em] uppercase text-bz-paper">
                Visit bezier.one <span>→</span>
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <EcoItem name="InkNoise" desc="Texture engine for digital images." status="live" />
            <EcoItem name="Outline" desc="Raster to vector. Plotter-grade SVG." status="live" link="https://outline.bezier.one" />
            <EcoItem name="Studio · 3rd app" desc="In design. Bundled with Founder." status="q4" />
            <EcoItem name="Studio · 4th app" desc="In design. Bundled with Founder." status="2027" />
          </div>
        </div>
      </div>
    </section>
  );
}

function EcoItem({ name, desc, status, link }: { name: string; desc: string; status: 'live' | 'soon' | 'q4' | '2027'; link?: string }) {
  const statusLabel = { live: 'Live', soon: 'Soon', q4: 'Q4', '2027': '2027' }[status];
  const statusColor = status === 'live' ? 'text-bz-cyan' : 'text-bz-system';
  return (
    <div className="panel-surface px-5 py-4 flex items-center justify-between">
      <div>
        <div className="text-bz-paper font-medium">
          {link ? (
            <a href={link} className="hover:text-bz-cyan transition-colors duration-240">{name}</a>
          ) : name}
        </div>
        <div className="text-bz-system text-[13px]">{desc}</div>
      </div>
      <div className={`font-mono-ui text-[10px] tracking-[0.22em] uppercase ${statusColor} flex items-center gap-2`}>
        {status === 'live' && <span className="w-1.5 h-1.5 bg-bz-cyan animate-signal-pulse" />}
        {statusLabel}
      </div>
    </div>
  );
}

// ─── Pricing (Founder + 3-tier grid) ──────────────────────────────────────────

interface PricingProps {
  onSignInNeeded: () => void;
}

export function Pricing({ onSignInNeeded }: PricingProps) {
  const { session } = useAuth();
  const t = useT();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const handleCheckout = async (tierId: 'monthly' | 'annual' | 'lifetime') => {
    if (!session) {
      onSignInNeeded();
      return;
    }
    setLoadingTier(tierId);
    try {
      const tiers = getTierConfig();
      await redirectToCheckout(tiers[tierId]);
    } catch (err) {
      console.error('Checkout error:', err);
      setLoadingTier(null);
    }
  };

  const p = 'home.marketing.pricing';

  return (
    <section id="pricing" className="border-t border-bz-grid py-20 px-4 sm:px-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid md:grid-cols-[320px_1fr] gap-12 mb-12 items-baseline">
          <div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system">{t(`${p}.section`)}</span>
              <span className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system">{t(`${p}.label`)}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-[-0.02em] text-bz-paper leading-[1.1]">
              {t(`${p}.title`)}
            </h2>
          </div>
          <p className="text-bz-interface leading-relaxed max-w-[560px]">
            {t(`${p}.body`)}
          </p>
        </div>

        {/* Founder offer · highlighted card */}
        <div className="panel-surface border-bz-cyan p-6 sm:p-10 mb-3 grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <div className="inline-block font-mono-ui text-[10px] tracking-[0.22em] uppercase px-2 py-1 border border-bz-cyan text-bz-cyan">
              {t(`${p}.founderBadge`)}
            </div>
            <h3 className="text-2xl sm:text-3xl font-medium tracking-tight text-bz-paper">
              {t(`${p}.founderTitle`)}
            </h3>
            <p className="text-bz-interface leading-relaxed">
              {t(`${p}.founderDesc`)}
            </p>
            <ul className="space-y-2 text-bz-interface text-sm">
              <li className="flex gap-2"><span className="text-bz-cyan">·</span> {t(`${p}.founderItems.inknoise`)}</li>
              <li className="flex gap-2"><span className="text-bz-cyan">·</span> {t(`${p}.founderItems.outline`)}</li>
              <li className="flex gap-2"><span className="text-bz-cyan">·</span> {t(`${p}.founderItems.future`)}</li>
              <li className="flex gap-2"><span className="text-bz-cyan">·</span> {t(`${p}.founderItems.discord`)}</li>
            </ul>
            <div className="pt-2 space-y-3">
              <button
                onClick={() => handleCheckout('lifetime')}
                disabled={loadingTier === 'lifetime'}
                className="inline-flex items-center gap-2 px-5 py-3 bg-bz-paper text-bz-graphite border border-bz-paper hover:bg-bz-cyan hover:border-bz-cyan transition-colors duration-240 font-mono-ui text-[11px] tracking-[0.22em] uppercase font-medium disabled:opacity-60 disabled:cursor-wait"
              >
                {loadingTier === 'lifetime' ? t(`${p}.ctaLoading`) : t(`${p}.ctaFounder`)} <span>→</span>
              </button>
              <p className="text-bz-system text-[11px] font-mono-ui tracking-wide">
                {t(`${p}.finePrint`)}
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-bz-system text-3xl font-medium">€</span>
              <span className="text-bz-paper text-7xl sm:text-8xl font-medium tracking-[-0.04em] leading-none">79</span>
              <span className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system ml-2">{t(`${p}.priceLabel`)}</span>
            </div>

            <FounderCounter />

            <div className="mt-6 p-4 border border-bz-grid bg-bz-deep">
              <div className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system mb-2">{t(`${p}.dayOne.label`)}</div>
              <p className="text-bz-interface text-[13px] leading-relaxed">
                {t(`${p}.dayOne.body`)}
              </p>
            </div>
          </div>
        </div>

        {/* 3 tiers grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <PricingTier
            name={t(`${p}.tiers.free.name`)}
            price="€0"
            term={t(`${p}.tiers.free.term`)}
            blurb={t(`${p}.tiers.free.blurb`)}
            features={[
              t(`${p}.tiers.free.features.f1`),
              t(`${p}.tiers.free.features.f2`),
              t(`${p}.tiers.free.features.f3`),
              t(`${p}.tiers.free.features.f4`),
              t(`${p}.tiers.free.features.f5`),
            ]}
            cta={t(`${p}.tiers.free.cta`)}
            primary={false}
            onClick={() => session ? null : onSignInNeeded()}
          />
          <PricingTier
            name={t(`${p}.tiers.studio.name`)}
            price="€12"
            term={t(`${p}.tiers.studio.term`)}
            blurb={t(`${p}.tiers.studio.blurb`)}
            features={[
              t(`${p}.tiers.studio.features.f1`),
              t(`${p}.tiers.studio.features.f2`),
              t(`${p}.tiers.studio.features.f3`),
              t(`${p}.tiers.studio.features.f4`),
              t(`${p}.tiers.studio.features.f5`),
            ]}
            cta={loadingTier === 'monthly' ? t(`${p}.ctaLoading`) : t(`${p}.tiers.studio.cta`)}
            primary
            highlighted
            onClick={() => handleCheckout('monthly')}
          />
          <PricingTier
            name={t(`${p}.tiers.founder.name`)}
            price="€79"
            term={t(`${p}.tiers.founder.term`)}
            blurb={t(`${p}.tiers.founder.blurb`)}
            features={[
              t(`${p}.tiers.founder.features.f1`),
              t(`${p}.tiers.founder.features.f2`),
              t(`${p}.tiers.founder.features.f3`),
              t(`${p}.tiers.founder.features.f4`),
              t(`${p}.tiers.founder.features.f5`),
            ]}
            cta={loadingTier === 'lifetime' ? t(`${p}.ctaLoading`) : t(`${p}.tiers.founder.cta`)}
            primary={false}
            onClick={() => handleCheckout('lifetime')}
          />
        </div>
      </div>
    </section>
  );
}

function PricingTier({
  name, price, term, blurb, features, cta, primary, highlighted, onClick,
}: {
  name: string; price: string; term: string; blurb: string;
  features: string[]; cta: string; primary: boolean; highlighted?: boolean;
  onClick: () => void;
}) {
  return (
    <div className={`p-6 flex flex-col gap-4 ${highlighted ? 'border border-bz-cyan bg-bz-cyan/[0.04]' : 'panel-surface'}`}>
      <div className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system">{name}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-bz-paper text-4xl sm:text-5xl font-medium tracking-[-0.02em]">{price}</span>
        <span className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system">{term}</span>
      </div>
      <p className="text-bz-interface text-sm leading-relaxed">{blurb}</p>
      <ul className="space-y-2 text-[13px] text-bz-interface flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-bz-cyan">·</span> {f}
          </li>
        ))}
      </ul>
      <button
        onClick={onClick}
        className={`mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 font-mono-ui text-[11px] tracking-[0.22em] uppercase border transition-colors duration-240 ${
          primary
            ? 'bg-bz-paper text-bz-graphite border-bz-paper hover:bg-bz-cyan hover:border-bz-cyan'
            : 'border-bz-grid text-bz-paper hover:border-bz-cyan'
        }`}
      >
        {cta} <span>→</span>
      </button>
    </div>
  );
}

function FounderCounter() {
  // Live count fetched from the founder-count edge function
  // (deploys with --no-verify-jwt, returns { claimed, total }).
  // Falls back to a safe default while loading or on error.
  const [claimed, setClaimed] = useState<number | null>(null);
  const [total, setTotal] = useState(500);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('founder-count');
        if (cancelled) return;
        if (error) {
          console.warn('founder-count fetch failed:', error);
          setClaimed(0);
          return;
        }
        if (typeof data?.claimed === 'number') setClaimed(data.claimed);
        if (typeof data?.total === 'number') setTotal(data.total);
      } catch (e) {
        if (!cancelled) setClaimed(0);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const displayed = claimed ?? 0;
  const pct = (displayed / total) * 100;
  const remaining = Math.max(0, total - displayed);

  return (
    <div className="flex items-center gap-3 font-mono-ui text-[11px] tracking-[0.18em] uppercase text-bz-system">
      <span><span className="text-bz-paper">{claimed === null ? '…' : displayed}</span> / {total} claimed</span>
      <div className="flex-1 h-1 bg-bz-grid relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-bz-cyan transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span>{remaining} left</span>
    </div>
  );
}
