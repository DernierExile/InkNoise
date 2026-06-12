import { useT } from '../i18n/use-i18n';

export default function SiteFooter() {
  const t = useT();
  const f = 'footer';

  const handleCookies = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    (window as unknown as { bezierConsent?: { open: () => void } }).bezierConsent?.open();
  };

  return (
    <footer className="border-t border-bz-grid bg-bz-graphite">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-16">
        {/* Top row: brand + 3 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-12 sm:gap-16">
          {/* Brand */}
          <div className="max-w-[320px]">
            <a
              href="https://bezier.one"
              className="inline-flex items-center gap-0 font-medium text-bz-paper text-lg tracking-tight mb-4 group"
              aria-label="Bezier.one"
            >
              <span className="group-hover:text-bz-paper transition-colors duration-240">Bezier</span>
              <span
                className="transition-colors duration-240"
                style={{ color: '#E84A1F' }}
              >
                .one
              </span>
            </a>
            <p className="text-bz-system text-[13px] leading-relaxed">
              {t(`${f}.tagline`)}
            </p>
          </div>

          {/* Modules */}
          <div>
            <div className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system mb-4">
              {t(`${f}.cols.modules`)}
            </div>
            <ul className="space-y-3 text-[13px]">
              <li>
                <a href="https://inknoise.bezier.one" className="text-bz-interface hover:text-bz-paper transition-colors duration-240">
                  {t(`${f}.modules.inknoise`)}
                </a>
              </li>
              <li>
                <a href="https://outline.bezier.one" className="text-bz-interface hover:text-bz-paper transition-colors duration-240">
                  {t(`${f}.modules.outline`)}
                </a>
              </li>
              <li>
                <span className="text-bz-system">{t(`${f}.modules.app3`)}</span>
              </li>
              <li>
                <span className="text-bz-system">{t(`${f}.modules.app4`)}</span>
              </li>
            </ul>
          </div>

          {/* Bezier */}
          <div>
            <div className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system mb-4">
              {t(`${f}.cols.bezier`)}
            </div>
            <ul className="space-y-3 text-[13px]">
              <li>
                <a href="#pricing" className="text-bz-interface hover:text-bz-paper transition-colors duration-240">
                  {t(`${f}.bezier.founderPass`)}
                </a>
              </li>
              <li>
                <a href="#" className="text-bz-interface hover:text-bz-paper transition-colors duration-240">
                  {t(`${f}.bezier.manifesto`)}
                </a>
              </li>
              <li>
                <a href="mailto:contact@bezier.one" className="text-bz-interface hover:text-bz-paper transition-colors duration-240">
                  {t(`${f}.bezier.contact`)}
                </a>
              </li>
              <li>
                <a href="mailto:bug@bezier.one" className="text-bz-interface hover:text-bz-paper transition-colors duration-240">
                  {t(`${f}.bezier.bug`)}
                </a>
              </li>
              <li>
                <a href="#" className="text-bz-interface hover:text-bz-paper transition-colors duration-240">
                  {t(`${f}.bezier.roadmap`)}
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <div className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system mb-4">
              {t(`${f}.cols.legal`)}
            </div>
            <ul className="space-y-3 text-[13px]">
              <li>
                <a
                  href="https://bezier.one/legal/cgu.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-bz-interface hover:text-bz-paper transition-colors duration-240"
                >
                  {t(`${f}.legal.terms`)}
                </a>
              </li>
              <li>
                <a
                  href="https://bezier.one/legal/politique-confidentialite.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-bz-interface hover:text-bz-paper transition-colors duration-240"
                >
                  {t(`${f}.legal.privacy`)}
                </a>
              </li>
              <li>
                <a
                  href="https://bezier.one/legal/licences-open-source.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-bz-interface hover:text-bz-paper transition-colors duration-240"
                >
                  {t(`${f}.legal.license`)}
                </a>
              </li>
              <li>
                <a
                  href="#"
                  data-bezier-consent-open
                  onClick={handleCookies}
                  className="text-bz-interface hover:text-bz-paper transition-colors duration-240"
                >
                  {t(`${f}.legal.cookies`)}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-6 border-t border-bz-grid flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system">
            {t(`${f}.bottom.copy`)}
          </span>
          <span className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system">
            {t(`${f}.bottom.tagline`)}
          </span>
        </div>
      </div>
    </footer>
  );
}
