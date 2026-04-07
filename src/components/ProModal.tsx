import { X, Sparkles } from 'lucide-react';

interface ProModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProModal({ isOpen, onClose }: ProModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0a1a12] border-2 border-[#00ff41]/60 rounded-xl p-6 max-w-md w-full shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#00ff41]/60 hover:text-[#00ff41] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6 text-[#00ffff]" />
          <h2 className="text-xl font-bold text-[#00ff41] tracking-wider">
            InkNoise Pro arrive bientot
          </h2>
        </div>

        <p className="text-[#00ffff]/80 text-sm leading-relaxed mb-3">
          La version actuelle d'InkNoise est entierement gratuite et le restera.
        </p>

        <p className="text-[#00ffff]/80 text-sm leading-relaxed mb-5">
          Une version Pro avec des fonctions avancees est en preparation :
        </p>

        <ul className="text-[#00ff41]/80 text-sm space-y-2 mb-6 pl-4">
          <li className="flex items-start gap-2">
            <span className="text-[#00ffff] mt-0.5">-</span>
            Presets enregistres et partageables
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#00ffff] mt-0.5">-</span>
            Export par lot (batch)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#00ffff] mt-0.5">-</span>
            Suppression du watermark
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#00ffff] mt-0.5">-</span>
            Palettes personnalisees illimitees
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#00ffff] mt-0.5">-</span>
            Export haute resolution sans limite
          </li>
        </ul>

        <button
          onClick={onClose}
          className="w-full px-4 py-3 bg-[#0f1f18] text-[#00ff41] border-2 border-[#00ff41]/50 rounded-lg hover:border-[#00ff41] hover:glow-green transition-all font-semibold"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
