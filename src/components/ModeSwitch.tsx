import { Layers } from 'lucide-react';
import { useT } from '../i18n/use-i18n';

export type AppMode = 'single' | 'batch';

interface ModeSwitchProps {
  mode: AppMode;
  isPro: boolean;
  onChange: (mode: AppMode) => void;
}

export default function ModeSwitch({ mode, isPro, onChange }: ModeSwitchProps) {
  const t = useT();
  return (
    <div className="inline-flex border border-bz-grid bg-bz-deep">
      <button
        type="button"
        onClick={() => onChange('single')}
        className={`px-4 py-1.5 text-[10px] font-mono-ui tracking-widest uppercase transition-colors duration-240 ${
          mode === 'single' ? 'text-bz-paper bg-bz-graphite' : 'text-bz-system hover:text-bz-paper'
        }`}
      >
        {t('mode.single')}
      </button>
      <button
        type="button"
        onClick={() => onChange('batch')}
        className={`flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-mono-ui tracking-widest uppercase transition-colors duration-240 ${
          mode === 'batch' ? 'text-bz-paper bg-bz-graphite' : 'text-bz-system hover:text-bz-paper'
        }`}
      >
        <Layers className="w-3 h-3" />
        {t('mode.batch')}
        {!isPro && <span className="text-bz-cyan text-[9px]">PRO</span>}
      </button>
    </div>
  );
}
