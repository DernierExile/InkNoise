import { useState, useCallback } from 'react';
import { Upload } from 'lucide-react';

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
    <div className="w-full space-y-8 relative">
      <div className="text-center space-y-3">
        <h1 className="text-7xl sm:text-8xl font-normal text-white/90 tracking-wide leading-none" style={{ fontFamily: "'Bodoni Moda', serif" }}>
          InkNoise 2.1
        </h1>
        <p className="text-lg sm:text-xl text-white/25 italic tracking-wide" style={{ fontFamily: "'Bodoni Moda', serif" }}>
          Professional Image Dithering
        </p>
      </div>

      <label
        className={`flex flex-col items-center justify-center w-full h-48 rounded-lg cursor-pointer transition-all duration-200 border backdrop-blur-sm ${
          isDragging
            ? 'border-[#00ff41]/40 bg-[#00ff41]/[0.04]'
            : 'border-white/[0.06] bg-white/[0.01] hover:border-[#00ff41]/20 hover:bg-[#00ff41]/[0.02]'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-3 pointer-events-none">
          <div className={`p-3 rounded-md border transition-all duration-200 ${
            isDragging
              ? 'border-[#00ff41]/30 bg-[#00ff41]/10'
              : 'border-white/[0.06] bg-white/[0.02]'
          }`}>
            <Upload className={`w-5 h-5 transition-colors duration-200 ${
              isDragging ? 'text-[#00ff41]' : 'text-white/20'
            }`} />
          </div>
          <div className="text-center">
            <p className={`text-xs transition-colors ${isDragging ? 'text-[#00ff41]/80' : 'text-white/40'}`}>
              {isDragging ? 'Release to process' : 'Drop image here'}
            </p>
            <p className="text-[10px] text-white/20 mt-1">
              or <span className="text-white/30 underline underline-offset-2">browse files</span>
            </p>
          </div>
          <p className="text-[9px] font-mono-ui text-white/12 tracking-wider">PNG / JPG / GIF / WEBP</p>
        </div>
        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
      </label>

      <div className="grid grid-cols-2 gap-2">
        {[
          { label: '25+ Algorithms', desc: 'Floyd-Steinberg, Bayer, Halftone' },
          { label: 'Real-time Preview', desc: 'Instant comparison slider' },
          { label: 'Color Modes', desc: 'Mono, duo-tone, tri-tone, tonal' },
          { label: 'Post-Processing', desc: 'CRT, scanlines, chromatic, bloom' },
        ].map(({ label, desc }) => (
          <div key={label} className="px-3 py-2.5 rounded-md bg-white/[0.015] border border-white/[0.03] backdrop-blur-sm">
            <p className="text-[10px] font-medium text-white/45">{label}</p>
            <p className="text-[9px] text-white/15 mt-0.5">{desc}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-center pt-4">
        <img
          src="/BEZIER200x200.png"
          alt="Bezier"
          className="w-[120px] opacity-25 hover:opacity-45 transition-opacity"
        />
      </div>
    </div>
  );
}
