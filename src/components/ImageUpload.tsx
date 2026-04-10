import { useState, useCallback } from 'react';
import { Upload, Zap, Layers, Palette, Download } from 'lucide-react';

interface ImageUploadProps {
  onImageLoad: (image: HTMLImageElement) => void;
}

const features = [
  { icon: Zap, label: '25+ Algorithms', desc: 'Floyd-Steinberg, Bayer, Halftone & more' },
  { icon: Layers, label: 'Real-time Preview', desc: 'Instant comparison slider' },
  { icon: Palette, label: 'Custom Palettes', desc: 'Mono, indexed & full color modes' },
  { icon: Download, label: 'Multiple Formats', desc: 'Export PNG, JPG or WebP' },
];

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

  return (
    <div className="w-full space-y-6">
      <div className="text-center">
        <p className="text-[#00ffff]/60 text-sm">Transform any image into stunning dithered artwork</p>
      </div>

      <label
        className={`upload-zone flex flex-col items-center justify-center w-full h-56 rounded-xl cursor-pointer transition-all duration-300 border-2 border-dashed ${
          isDragging
            ? 'border-[#00ff41] bg-[#00ff41]/10 scale-[1.01] glow-green'
            : 'border-[#00ff41]/35 bg-[#0f1f18]/40 hover:border-[#00ff41]/70 hover:bg-[#00ff41]/5 hover:glow-green'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-3 pointer-events-none px-6 text-center">
          <div className={`p-4 rounded-full border-2 transition-all duration-300 ${
            isDragging
              ? 'border-[#00ff41] bg-[#00ff41]/20'
              : 'border-[#00ff41]/25 bg-[#00ff41]/5'
          }`}>
            <Upload className={`w-7 h-7 transition-colors duration-300 ${
              isDragging ? 'text-[#00ff41]' : 'text-[#00ff41]/65'
            }`} />
          </div>
          <div>
            <p className="text-[#00ffff] font-semibold text-sm">
              {isDragging ? 'Release to process' : 'Drop image here'}
            </p>
            <p className="text-[#00ff41]/50 text-xs mt-1">
              or <span className="text-[#00ff41]/75 underline underline-offset-2">browse files</span>
            </p>
            <p className="text-[#00ff41]/30 text-xs mt-2">PNG · JPG · GIF · WebP · up to 10MB</p>
          </div>
        </div>
        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
      </label>

      <div className="grid grid-cols-2 gap-2.5">
        {features.map(({ icon: Icon, label, desc }) => (
          <div
            key={label}
            className="flex items-start gap-2.5 p-3 rounded-lg bg-[#0f1f18]/60 border border-[#00ff41]/10 hover:border-[#00ff41]/25 transition-colors"
          >
            <div className="p-1.5 rounded bg-[#00ff41]/10 flex-shrink-0 mt-0.5">
              <Icon className="w-3.5 h-3.5 text-[#00ff41]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#00ffff]">{label}</p>
              <p className="text-xs text-[#00ff41]/45 mt-0.5 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
