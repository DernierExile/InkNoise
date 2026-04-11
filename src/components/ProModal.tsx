import { X, Sparkles } from 'lucide-react';

interface ProModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProModal({ isOpen, onClose }: ProModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative panel rounded-lg p-6 max-w-sm w-full shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/20 hover:text-white/50 transition-colors">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-5">
          <Sparkles className="w-4 h-4 text-[#00ff41]/60" />
          <h2 className="text-sm font-bold text-white/80 tracking-wide">InkNoise Pro</h2>
          <span className="text-[8px] font-mono-ui text-white/20 tracking-widest border border-white/[0.06] px-1.5 py-0.5 rounded">COMING SOON</span>
        </div>

        <p className="text-[11px] text-white/40 leading-relaxed mb-4">
          The current version is free and will remain free. A Pro version with advanced features is in development:
        </p>

        <div className="space-y-2 mb-5">
          {['Saved and shareable presets', 'Batch export', 'Watermark removal', 'Unlimited custom palettes', 'High-resolution export'].map((f) => (
            <div key={f} className="flex items-center gap-2 text-[10px] text-white/30">
              <div className="w-1 h-1 rounded-full bg-[#00ff41]/40" />
              {f}
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full px-3 py-2 text-[10px] font-mono-ui text-white/30 border border-white/[0.06] rounded-md hover:border-white/[0.12] hover:text-white/50 transition-all tracking-wider"
        >
          CLOSE
        </button>
      </div>
    </div>
  );
}
