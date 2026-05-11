// =============================================================================
// DitherMark · animated brand canvas mark for InkNoise
//
// Renders a small Bayer 4×4 ordered-dither over a moving sine-noise field,
// throttled to ~14fps for the "living dither" cadence. Used as the InkNoise
// product mark in the header nav and in ecosystem product cards.
//
// Ported from the Claude Design redesign handoff (sections.jsx · DitherMark
// component). Adapted to TypeScript and the InkNoise design tokens
// (--bz-paper / --bz-accent).
// =============================================================================

import { useEffect, useRef } from 'react';

interface DitherMarkProps {
  /** Rendered size in CSS pixels. */
  size?: number;
  /** Number of cells per side. Defaults to max(8, floor(size / 3)). */
  cells?: number;
  /** Animation speed multiplier (1 = ~14fps base cadence). */
  speed?: number;
  /** When true, paint with --bz-accent (orange). When false, --bz-paper (white). */
  accent?: boolean;
  /** Optional className for layout overrides. */
  className?: string;
}

// Bayer 4×4 ordered-dither matrix (normalized 0..1)
const BAYER4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5],
].map((row) => row.map((v) => v / 16));

export function DitherMark({
  size = 16,
  cells,
  speed = 1,
  accent = false,
  className,
}: DitherMarkProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const N = cells ?? Math.max(8, Math.floor(size / 3));

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = size * dpr;
    c.height = size * dpr;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let t = 0;
    let raf = 0;
    let last = 0;
    const cell = (size * dpr) / N;

    const tick = (ts: number) => {
      // Throttle to ~14fps for the characterful "living dither" cadence
      if (ts - last < 70) {
        raf = requestAnimationFrame(tick);
        return;
      }
      last = ts;
      t += 0.06 * speed;

      ctx.clearRect(0, 0, c.width, c.height);
      const rootStyle = getComputedStyle(document.documentElement);
      const fg = accent
        ? rootStyle.getPropertyValue('--bz-accent').trim()
          || rootStyle.getPropertyValue('--bz-cyan').trim()
          || '#E84A1F'
        : rootStyle.getPropertyValue('--bz-paper').trim() || '#F4F4F1';
      ctx.fillStyle = fg;

      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          // Smooth noise field · overlapping sine waves
          const nx = x / N;
          const ny = y / N;
          const v =
            0.5
            + 0.32 * Math.sin((nx + t * 0.18) * 6.0 + Math.cos((ny - t * 0.12) * 5.0))
            + 0.18 * Math.sin((nx * 2.4 - ny * 1.7 + t * 0.32) * 4.0);
          const thr = BAYER4[y % 4][x % 4];
          if (v > thr) ctx.fillRect(x * cell, y * cell, cell, cell);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [size, N, speed, accent]);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{
        width: size,
        height: size,
        imageRendering: 'pixelated',
        display: 'inline-block',
        verticalAlign: 'middle',
      }}
      aria-hidden="true"
    />
  );
}
