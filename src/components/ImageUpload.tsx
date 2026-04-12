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
    <div className="w-full space-y-6">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-2xl overflow-hidden border border-[#00ff41]/15 shadow-lg shadow-[#00ff41]/5">
            <img
              src="/spashInkNoise.png"
              alt="InkNoise"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        <div>
          <h1 className="text-xl font-bold text-white/90 tracking-wide">InkNoise</h1>
          <p className="text-[11px] text-white/25 font-mono-ui tracking-wider mt-1">PROFESSIONAL IMAGE DITHERING</p>
        </div>
      </div>

      <label
        className={`flex flex-col items-center justify-center w-full h-48 rounded-lg cursor-pointer transition-all duration-200 border ${
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
          <div key={label} className="px-3 py-2.5 rounded-md bg-white/[0.015] border border-white/[0.03]">
            <p className="text-[10px] font-medium text-white/45">{label}</p>
            <p className="text-[9px] text-white/15 mt-0.5">{desc}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-center pt-4">
        <img
          src="/BEZIER200x200.png"
          alt="Bezier"
          className="h-14 opacity-25 hover:opacity-45 transition-opacity"
        />
      </div>
    </div>
  );
}
