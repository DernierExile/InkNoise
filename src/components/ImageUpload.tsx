import { Upload } from 'lucide-react';

interface ImageUploadProps {
  onImageLoad: (image: HTMLImageElement) => void;
}

export default function ImageUpload({ onImageLoad }: ImageUploadProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        onImageLoad(img);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full">
      <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-[#00ff41]/50 rounded-lg cursor-pointer bg-[#0f1f18]/30 hover:border-[#00ff41] hover:glow-green transition-all backdrop-blur-sm">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <Upload className="w-12 h-12 mb-4 text-[#00ff41] opacity-80" />
          <p className="mb-2 text-sm text-[#00ffff]">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-[#00ff41]/60">PNG, JPG, GIF up to 10MB</p>
        </div>
        <input
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
}
