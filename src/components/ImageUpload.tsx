import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Upload } from 'lucide-react';
import { useT } from '../i18n/use-i18n';
import {
  Manifesto,
  Workflow,
  Ecosystem,
  Pricing,
  Algorithms,
  ColorModes,
  BeforeAfter,
  ProductionPack,
} from './marketing/MarketingSections';
import SiteFooter from './SiteFooter';
import { VideoModal } from './VideoModal';

interface ImageUploadProps {
  onImageLoad: (image: HTMLImageElement) => void;
  toolbar?: ReactNode;
  onSignInNeeded?: () => void;
}

export default function ImageUpload({ onImageLoad, toolbar, onSignInNeeded }: ImageUploadProps) {
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

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
          SECTION 1 · HERO (text-first per Claude Design redesign)
          All copy is localized via the home.hero.* keys (EN/FR/JA/ZH).
          ============================================================ */}
      <section className="px-4 sm:px-6 pt-10 sm:pt-14 pb-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-1.5 h-1.5 bg-bz-cyan animate-signal-pulse" />
            <span className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system">
              {t('home.productLabel')}
            </span>
          </div>

          <h1
            className="font-display font-bold text-bz-paper"
            style={{
              fontSize: 'clamp(40px, 6.5vw, 84px)',
              lineHeight: 0.96,
              letterSpacing: '-0.035em',
              textWrap: 'balance',
            }}
          >
            {t('home.hero.h1Part1')}<br />
            {t('home.hero.h1Part2') && <span>{t('home.hero.h1Part2')}{' '}</span>}
            <span
              style={{
                background: 'linear-gradient(180deg, var(--bz-paper) 60%, var(--bz-cyan) 60%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent',
              }}
            >
              {t('home.hero.h1Highlight')}
            </span>
          </h1>

          <p className="mt-5 max-w-[60ch] text-[15px] sm:text-[17px] leading-[1.5] text-bz-interface">
            {t('home.hero.subPart1')}
            <b className="text-bz-paper font-medium">{t('home.hero.subBold1')}</b>
            {t('home.hero.subPart2')}
            <b className="text-bz-paper font-medium">{t('home.hero.subBold2')}</b>
            {t('home.hero.subPart3')}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => setDemoOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-bz-grid hover:border-bz-cyan transition-colors duration-240 font-mono-ui text-[11px] tracking-[0.22em] uppercase text-bz-paper"
            >
              {t('home.hero.watchDemo')}
            </button>
            <span className="font-mono-ui text-[10px] tracking-[0.18em] uppercase text-bz-system">
              {t('home.hero.meta')}
            </span>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 2 · DROP ZONE (compact · fits with BeforeAfter on
          first scroll). Height capped so the live demo appears just
          below without scrolling beyond first viewport.
          ============================================================ */}
      <section className="px-4 sm:px-6 pb-6">
        <div className="max-w-[1400px] mx-auto">
          <div
            onClick={openFilePicker}
            className={`relative h-[220px] sm:h-[260px] border bg-bz-deep cursor-pointer overflow-hidden transition-colors duration-240 ${
              isDragging ? 'border-bz-cyan' : 'border-bz-grid'
            }`}
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(255,255,255,0.025) 0 10px, transparent 10px 20px)',
            }}
          >
            <div
              className={`absolute inset-4 sm:inset-6 border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors duration-240 ${
                isDragging ? 'border-bz-cyan' : 'border-bz-grid'
              }`}
            >
              <Upload className={`w-6 h-6 sm:w-7 sm:h-7 ${isDragging ? 'text-bz-cyan' : 'text-bz-paper'}`} />
              <h2 className="text-xl sm:text-2xl font-bold text-bz-paper tracking-tight text-center px-4">
                {isDragging ? t('home.release') : t('home.dropToBegin')}
              </h2>
              <span className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system">
                {t('home.fileTypes')}
              </span>
              {toolbar && (
                <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                  {toolbar}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          MARKETING SECTIONS · from Claude Design redesign
          BeforeAfter · 01 Manifesto · 02 Algorithms · 03 Color modes ·
          06 Workflow · 08 Ecosystem · 09 Pricing.
          Sections 04 PostProd and 05 InterfaceMock are intentionally
          NOT rendered (removed per user feedback 2026-05-12).
          Section 07 UseCases also disabled (no real customer proof yet).
          All these components remain exported from MarketingSections.tsx
          for future reactivation.
          ============================================================ */}
      <BeforeAfter />
      <Manifesto />
      <Algorithms />
      <ColorModes />
      <Workflow />
      <ProductionPack />
      <Ecosystem />
      <Pricing onSignInNeeded={onSignInNeeded ?? (() => undefined)} />

      <SiteFooter />
      <VideoModal videoId="OI-fWfuSjjY" open={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
}
