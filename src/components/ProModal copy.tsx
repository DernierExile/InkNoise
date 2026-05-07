// =============================================================================
// ProModal — BEZIER ONE access tiers with live Stripe checkout.
// If user is not authenticated, prompts AuthModal first.
// i18n-aware.
// =============================================================================

import { useState } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/use-auth';
import { useT } from '../i18n/use-i18n';
import { getTierConfig, redirectToCheckout, type CheckoutTierId } from '../lib/stripe';
import AuthModal from './AuthModal';

interface ProModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TierUI = {
  id: CheckoutTierId;
  nameKey: string;
  price: string;
  periodKey: string;
  tagKey?: string;
  features: string[];
  ctaKey: string;
  highlight?: boolean;
};

const TIERS: TierUI[] = [
  {
    id: 'monthly',
    nameKey: 'access.tierStudio',
    price: '€12',
    periodKey: 'access.perMonth',
    features: [
      'access.feature.noWatermark',
      'access.feature.fourKExport',
      'access.feature.batchProcessing',
      'access.feature.savePresets',
      'access.feature.allPalettes',
    ],
    ctaKey: 'access.cta.monthly',
  },
  {
    id: 'annual',
    nameKey: 'access.tierStudio',
    price: '€69',
    periodKey: 'access.perYear',
    tagKey: 'access.tagSave52',
    features: [
      'access.feature.everythingMonthly',
      'access.feature.equivalent',
      'access.feature.prioritySupport',
    ],
    ctaKey: 'access.cta.annual',
    highlight: true,
  },
  {
    id: 'lifetime',
    nameKey: 'access.tierFounder',
    price: '€79',
    periodKey: 'access.lifetime',
    tagKey: 'access.tag500Seats',
    features: [
      'access.feature.lifetimeBundle',
      'access.feature.futureUpdates',
      'access.feature.earlyAccess',
      'access.feature.founderBadge',
    ],
    ctaKey: 'access.cta.lifetime',
  },
];

export default function ProModal({ isOpen, onClose }: ProModalProps) {
  const t = useT();
  const { session, plan } = useAuth();
  const [pendingTier, setPendingTier] = useState<CheckoutTierId | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authForTier, setAuthForTier] = useState<CheckoutTierId | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const tierConfig = getTierConfig();

  const handleTierClick = async (tierId: CheckoutTierId) => {
    setError(null);
    if (!session) {
      setAuthForTier(tierId);
      setShowAuth(true);
      return;
    }
    await launchCheckout(tierId);
  };

  const launchCheckout = async (tierId: CheckoutTierId) => {
    const tier = tierConfig[tierId];
    if (!tier.priceId) {
      setError(t('access.error.missingPriceId'));
      return;
    }
    setPendingTier(tierId);
    try {
      await redirectToCheckout(tier);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Checkout failed';
      setError(humanizeCheckoutError(message, t));
      setPendingTier(null);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuth(false);
    if (authForTier) {
      const id = authForTier;
      setAuthForTier(null);
      setTimeout(() => launchCheckout(id), 200);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 overflow-y-auto">
        <div
          className="absolute inset-0 bg-bz-graphite/85 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="relative panel p-7 max-w-3xl w-full my-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-bz-system hover:text-bz-paper transition-colors duration-240"
            aria-label={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>

          <div className="mb-7">
            <div className="text-[10px] font-mono-ui text-bz-system tracking-[0.3em] mb-3 uppercase">
              {t('access.eyebrow')}
            </div>
            <h2 className="text-bz-h3 font-medium text-bz-paper tracking-tight leading-tight">
              {t('access.title')}
            </h2>
            <p className="text-[12px] text-bz-interface/80 leading-relaxed mt-3 max-w-xl">
              {t('access.subtitle')}
            </p>
            {plan !== 'free' && (
              <div className="mt-4 inline-flex items-center gap-2 px-2 py-1 border border-bz-cyan bg-bz-cyan/10">
                <span className="text-[9px] font-mono-ui text-bz-cyan tracking-widest uppercase">
                  {plan === 'founder' ? t('access.founderActive') : t('access.studioActive')}
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 px-3 py-2 border border-bz-violet bg-bz-deep">
              <AlertCircle className="w-3.5 h-3.5 text-bz-violet flex-shrink-0 mt-0.5" />
              <span className="text-[11px] text-bz-paper leading-relaxed">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-5">
            {TIERS.map((tier) => {
              const isPending = pendingTier === tier.id;
              return (
                <div
                  key={tier.id}
                  className={`relative p-5 border transition-colors duration-240 ${
                    tier.highlight
                      ? 'bg-bz-deep border-bz-cyan'
                      : 'bg-bz-graphite border-bz-grid hover:border-bz-system'
                  }`}
                >
                  {tier.tagKey && (
                    <div className="absolute -top-2 left-3">
                      <span
                        className={`px-1.5 py-0.5 text-[8px] font-mono-ui tracking-[0.2em] uppercase ${
                          tier.highlight
                            ? 'bg-bz-cyan text-bz-graphite'
                            : 'bg-bz-grid text-bz-cyan'
                        }`}
                      >
                        {t(tier.tagKey)}
                      </span>
                    </div>
                  )}

                  <div className="text-[10px] font-mono-ui text-bz-system tracking-[0.3em] mb-3 uppercase">
                    {t(tier.nameKey)}
                  </div>

                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-bz-h3 font-medium text-bz-paper tracking-tight leading-none">
                      {tier.price}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono-ui text-bz-system tracking-widest mb-5 uppercase">
                    {t(tier.periodKey)}
                  </div>

                  <ul className="space-y-2 mb-6">
                    {tier.features.map((featKey) => (
                      <li
                        key={featKey}
                        className="flex items-start gap-2 text-[11px] text-bz-interface leading-relaxed"
                      >
                        <span className="text-bz-cyan mt-0.5">+</span>
                        <span>{t(featKey)}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`w-full py-2.5 text-[10px] font-mono-ui tracking-widest uppercase transition-colors duration-240 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                      tier.highlight
                        ? 'bg-bz-cyan text-bz-graphite font-semibold hover:bg-bz-cyan/90'
                        : 'border border-bz-grid text-bz-paper hover:border-bz-cyan hover:text-bz-cyan'
                    }`}
                    onClick={() => handleTierClick(tier.id)}
                    disabled={pendingTier !== null}
                  >
                    {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                    {isPending ? t('export.redirecting') : t(tier.ctaKey)}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-bz-grid">
            <span className="text-[9px] font-mono-ui text-bz-system tracking-[0.2em] uppercase">
              {t('access.footer')}
            </span>
            <button
              onClick={onClose}
              className="text-[10px] font-mono-ui text-bz-system hover:text-bz-paper transition-colors duration-240 tracking-widest uppercase"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={showAuth}
        onClose={() => {
          setShowAuth(false);
          setAuthForTier(null);
        }}
        initialMode="signup"
        contextLabel="auth.contextSubscribe"
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}

function humanizeCheckoutError(msg: string, t: (k: string) => string): string {
  if (msg === 'not_authenticated') return t('access.error.notAuthenticated');
  if (msg.startsWith('missing_price_id_')) return t('access.error.missingPriceId');
  if (msg === 'no_checkout_url') return t('access.error.noUrl');
  return t('access.error.generic');
}
