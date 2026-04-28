/* BEZIER brand vector system — Sprint 1.5
 * MANDATORY: use these components for any logo, mark, lockup, or watermark.
 * Square corners, hairline strokes, no glow, no gradients.
 */

interface BrandProps {
  className?: string;
  color?: string;
}

interface BZTileProps extends BrandProps {
  schematic?: boolean;
  size?: number;
}

interface InkNoiseLockupProps extends BrandProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  orient?: 'horizontal' | 'vertical';
}

/* 1. Wordmark — BEZIER set in custom geometric letterforms */
export function Wordmark({ className = '', color = 'currentColor' }: BrandProps) {
  return (
    <svg
      viewBox="0 0 240 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="BEZIER"
    >
      <text
        x="0"
        y="28"
        fill={color}
        fontFamily="Inter, -apple-system, sans-serif"
        fontSize="32"
        fontWeight="500"
        letterSpacing="0.04em"
      >
        BEZIER
      </text>
    </svg>
  );
}

/* 2. BZTile — square tile with B/Z monogram, optional schematic crosshair */
export function BZTile({ className = '', color = 'currentColor', schematic = false, size = 40 }: BZTileProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="BEZIER tile"
    >
      <rect x="0.5" y="0.5" width="39" height="39" stroke={color} strokeWidth="1" />
      {schematic && (
        <>
          <line x1="20" y1="2" x2="20" y2="8" stroke={color} strokeWidth="0.5" opacity="0.5" />
          <line x1="20" y1="32" x2="20" y2="38" stroke={color} strokeWidth="0.5" opacity="0.5" />
          <line x1="2" y1="20" x2="8" y2="20" stroke={color} strokeWidth="0.5" opacity="0.5" />
          <line x1="32" y1="20" x2="38" y2="20" stroke={color} strokeWidth="0.5" opacity="0.5" />
        </>
      )}
      <text
        x="20"
        y="26"
        fill={color}
        fontFamily="Inter, -apple-system, sans-serif"
        fontSize="18"
        fontWeight="500"
        textAnchor="middle"
        letterSpacing="-0.02em"
      >
        BZ
      </text>
    </svg>
  );
}

/* 3. InkNoiseLockup — wordmark with sub-product line */
export function InkNoiseLockup({
  className = '',
  color = 'currentColor',
  size = 'md',
  orient = 'horizontal',
}: InkNoiseLockupProps) {
  const sizes = {
    sm: { wordmark: 'text-2xl', meta: 'text-[9px]' },
    md: { wordmark: 'text-4xl', meta: 'text-[10px]' },
    lg: { wordmark: 'text-6xl', meta: 'text-xs' },
    xl: { wordmark: 'text-7xl sm:text-8xl', meta: 'text-xs sm:text-sm' },
  };
  const s = sizes[size];
  const layout =
    orient === 'vertical'
      ? 'flex flex-col items-center gap-3'
      : 'flex items-center gap-4';

  return (
    <div className={`${layout} ${className}`} style={{ color }}>
      {orient === 'vertical' && (
        <span
          className={`${s.meta} font-mono uppercase`}
          style={{ letterSpacing: '0.3em', color: 'var(--bz-system)' }}
        >
          PRODUCT · 001 · LIVE
        </span>
      )}
      <span
        className={`${s.wordmark} font-medium leading-none`}
        style={{ letterSpacing: '-0.02em', color: 'var(--bz-paper)' }}
      >
        InkNoise
      </span>
      <span
        className={`${s.meta} font-mono uppercase`}
        style={{ letterSpacing: '0.3em', color: 'var(--bz-system)' }}
      >
        BY BEZIER
      </span>
    </div>
  );
}

/* 4. DotOne — single cyan signal dot */
export function DotOne({ className = '' }: BrandProps) {
  return (
    <span
      className={`inline-block ${className}`}
      style={{ width: 6, height: 6, background: 'var(--bz-cyan)' }}
      aria-hidden
    />
  );
}

/* 5. OneSuite — BEZIER ONE umbrella mark */
export function OneSuite({ className = '', color = 'currentColor' }: BrandProps) {
  return (
    <svg
      viewBox="0 0 120 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="BEZIER ONE"
    >
      <text
        x="0"
        y="18"
        fill={color}
        fontFamily="Inter, -apple-system, sans-serif"
        fontSize="14"
        fontWeight="500"
        letterSpacing="0.18em"
      >
        BEZIER · ONE
      </text>
    </svg>
  );
}

/* 6. ClaimLockup — primary brand claim */
export function ClaimLockup({ className = '' }: BrandProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span
        className="font-mono uppercase text-[10px]"
        style={{ letterSpacing: '0.3em', color: 'var(--bz-system)' }}
      >
        BEZIER
      </span>
      <span
        className="text-base font-medium"
        style={{ letterSpacing: '-0.01em', color: 'var(--bz-paper)' }}
      >
        Running visual culture.
      </span>
    </div>
  );
}

/* 7. Watermark — discreet diagonal signature for outputs */
export function Watermark({ className = '', color = 'currentColor' }: BrandProps) {
  return (
    <svg
      viewBox="0 0 200 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="InkNoise watermark"
    >
      <text
        x="0"
        y="16"
        fill={color}
        fontFamily="JetBrains Mono, monospace"
        fontSize="11"
        fontWeight="500"
        letterSpacing="0.18em"
        opacity="0.7"
      >
        INKNOISE · BY BEZIER
      </text>
    </svg>
  );
}
