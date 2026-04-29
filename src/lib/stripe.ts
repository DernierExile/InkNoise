// =============================================================================
// Stripe checkout helpers — calls the create-checkout edge function and
// redirects the browser to the Stripe-hosted checkout page.
// =============================================================================

import { supabase } from './supabase';

export type CheckoutTierId = 'monthly' | 'annual' | 'lifetime';

export type CheckoutTier = {
  id: CheckoutTierId;
  name: string;
  priceId: string; // Stripe Price ID — read from env
  mode: 'subscription' | 'payment';
};

/**
 * Tier configuration sourced from Vite env vars.
 * Configure in `.env`:
 *   VITE_STRIPE_PRICE_STUDIO_MONTHLY=price_xxx
 *   VITE_STRIPE_PRICE_STUDIO_ANNUAL=price_xxx
 *   VITE_STRIPE_PRICE_FOUNDER_LIFETIME=price_xxx
 */
export function getTierConfig(): Record<CheckoutTierId, CheckoutTier> {
  return {
    monthly: {
      id: 'monthly',
      name: 'Studio · Monthly',
      priceId: import.meta.env.VITE_STRIPE_PRICE_STUDIO_MONTHLY ?? '',
      mode: 'subscription',
    },
    annual: {
      id: 'annual',
      name: 'Studio · Annual',
      priceId: import.meta.env.VITE_STRIPE_PRICE_STUDIO_ANNUAL ?? '',
      mode: 'subscription',
    },
    lifetime: {
      id: 'lifetime',
      name: 'Founder · Lifetime',
      priceId: import.meta.env.VITE_STRIPE_PRICE_FOUNDER_LIFETIME ?? '',
      mode: 'payment',
    },
  };
}

/**
 * Calls the create-checkout edge function and returns the Stripe-hosted URL.
 * Throws if not authenticated or if the function call fails.
 */
export async function createCheckoutSession(
  tier: CheckoutTier,
): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error('not_authenticated');
  }
  if (!tier.priceId) {
    throw new Error(`missing_price_id_for_${tier.id}`);
  }

  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: {
      priceId: tier.priceId,
      mode: tier.mode,
      origin: window.location.origin,
    },
  });

  if (error) throw error;
  if (!data?.url) throw new Error('no_checkout_url');
  return data.url as string;
}

/**
 * Redirects the browser to the Stripe Checkout URL for the given tier.
 */
export async function redirectToCheckout(tier: CheckoutTier) {
  const url = await createCheckoutSession(tier);
  window.location.href = url;
}
