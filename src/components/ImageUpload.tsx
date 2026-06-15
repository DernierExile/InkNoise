import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ImageIcon, Play, Upload } from 'lucide-react';
import { useT } from '../i18n/use-i18n';
import {
  BeforeAfter,
  Manifesto,
  Pricing,
  Workflow,
} from './marketing/MarketingSections';
import SiteFooter from './SiteFooter';
import { VideoModal } from './VideoModal';

interface ImageUploadProps {
  onImageLoad: (image: HTMLImageElement) => void;
  toolbar?: ReactNode;
  onSignInNeeded?: () => void;
}

const STARTER_SAMPLES = [
  { id: 'portrait', src: '/samples/02-portrait.jpg' },
  { id: 'food', src: '/samples/05-food.jpg' },
  { id: 'editorial', src: '/samples/09-editorial.jpg' },
  { id: 'object', src: '/samples/01-object.jpg' },
  { id: 'anime', src: '/samples/08-anime.jpg' },
  { id: 'urban', src: '/samples/07-urban.jpg' },
] as const;

export default function ImageUpload({ onImageLoad, toolbar, onSignInNeeded }: ImageUploadProps) {
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [sampleLoading, setSampleLoading] = useState<string | null>(null);

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const openFilePicker = () => fileInputRef.current?.click();

  const loadSampleImage = useCallback((src: string, id?: string) => {
    setSampleLoading(id ?? src);
    const img = new Image();
    img.onload = () => {
      setSampleLoading(null);
      onImageLoad(img);
    };
    img.onerror = () => setSampleLoading(null);
    img.src = src;
  }, [onImageLoad]);

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

      <section className="px-4 sm:px-6 pt-8 sm:pt-10 pb-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] gap-5 lg:gap-7 items-stretch">
            <div className="flex flex-col justify-center py-3 lg:py-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-1.5 h-1.5 bg-bz-cyan animate-signal-pulse" />
                <span className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-bz-system">
                  {t('home.productLabel')}
                </span>
              </div>

              <h1
                className="font-display font-bold text-bz-paper"
                style={{
                  fontSize: 'clamp(38px, 6vw, 78px)',
                  lineHeight: 0.96,
                  letterSpacing: '-0.03em',
                  textWrap: 'balance',
                }}
              >
                {t('home.uploadHero.titleLine1')}<br />
                {t('home.uploadHero.titleLine2')}{' '}
                <span
                  style={{
                    background: 'linear-gradient(180deg, var(--bz-paper) 58%, var(--bz-cyan) 58%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    color: 'transparent',
                  }}
                >
                  {t('home.uploadHero.titleHighlight')}
                </span>
              </h1>

              <p className="mt-5 max-w-[58ch] text-[15px] sm:text-[17px] leading-[1.55] text-bz-interface">
                {t('home.uploadHero.body')}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="inline-flex items-center gap-2 px-4 py-3 border border-bz-cyan bg-bz-cyan text-bz-graphite hover:bg-bz-paper transition-colors duration-240 font-mono-ui text-[11px] tracking-[0.18em] uppercase font-bold"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {t('home.uploadHero.chooseImage')}
                </button>
                <button
                  type="button"
                  onClick={() => setDemoOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-3 border border-bz-grid hover:border-bz-cyan transition-colors duration-240 font-mono-ui text-[11px] tracking-[0.18em] uppercase text-bz-paper"
                >
                  <Play className="w-3.5 h-3.5" />
                  {t('home.hero.watchDemo')}
                </button>
                <span className="font-mono-ui text-[10px] tracking-[0.18em] uppercase text-bz-system">
                  {t('home.hero.meta')}
                </span>
              </div>

              <div className="mt-7 grid grid-cols-3 gap-2 max-w-[560px]">
                {['localRender', 'livePreview', 'recipeJson'].map((item) => (
                  <div key={item} className="border border-bz-grid bg-bz-deep px-3 py-3">
                    <span className="font-mono-ui text-[9px] tracking-[0.18em] uppercase text-bz-system">
                      {t(`home.uploadHero.features.${item}`)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              onClick={openFilePicker}
              className={`relative min-h-[360px] sm:min-h-[420px] border bg-bz-deep cursor-pointer overflow-hidden transition-colors duration-240 ${
                isDragging ? 'border-bz-cyan' : 'border-bz-grid'
              }`}
              style={{
                backgroundImage:
                  'linear-gradient(rgba(0,213,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,213,255,0.06) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            >
              <div
                className={`absolute inset-4 sm:inset-6 border-2 border-dashed flex flex-col items-center justify-center gap-3 text-center transition-colors duration-240 ${
                  isDragging ? 'border-bz-cyan' : 'border-bz-grid'
                }`}
              >
                <div className="w-14 h-14 border border-bz-grid bg-bz-graphite flex items-center justify-center">
                  <Upload className={`w-7 h-7 ${isDragging ? 'text-bz-cyan' : 'text-bz-paper'}`} />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-bz-paper tracking-tight px-4">
                  {isDragging ? t('home.release') : t('home.dropToBegin')}
                </h2>
                <p className="max-w-[34ch] text-[13px] leading-relaxed text-bz-interface px-4">
                  {t('home.uploadHero.dropHint')}
                </p>
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

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {STARTER_SAMPLES.map((sample) => (
              <button
                key={sample.src}
                type="button"
                onClick={() => loadSampleImage(sample.src, sample.id)}
                className="group relative min-h-[128px] border border-bz-grid bg-bz-deep overflow-hidden text-left hover:border-bz-cyan transition-colors duration-240"
                aria-label={t('home.starterSamples.tryAria', { label: t(`home.starterSamples.${sample.id}.label`) })}
              >
                <img
                  src={sample.src}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-55 group-hover:opacity-75 transition-opacity duration-240"
                  loading="lazy"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-bz-graphite via-bz-graphite/50 to-transparent" />
                <span className="relative z-10 flex h-full min-h-[128px] flex-col justify-between p-3">
                  <span className="inline-flex w-fit items-center gap-1.5 font-mono-ui text-[9px] tracking-[0.18em] uppercase text-bz-cyan bg-bz-graphite/75 border border-bz-grid px-2 py-1">
                    <ImageIcon className="w-3 h-3" />
                    {t('home.starterSamples.trySample')}
                  </span>
                  <span>
                    <span className="block text-bz-paper font-medium leading-tight">{t(`home.starterSamples.${sample.id}.label`)}</span>
                    <span className="block mt-1 text-[11px] leading-snug text-bz-interface">{t(`home.starterSamples.${sample.id}.hint`)}</span>
                  </span>
                  {sampleLoading === sample.id && (
                    <span className="absolute inset-0 bg-bz-graphite/80 flex items-center justify-center font-mono-ui text-[10px] tracking-[0.2em] uppercase text-bz-cyan">
                      {t('common.loading')}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <BeforeAfter />
      <Workflow />
      <Pricing onSignInNeeded={onSignInNeeded ?? (() => undefined)} />
      <Manifesto />

      <SiteFooter />
      <VideoModal videoId="OI-fWfuSjjY" open={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
}
