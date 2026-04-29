// =============================================================================
// BEZIER · LOGO SYSTEM — TSX components mirrored from official Claude Design
// handoff (bezier/project/logo.jsx). Vector primitives, fully reactive to
// currentColor, sized via height/size props.
// =============================================================================

import type { CSSProperties, ReactNode } from 'react';

type Size = 'sm' | 'md' | 'lg' | 'xl';

const heights: Record<Size, number> = { sm: 18, md: 28, lg: 44, xl: 72 };

// ─────────────────────────────────────────────────────────────────────────────
// WORDMARK — wide, heavy, geometric BEZIER. 880×100 grid, fills currentColor.
// ─────────────────────────────────────────────────────────────────────────────
export function Wordmark({
  height = 32,
  color = 'currentColor',
  style,
  className,
}: {
  height?: number;
  color?: string;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 880 100"
      height={height}
      style={{ display: 'block', overflow: 'visible', ...style }}
      fill={color}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="BEZIER"
    >
      {/* B — vertical stem + two stacked bowls */}
      <path d="M0 0 L0 100 L78 100 C100 100 116 88 116 68 C116 56 110 48 100 44 C108 40 113 32 113 22 C113 8 100 0 78 0 Z M14 14 L76 14 C92 14 99 19 99 28 C99 37 92 42 76 42 L14 42 Z M14 56 L78 56 C96 56 102 62 102 70 C102 79 96 86 78 86 L14 86 Z" />
      {/* E — horizontal arms */}
      <path d="M148 0 L148 100 L240 100 L240 86 L162 86 L162 56 L228 56 L228 42 L162 42 L162 14 L240 14 L240 0 Z" />
      {/* Z — straight diagonal */}
      <path d="M272 0 L370 0 L370 14 L292 86 L370 86 L370 100 L272 100 L272 86 L350 14 L272 14 Z" />
      {/* I — single vertical bar */}
      <path d="M402 0 L416 0 L416 100 L402 100 Z" />
      {/* E — second */}
      <path d="M448 0 L448 100 L540 100 L540 86 L462 86 L462 56 L528 56 L528 42 L462 42 L462 14 L540 14 L540 0 Z" />
      {/* R — vertical stem + bowl + diagonal leg */}
      <path d="M572 0 L572 100 L586 100 L586 60 L612 60 L644 100 L664 100 L630 58 C646 53 654 42 654 28 C654 12 640 0 616 0 Z M586 14 L614 14 C630 14 640 20 640 30 C640 40 630 46 614 46 L586 46 Z" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BZTILE — favicon / app-tile. 100×100 grid, two modes:
//   - default: stacked B over Z (sovereign square monogram)
//   - schematic: bezier curve with control points (used for the system favicon)
// ─────────────────────────────────────────────────────────────────────────────
export function BZTile({
  size = 64,
  color = 'currentColor',
  bg = 'transparent',
  radius = 8,
  schematic = false,
  style,
  className,
}: {
  size?: number;
  color?: string;
  bg?: string;
  radius?: number;
  schematic?: boolean;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ display: 'block', ...style }}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="BEZIER"
    >
      {bg !== 'transparent' && <rect width="100" height="100" rx={radius} fill={bg} />}
      {schematic ? (
        <g>
          {/* corner ticks */}
          <path d="M18 18 L18 26 M18 18 L26 18" stroke={color} strokeWidth="1.5" fill="none" />
          <path d="M82 18 L82 26 M82 18 L74 18" stroke={color} strokeWidth="1.5" fill="none" />
          <path d="M18 82 L18 74 M18 82 L26 82" stroke={color} strokeWidth="1.5" fill="none" />
          <path d="M82 82 L82 74 M82 82 L74 82" stroke={color} strokeWidth="1.5" fill="none" />
          {/* bezier curve with anchor points */}
          <path d="M28 72 Q 28 32 72 32" stroke={color} strokeWidth="2" fill="none" />
          <line x1="28" y1="72" x2="50" y2="32" stroke={color} strokeWidth="0.8" opacity="0.5" />
          <line x1="72" y1="32" x2="50" y2="32" stroke={color} strokeWidth="0.8" opacity="0.5" />
          <rect x="26" y="70" width="4" height="4" fill={color} />
          <rect x="70" y="30" width="4" height="4" fill={color} />
          <circle cx="50" cy="32" r="2" fill={color} />
        </g>
      ) : (
        <g>
          {/* B */}
          <path
            fill={color}
            d="M20 22 L20 50 L52 50 C60 50 65 46 65 40 C65 36 62 33 58 32 C61 30 63 27 63 23 C63 18 58 15 51 15 L20 15 Z M28 21 L49 21 C54 21 56 22 56 25 C56 28 54 29 49 29 L28 29 Z M28 35 L51 35 C56 35 58 37 58 40 C58 43 56 44 51 44 L28 44 Z"
          />
          {/* Z */}
          <path
            fill={color}
            d="M35 56 L80 56 L80 63 L48 78 L80 78 L80 85 L35 85 L35 78 L67 63 L35 63 Z"
          />
        </g>
      )}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CLAIM LOCKUP — wordmark + spaced "RUNNING VISUAL CULTURE."
// ─────────────────────────────────────────────────────────────────────────────
export function ClaimLockup({
  size = 'md',
  color = 'currentColor',
  style,
}: {
  size?: Size;
  color?: string;
  style?: CSSProperties;
}) {
  const claimSize: Record<Size, number> = { sm: 9, md: 11, lg: 16, xl: 22 };
  const h = heights[size];
  const cs = claimSize[size];
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch', gap: h * 0.35, color, ...style }}>
      <Wordmark height={h} color={color} />
      <div style={{
        fontFamily: 'var(--ff-text)',
        fontSize: cs,
        fontWeight: 400,
        letterSpacing: '0.32em',
        textTransform: 'uppercase',
        textAlign: 'center',
        color,
      }}>
        RUNNING VISUAL CULTURE.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DOTONE — wordmark + cyan ".one" (the bezier.one address mark)
// ─────────────────────────────────────────────────────────────────────────────
export function DotOne({
  size = 'md',
  color = 'currentColor',
  accent = 'var(--bz-cyan)',
  style,
}: {
  size?: Size;
  color?: string;
  accent?: string;
  style?: CSSProperties;
}) {
  const h = heights[size];
  return (
    <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: h * 0.06, color, ...style }}>
      <Wordmark height={h} color={color} />
      <span style={{
        fontFamily: 'var(--ff-text)',
        fontSize: h * 0.62,
        letterSpacing: '-0.01em',
        color: accent,
        lineHeight: 1,
        fontWeight: 400,
      }}>.one</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ONE SUITE — wordmark + framed cyan "ONE" tag (the umbrella offer mark)
// ─────────────────────────────────────────────────────────────────────────────
export function OneSuite({
  size = 'md',
  color = 'currentColor',
  accent = 'var(--bz-cyan)',
  style,
}: {
  size?: Size;
  color?: string;
  accent?: string;
  style?: CSSProperties;
}) {
  const h = heights[size];
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: h * 0.4, color, ...style }}>
      <Wordmark height={h} color={color} />
      <span style={{
        fontFamily: 'var(--ff-text)',
        fontSize: h * 0.62,
        letterSpacing: '0.04em',
        color: accent,
        border: `2px solid ${accent}`,
        padding: `${h * 0.08}px ${h * 0.28}px ${h * 0.08}px`,
        textTransform: 'uppercase',
        fontWeight: 500,
        lineHeight: 1,
      }}>ONE</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INKNOISE LOCKUP — "Ink" solid + "Noise" rendered as halftone dot-mask,
// followed by "by [Wordmark]". Mirrors the product wordmark identity.
// ─────────────────────────────────────────────────────────────────────────────
export function InkNoiseLockup({
  size = 'md',
  orient = 'horizontal',
  color = 'currentColor',
  style,
}: {
  size?: Size;
  orient?: 'horizontal' | 'vertical';
  color?: string;
  style?: CSSProperties;
}) {
  const h: Record<Size, number> = { sm: 22, md: 36, lg: 60, xl: 96 };
  const heightVal = h[size];
  const dotResolved = color === 'currentColor' ? 'var(--bz-paper)' : color;

  const noiseStyle: CSSProperties = {
    fontFamily: 'var(--ff-display)',
    fontSize: heightVal,
    fontWeight: 600,
    letterSpacing: '-0.025em',
    lineHeight: 1,
    background: `radial-gradient(circle at 1px 1px, ${dotResolved} 0.6px, transparent 1px) 0 0 / ${Math.max(3, heightVal * 0.06)}px ${Math.max(3, heightVal * 0.06)}px`,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: 'transparent',
  };

  const inkType = (
    <span style={{
      fontFamily: 'var(--ff-display)',
      fontSize: heightVal,
      fontWeight: 600,
      letterSpacing: '-0.025em',
      lineHeight: 1,
      color,
    }}>Ink</span>
  );

  const noiseType: ReactNode = <span style={noiseStyle}>Noise</span>;

  const byBezier = (
    <span style={{
      fontFamily: 'var(--ff-text)',
      fontSize: heightVal * 0.28,
      fontWeight: 400,
      letterSpacing: '0.18em',
      color,
      textTransform: 'uppercase',
      display: 'inline-flex',
      alignItems: 'center',
      gap: heightVal * 0.18,
    }}>
      <span style={{ opacity: 0.85 }}>by</span>
      <Wordmark height={heightVal * 0.3} color={color} />
    </span>
  );

  if (orient === 'vertical') {
    return (
      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: heightVal * 0.18, ...style }}>
        <span>{inkType}{noiseType}</span>
        {byBezier}
      </div>
    );
  }
  return (
    <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: heightVal * 0.4, ...style }}>
      <span>{inkType}{noiseType}</span>
      {byBezier}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WATERMARK — BZTile + index "BZR · 0001" (used for internal proofs/exports)
// ─────────────────────────────────────────────────────────────────────────────
export function Watermark({
  index = 'BZR · 0001',
  color = 'currentColor',
  style,
}: {
  index?: string;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color, ...style }}>
      <BZTile size={16} color={color} />
      <div style={{ width: 1, height: 12, background: 'currentColor', opacity: 0.4 }} />
      <span style={{
        fontFamily: 'var(--ff-mono)',
        fontSize: 10,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
      }}>{index}</span>
    </div>
  );
}
