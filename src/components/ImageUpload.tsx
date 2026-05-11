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
  PostProd,
  InterfaceMock,
  BeforeAfter,
} from './marketing/MarketingSections';

interface ImageUploadProps {
  onImageLoad: (image: HTMLImageElement) => void;
  toolbar?: ReactNode;
  onSignInNeeded?: () => void;
}

export default function ImageUpload({ onImageLoad, toolbar, onSignInNeeded }: ImageUploadProps) {
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

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
          H1 with the "digital images." span split horizontally · top half
          paper, bottom half accent orange via linear-gradient + bg-clip.
          ============================================================ */}
      <section className="px-4 sm:px-6 pt-12 sm:pt-16 pb-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-1.5 h-1.5 bg-bz-cyan animate-signal-pulse" />
            <span className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system">
              {t('home.productLabel')}
            </span>
          </div>

          <h1
            className="font-display font-bold text-bz-paper"
            style={{
              fontSize: 'clamp(48px, 7.5vw, 96px)',
              lineHeight: 0.96,
              letterSpacing: '-0.035em',
              textWrap: 'balance',
            }}
          >
            Engineered texture<br />
            for{' '}
            <span
              style={{
                background: 'linear-gradient(180deg, var(--bz-paper) 60%, var(--bz-cyan) 60%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent',
              }}
            >
              digital images.
            </span>
          </h1>

          <p className="mt-6 max-w-[60ch] text-[16px] sm:text-[18px] leading-[1.5] text-bz-interface">
            A texture engine, not a filter. Drop a photo and combine{' '}
            <b className="text-bz-paper font-medium">25 algorithms × 8 color modes × 6 post-stacks</b>
            {' '}· over{' '}
            <b className="text-bz-paper font-medium">150,000 distinct texture recipes</b>
            , every one of them deterministic and reproducible.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-bz-grid hover:border-bz-cyan transition-colors duration-240 font-mono-ui text-[11px] tracking-[0.22em] uppercase text-bz-paper"
            >
              Watch demo · 90s
            </button>
            <span className="font-mono-ui text-[10px] tracking-[0.18em] uppercase text-bz-system">
              v0.9 · 100% in-browser · no upload · free to try
            </span>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 2 · DROP ZONE (full-bleed stripped pattern with
          centered dashed frame · per Claude Design redesign).
          ============================================================ */}
      <section className="px-4 sm:px-6 pb-12">
        <div className="max-w-[1400px] mx-auto">
          <div
            onClick={openFilePicker}
            className={`relative aspect-[16/9] border bg-bz-deep cursor-pointer overflow-hidden transition-colors duration-240 ${
              isDragging ? 'border-bz-cyan' : 'border-bz-grid'
            }`}
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(255,255,255,0.025) 0 10px, transparent 10px 20px)',
            }}
          >
            <div
              className={`absolute inset-6 sm:inset-12 border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-colors duration-240 ${
                isDragging ? 'border-bz-cyan' : 'border-bz-grid'
              }`}
            >
              <Upload className={`w-8 h-8 sm:w-10 sm:h-10 ${isDragging ? 'text-bz-cyan' : 'text-bz-paper'}`} />
              <h2 className="text-2xl sm:text-3xl md:text-[40px] font-bold text-bz-paper tracking-tight text-center px-4">
                {isDragging ? t('home.release') : t('home.dropToBegin')}
              </h2>
              <span className="font-mono-ui text-[11px] tracking-[0.22em] uppercase text-bz-system">
                {t('home.fileTypes')}
              </span>
              {toolbar && (
                <div className="mt-2" onClick={(e) => e.stopPropagation()}>
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
          04 PostProd · 05 InterfaceMock · 06 Workflow · 08 Ecosystem ·
          09 Pricing. Section 07 (Use cases) intentionally not rendered
          yet (no real customer proof to show).
          ============================================================ */}
      <BeforeAfter />
      <Manifesto />
      <Algorithms />
      <ColorModes />
      <PostProd />
      <InterfaceMock />
      <Workflow />
      <Ecosystem />
      <Pricing onSignInNeeded={onSignInNeeded ?? (() => undefined)} />

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
