import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Upload } from 'lucide-react';
import { InkNoiseLockup } from './brand';
import { useT } from '../i18n/use-i18n';
import { SAMPLE_SUBJECTS, DITHER_TREATMENTS } from '../lib/sampleGallery';

interface ImageUploadProps {
  onImageLoad: (image: HTMLImageElement) => void;
  toolbar?: ReactNode;
}

export default function ImageUpload({ onImageLoad, toolbar }: ImageUploadProps) {
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeSubjectSlug, setActiveSubjectSlug] = useState(SAMPLE_SUBJECTS[0].slug);
  const [activeTreatmentId, setActiveTreatmentId] = useState(DITHER_TREATMENTS[0].id);

  const activeSubject = SAMPLE_SUBJECTS.find(s => s.slug === activeSubjectSlug) ?? SAMPLE_SUBJECTS[0];
  const activeTreatment = DITHER_TREATMENTS.find(tr => tr.id === activeTreatmentId) ?? DITHER_TREATMENTS[0];

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => onImageLoad(img);
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [onImageLoad]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const openFilePicker = () => fileInputRef.current?.click();

  return (
    <div
      className="w-full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />

      {/* ============================================================
          SECTION 1 · HERO SHOWREEL
          ============================================================ */}
      <section className="relative w-full min-h-[78vh] flex flex-col items-center justify-center overflow-hidden border-b border-bz-grid">
        {/* Showreel background image — cycles through 8 treatments */}
        <img
          src="/samples/hero copy.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover animate-showreel"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />

        {/* Vignette + scanline overlay */}
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(5,6,7,0.85) 0%, rgba(5,6,7,0.55) 25%, rgba(5,6,7,0.25) 50%, rgba(5,6,7,0.55) 100%)',
          }}
        />
        <div
          className="absolute inset-0 z-10 pointer-events-none mix-blend-overlay"
          style={{
            background:
              'repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0 1px, transparent 1px 2px)',
          }}
        />

        {/* Live badge — top-right */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 px-2.5 py-1.5 bg-bz-graphite/65 border border-bz-cyan font-mono-ui text-[10px] tracking-widest uppercase text-bz-cyan">
          <span className="w-1.5 h-1.5 bg-bz-cyan animate-signal-pulse" />
          {t('home.liveRender')}
        </div>

        {/* Centered text panel — readable backdrop */}
        <div
          className={`relative z-20 mx-6 max-w-2xl px-8 py-8 sm:px-10 sm:py-10 border flex flex-col items-center gap-5 text-center transition-colors duration-240 ${
            isDragging ? 'border-bz-cyan' : 'border-bz-grid hover:border-bz-system'
          }`}
          style={{
            background: 'rgba(5,6,7,0.55)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <span className="font-mono-ui text-[11px] tracking-[0.3em] uppercase text-bz-paper">
            {t('home.productLabel')}
          </span>

          <InkNoiseLockup size="xl" orient="vertical" color="var(--bz-paper)" />

          <p className="text-base sm:text-lg text-bz-paper leading-relaxed">
            {t('home.tagline')}
            <br />
            <span className="text-bz-interface">{t('home.subtagline')}</span>
          </p>

          {toolbar && <div className="pt-1">{toolbar}</div>}

          <div className="flex flex-col items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={openFilePicker}
              className={`inline-flex items-center gap-2.5 px-7 py-3.5 font-mono-ui text-xs tracking-[0.22em] uppercase font-medium transition-colors duration-240 border ${
                isDragging
                  ? 'bg-bz-cyan text-bz-graphite border-bz-cyan'
                  : 'bg-bz-paper text-bz-graphite border-bz-paper hover:bg-bz-cyan hover:border-bz-cyan'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              {isDragging ? t('home.release') : t('home.dropToBegin')}
            </button>
            <span className="font-mono-ui text-[10px] tracking-[0.3em] uppercase text-bz-system">
              {t('home.fileTypes')}
            </span>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 2 · ARGUMENTS / SCALE
          ============================================================ */}
      <section className="border-b border-bz-grid py-14 sm:py-16 px-4 sm:px-6">
        <div className="max-w-[1400px] mx-auto grid gap-10 md:grid-cols-[320px_1fr] items-center">
          <div className="flex flex-col gap-3">
            <span className="font-mono-ui text-[10px] tracking-[0.3em] uppercase text-bz-system">
              {t('home.scale.eyebrow')}
            </span>
            <div className="font-semibold text-5xl sm:text-6xl md:text-7xl leading-none tracking-[-0.04em] text-bz-paper">
              150,000<span className="text-bz-cyan">+</span>
            </div>
            <p className="text-sm text-bz-interface leading-relaxed max-w-[280px]">
              {t('home.scale.sub')}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { num: '25', nameKey: 'home.stats.algos.name',     descKey: 'home.stats.algos.desc' },
              { num: '8',  nameKey: 'home.stats.colors.name',    descKey: 'home.stats.colors.desc' },
              { num: '12', nameKey: 'home.stats.palettes.name',  descKey: 'home.stats.palettes.desc' },
              { num: '5',  nameKey: 'home.stats.modulations.name', descKey: 'home.stats.modulations.desc' },
            ].map((cell) => (
              <div key={cell.nameKey} className="panel p-5 flex flex-col gap-1.5">
                <span className="font-semibold text-4xl leading-none tracking-[-0.02em] text-bz-paper">{cell.num}</span>
                <span className="font-mono-ui text-[10px] tracking-[0.2em] uppercase text-bz-system">
                  {t(cell.nameKey)}
                </span>
                <p className="text-[11px] text-bz-interface leading-relaxed mt-1">
                  {t(cell.descKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3 · INTERACTIVE GALLERY (9 subjects × 8 treatments)
          ============================================================ */}
      <section className="py-12 px-4 sm:px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-wrap items-baseline gap-3 mb-5">
            <span className="font-mono-ui text-[10px] tracking-[0.3em] uppercase text-bz-system">
              {t('home.gallery.eyebrow')}
            </span>
            <span className="text-base font-medium text-bz-paper tracking-tight">
              {t('home.gallery.title')}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_320px] items-start">

            {/* Left column · preview + subject selector */}
            <div className="flex flex-col gap-2">
              {/* Main preview */}
              <div className="relative aspect-[4/3] bg-bz-deep border border-bz-grid overflow-hidden">
                <img
                  src={activeSubject.src}
                  alt={activeSubject.label}
                  className="w-full h-full object-cover transition-[filter] duration-500 ease-out"
                  style={{ filter: activeTreatment.filter }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }}
                />
                <div
                  className="absolute inset-0 pointer-events-none mix-blend-overlay"
                  style={{
                    background:
                      'repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0 1px, transparent 1px 2px)',
                  }}
                />
                <div className="absolute top-3 left-3 px-2.5 py-1.5 bg-bz-graphite/70 border border-bz-paper/10 font-mono-ui text-[10px] tracking-[0.2em] uppercase text-bz-paper">
                  <span className="text-bz-system">{t('home.gallery.render')}</span>
                  <span className="text-bz-cyan ml-2">{activeTreatment.name}</span>
                </div>
              </div>

              {/* Subject selector — 9 thumbs, responsive grid */}
              <div className="grid gap-1.5 grid-cols-3 sm:grid-cols-5 lg:grid-cols-9">
                {SAMPLE_SUBJECTS.map((subject, i) => (
                  <button
                    key={subject.slug}
                    type="button"
                    onClick={() => setActiveSubjectSlug(subject.slug)}
                    className={`relative aspect-[4/3] bg-bz-deep border overflow-hidden p-0 transition-colors duration-240 ${
                      activeSubjectSlug === subject.slug
                        ? 'border-bz-paper'
                        : 'border-bz-grid hover:border-bz-cyan'
                    }`}
                  >
                    <img
                      src={subject.src}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }}
                    />
                    <span
                      className={`absolute inset-x-0 bottom-0 px-1.5 py-1 font-mono-ui text-[8px] tracking-[0.18em] uppercase ${
                        activeSubjectSlug === subject.slug ? 'text-bz-cyan' : 'text-bz-paper'
                      }`}
                      style={{
                        background: 'linear-gradient(transparent, rgba(5,6,7,0.95))',
                      }}
                    >
                      {String(i + 1).padStart(2, '0')} · {subject.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Right column · 8 treatment thumbs */}
            <div className="grid grid-cols-2 gap-2">
              {DITHER_TREATMENTS.map((tr) => (
                <button
                  key={tr.id}
                  type="button"
                  onClick={() => setActiveTreatmentId(tr.id)}
                  onMouseEnter={() => setActiveTreatmentId(tr.id)}
                  className={`relative aspect-square bg-bz-deep border overflow-hidden p-0 transition-colors duration-240 ${
                    activeTreatmentId === tr.id
                      ? 'border-bz-paper'
                      : 'border-bz-grid hover:border-bz-cyan'
                  }`}
                >
                  <img
                    src={activeSubject.src}
                    alt=""
                    className="w-full h-full object-cover"
                    style={{ filter: tr.filter }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }}
                  />
                  <span
                    className="absolute inset-x-0 bottom-0 px-1.5 py-1 font-mono-ui text-[9px] tracking-[0.2em] uppercase text-bz-paper"
                    style={{
                      background: 'linear-gradient(transparent, rgba(5,6,7,0.95))',
                    }}
                  >
                    <span className="text-bz-system">{tr.num}</span> · {tr.short}
                  </span>
                </button>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ============================================================
          FOOTER · Bezier umbrella
          ============================================================ */}
      <div className="flex flex-col items-center gap-2 py-8 border-t border-bz-grid">
        <span className="font-mono-ui text-[10px] tracking-[0.3em] uppercase text-bz-system">
          {t('home.byBezier')}
        </span>
        <span className="font-mono-ui text-[9px] tracking-[0.3em] uppercase text-bz-grid">
          {t('home.footerTagline')}
        </span>
      </div>
    </div>
  );
}
