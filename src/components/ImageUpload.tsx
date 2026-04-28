import { useState, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { InkNoiseLockup } from './brand';

interface ImageUploadProps {
  onImageLoad: (image: HTMLImageElement) => void;
}

export default function ImageUpload({ onImageLoad }: ImageUploadProps) {
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
      {/* Brand mark + tagline */}
      <div className="text-center space-y-4">
        <InkNoiseLockup size="xl" orient="vertical" className="justify-center" />
        <p className="text-base sm:text-lg text-bz-interface/80 tracking-wide max-w-xl mx-auto leading-relaxed pt-2">
          Engineered texture for digital images.
          <br />
          <span className="text-bz-system">A texture engine, not a filter.</span>
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
            <p className={`text-bz-body transition-colors duration-240 ${isDragging ? 'text-bz-cyan' : 'text-bz-paper'}`}>
              {isDragging ? 'Release to process' : 'Drop image to begin'}
            </p>
            <p className="text-bz-meta text-bz-system mt-1">
              or <span className="text-bz-paper underline underline-offset-2">browse files</span>
            </p>
          </div>
          <p className="text-[10px] font-mono-ui text-bz-system tracking-[0.3em]">PNG · JPG · GIF · WEBP</p>
        </div>
        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
      </label>

      {/* Module facts — 4 metadata cards */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { tag: '01', label: 'DITHER', desc: '25 algorithms · Floyd-Steinberg, Bayer, Halftone' },
          { tag: '02', label: 'HALFTONE', desc: 'Print logic · CMYK separation · DPI control' },
          { tag: '03', label: 'GRAIN', desc: 'Engineered grain · 35mm to digital · directional' },
          { tag: '04', label: 'CONTRAST', desc: 'Image stack control · output curves · banding' },
        ].map(({ tag, label, desc }) => (
          <div key={label} className="px-3 py-3 panel">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono-ui text-bz-system tracking-[0.2em]">{tag}</span>
              <span className="text-[9px] font-mono-ui text-bz-cyan tracking-[0.2em]">LIVE</span>
            </div>
            <p className="text-bz-label font-medium text-bz-interface tracking-wide">{label}</p>
            <p className="text-[10px] text-bz-system mt-1 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* Footer wordmark — Bezier umbrella */}
      <div className="flex flex-col items-center pt-6 gap-2">
        <span className="text-[10px] font-mono-ui text-bz-system tracking-[0.3em]">BY BEZIER</span>
        <span className="text-[9px] font-mono-ui text-bz-grid tracking-[0.3em]">RUNNING VISUAL CULTURE · MMXXVI</span>
      </div>
    </div>
  );
}
