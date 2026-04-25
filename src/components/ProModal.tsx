import { X } from 'lucide-react';

interface ProModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tier = {
  id: 'monthly' | 'annual' | 'lifetime';
  name: string;
  price: string;
  period: string;
  tag?: string;
  features: string[];
  cta: string;
  highlight?: boolean;
};

const TIERS: Tier[] = [
  {
    id: 'monthly',
    name: 'STUDIO',
    price: '€12',
    period: '/ MONTH',
    features: [
      'No watermark',
      '4K export',
      'Batch processing',
      'Save presets',
      'All palettes unlocked',
    ],
    cta: 'START MONTHLY',
  },
  {
    id: 'annual',
    name: 'STUDIO',
    price: '€69',
    period: '/ YEAR',
    tag: 'SAVE 52%',
    features: [
      'Everything in monthly',
      'Equivalent €5,75/mo',
      'Priority support',
    ],
    cta: 'START ANNUAL',
    highlight: true,
  },
  {
    id: 'lifetime',
    name: 'FOUNDER',
    price: '€79',
    period: 'LIFETIME',
    tag: '500 SEATS',
    features: [
      'InkNoise + OUTLINE for life',
      'All future v1.x updates',
      'Early access to next modules',
      'Founder badge',
    ],
    cta: 'CLAIM FOUNDER SEAT',
  },
];

export default function ProModal({ isOpen, onClose }: ProModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-bz-graphite/85 backdrop-blur-sm" onClick={onClose} />
      <div className="relative panel p-7 max-w-3xl w-full my-8">
        <button onClick={onClose} className="absolute top-4 right-4 text-bz-system hover:text-bz-paper transition-colors duration-240">
          <X className="w-4 h-4" />
        </button>

        <div className="mb-7">
          <div className="text-[10px] font-mono-ui text-bz-system tracking-[0.3em] mb-3">ACCESS · BEZIER ONE</div>
          <h2 className="text-bz-h3 font-medium text-bz-interface tracking-tight leading-tight">
            Single access. Every module.
          </h2>
          <p className="text-[12px] text-bz-paper/70 leading-relaxed mt-3 max-w-xl">
            One subscription unlocks every BEZIER product, every output engine, every visual workflow — under one access layer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-5">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`relative p-5 border transition-colors duration-240 ${
                tier.highlight
                  ? 'bg-bz-deep border-bz-cyan'
                  : 'bg-bz-graphite border-bz-grid hover:border-bz-system'
              }`}
            >
              {tier.tag && (
                <div className="absolute -top-2 left-3">
                  <span className={`px-1.5 py-0.5 text-[8px] font-mono-ui tracking-[0.2em] ${
                    tier.highlight ? 'bg-bz-cyan text-bz-graphite' : 'bg-bz-grid text-bz-cyan'
                  }`}>
                    {tier.tag}
                  </span>
                </div>
              )}

              <div className="text-[10px] font-mono-ui text-bz-system tracking-[0.3em] mb-3">{tier.name}</div>

              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-bz-h3 font-medium text-bz-interface tracking-tight leading-none">
                  {tier.price}
                </span>
              </div>
              <div className="text-[10px] font-mono-ui text-bz-system tracking-widest mb-5">{tier.period}</div>

              <ul className="space-y-2 mb-6">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[11px] text-bz-paper leading-relaxed">
                    <span className="text-bz-cyan mt-0.5">+</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-2.5 text-[10px] font-mono-ui tracking-widest transition-colors duration-240 ${
                  tier.highlight
                    ? 'bg-bz-cyan text-bz-graphite font-semibold hover:bg-bz-cyan/90'
                    : 'border border-bz-grid text-bz-paper hover:border-bz-cyan hover:text-bz-cyan'
                }`}
                onClick={onClose}
                disabled
              >
                {tier.cta}
              </button>
              <div className="text-[8px] font-mono-ui text-bz-system tracking-widest text-center mt-2">CHECKOUT · COMING SOON</div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-bz-grid">
          <span className="text-[9px] font-mono-ui text-bz-system tracking-[0.2em]">
            BEZIER ONE · ENTER ECOSYSTEM
          </span>
          <button
            onClick={onClose}
            className="text-[10px] font-mono-ui text-bz-system hover:text-bz-paper transition-colors duration-240 tracking-widest"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
