// =============================================================================
// LanguageSwitcher — minimalist dropdown for switching locales.
// Aligned with brand: square corners, hairline borders, mono labels.
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import { Globe } from 'lucide-react';
import { useI18n } from '../i18n/use-i18n';
import { SUPPORTED_LOCALES, type Locale } from '../i18n/i18n-context';

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const current = SUPPORTED_LOCALES.find((l) => l.code === locale)!;

  const choose = (code: Locale) => {
    setLocale(code);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono-ui text-bz-system hover:text-bz-paper border border-bz-grid hover:border-bz-system transition-colors duration-240 tracking-widest"
        aria-label={t('header.language')}
        aria-expanded={open}
      >
        <Globe className="w-3 h-3" />
        {current.label}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 bg-bz-deep border border-bz-grid min-w-[140px]">
          {SUPPORTED_LOCALES.map((l) => (
            <button
              key={l.code}
              onClick={() => choose(l.code)}
              className={`w-full flex items-center justify-between px-3 py-2 text-left text-[11px] font-mono-ui tracking-wider transition-colors duration-240 ${
                l.code === locale
                  ? 'bg-bz-cyan/10 text-bz-cyan'
                  : 'text-bz-paper hover:bg-bz-grid'
              }`}
            >
              <span>{l.native}</span>
              <span className="text-[9px] text-bz-system tracking-widest">{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
