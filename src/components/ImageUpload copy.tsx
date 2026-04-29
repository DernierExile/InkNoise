import { useState, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { InkNoiseLockup } from './brand';
import { useT } from '../i18n/use-i18n';

interface ImageUploadProps {
  onImageLoad: (image: HTMLImageElement) => void;
}

const MODULES: { tag: string; titleKey: string; descKey: string }[] = [
  { tag: '01', titleKey: 'module.dither.title', descKey: 'module.dither.desc' },
  { tag: '02', titleKey: 'module.halftone.title', descKey: 'module.halftone.desc' },
  { tag: '03', titleKey: 'module.grain.title', descKey: 'module.grain.desc' },
  { tag: '04', titleKey: 'module.contrast.title', descKey: 'module.contrast.desc' },
];

export default function ImageUpload({ onImageLoad }: ImageUploadProps) {
  const t = useT();
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
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="w-full space-y-10 relative">
      {/* Brand mark + tagline — InkNoise lockup with halftone "Noise" */}
      <div className="text-center space-y-5">
        <div className="flex items-center justify-center gap-3">
          <span className="text-[11px] font-mono-ui text-bz-system tracking-[0.3em] uppercase">
            {t('home.productLabel')}
          </span>
        </div>
        <div className="flex justify-center">
          <InkNoiseLockup size="xl" orient="vertical" color="var(--bz-paper)" />
        </div>
        <p className="text-base sm:text-lg text-bz-interface/80 tracking-wide max-w-xl mx-auto leading-relaxed">
          {t('home.tagline')}
          <br />
          <span className="text-bz-system">{t('home.subtagline')}</span>
        </p>
      </div>

      {/* Upload zone — square corners, hairline border */}
      <label
        className={`flex flex-col items-center justify-center w-full h-52 cursor-pointer transition-colors duration-240 border ${
          isDragging
            ? 'border-bz-cyan bg-bz-deep'
            : 'border-bz-grid bg-bz-deep/60 hover:border-bz-system'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-3 pointer-events-none">
          <div className={`p-3 border transition-colors duration-240 ${
            isDragging
              ? 'border-bz-cyan bg-bz-cyan/10'
              : 'border-bz-grid bg-bz-graphite'
          }`}>
            <Upload className={`w-5 h-5 transition-colors duration-240 ${
              isDragging ? 'text-bz-cyan' : 'text-bz-system'
            }`} />
          </div>
          <div className="text-center">
            <p className={`text-bz-body transition-colors duration-240 ${isDragging ? 'text-bz-cyan' : 'text-bz-interface'}`}>
              {isDragging ? t('home.release') : t('home.dropToBegin')}
            </p>
            <p className="text-bz-meta text-bz-system mt-1">
              {t('home.orBrowse')}{' '}
              <span className="text-bz-interface underline underline-offset-2">{t('home.browseFiles')}</span>
            </p>
          </div>
          <p className="text-[10px] font-mono-ui text-bz-system tracking-[0.3em]">{t('home.fileTypes')}</p>
        </div>
        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
      </label>

      {/* Module facts — 4 metadata cards */}
      <div className="grid grid-cols-2 gap-2">
        {MODULES.map(({ tag, titleKey, descKey }) => (
          <div key={tag} className="px-3 py-3 panel">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono-ui text-bz-system tracking-[0.2em]">{tag}</span>
              <span className="text-[9px] font-mono-ui text-bz-cyan tracking-[0.2em] uppercase">{t('module.live')}</span>
            </div>
            <p className="text-bz-label font-medium text-bz-paper tracking-wide uppercase">{t(titleKey)}</p>
            <p className="text-[10px] text-bz-system mt-1 leading-relaxed">{t(descKey)}</p>
          </div>
        ))}
      </div>

      {/* Footer wordmark — Bezier umbrella */}
      <div className="flex flex-col items-center pt-6 gap-2">
        <span className="text-[10px] font-mono-ui text-bz-system tracking-[0.3em] uppercase">{t('home.byBezier')}</span>
        <span className="text-[9px] font-mono-ui text-bz-grid tracking-[0.3em] uppercase">{t('home.footerTagline')}</span>
      </div>
    </div>
  );
}
