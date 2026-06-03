import { useRef, useEffect } from 'react';

// OutlineMark · animated Bezier-curve glyph, mirrors the one on outline.bezier.one.
// Used in the InkNoise nav next to the Outline link. Rendered in Outline green
// (#1FA56D) so it carries Outline's identity and reads distinct from the orange
// DitherMark next to InkNoise.

function quad(p0: {x:number;y:number}, p1: {x:number;y:number}, p2: {x:number;y:number}, t: number) {
  const k = 1 - t;
  return {
    x: k * k * p0.x + 2 * k * t * p1.x + t * t * p2.x,
    y: k * k * p0.y + 2 * k * t * p1.y + t * t * p2.y,
  };
}

export function OutlineMark({ size = 14, accent = true }: { size?: number; accent?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const S = size * dpr;
    c.width = S;
    c.height = S;
    const ctx = c.getContext('2d')!;

    const m = 2 * dpr;
    const anchors = [
      { x: m, y: S - m * 1.4 },
      { x: S * 0.50, y: m },
      { x: S - m, y: S - m * 1.4 }
    ];
    const handles = [
      { x: S * 0.22, y: m },
      { x: S * 0.78, y: m }
    ];

    let raf = 0, last = 0, t = 0;
    const color = accent ? '#1FA56D' : '#c0c0c5';

    const tick = (ts: number) => {
      if (ts - last < 85) { raf = requestAnimationFrame(tick); return; }
      last = ts;
      t += 0.06;
      ctx.clearRect(0, 0, S, S);

      const cycle = (t * 0.18) % 1;
      const drawT = Math.min(1, cycle / 0.6);

      ctx.strokeStyle = color;
      ctx.lineWidth = 1 * dpr;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const N = 36;
      const lim = Math.floor(N * drawT);
      for (let i = 0; i <= lim; i++) {
        const u = i / N;
        const p = u < 0.5
          ? quad(anchors[0], handles[0], anchors[1], u * 2)
          : quad(anchors[1], handles[1], anchors[2], (u - 0.5) * 2);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();

      ctx.fillStyle = color;
      const flashFrom = 0.6;
      anchors.forEach((a, i) => {
        const phase = (i + 0.5) / anchors.length;
        const on = cycle > flashFrom + phase * 0.32 || cycle < 0.05;
        if (on) {
          const sq = 2 * dpr;
          ctx.fillRect(a.x - sq / 2, a.y - sq / 2, sq, sq);
        }
      });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [size, accent]);

  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size, display: 'inline-block', verticalAlign: '-2px' }}
      aria-hidden="true"
    />
  );
}
