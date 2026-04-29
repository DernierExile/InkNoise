// =============================================================================
// Edge Function · create-checkout
// Creates a Stripe Checkout Session for the authenticated user.
//
// Body: { priceId: string, mode: 'subscription' | 'payment' }
// Auth: Bearer JWT (Supabase user session)
// Returns: { url: string, sessionId: string }
//
// Required env vars (set in Supabase Dashboard → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY
//   SUPABASE_URL              (auto-set by Supabase)
//   SUPABASE_ANON_KEY         (auto-set by Supabase)
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&deno-std=0.224.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing authorization' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Invalid session' }, 401);
    }

    const { priceId, mode, origin } = await req.json();
    if (!priceId || !mode || !origin) {
      return json({ error: 'Missing parameters' }, 400);
    }
    if (mode !== 'subscription' && mode !== 'payment') {
      return json({ error: 'Invalid mode' }, 400);
    }

    const session = await stripe.checkout.sessions.create({
      mode,
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancelled`,
      metadata: { user_id: user.id },
      // For subscriptions, allow promotional codes
      ...(mode === 'subscription' ? { allow_promotion_codes: true } : {}),
    });

    return json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('create-checkout error:', err);
    return json({ error: 'Internal error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
