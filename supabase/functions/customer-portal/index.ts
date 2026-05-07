// =============================================================================
// Edge Function · customer-portal
// Creates a Stripe Billing Portal session for the authenticated user so they
// can manage their subscription (change card, cancel, view invoices, etc).
//
// Body: { origin: string }
// Auth: Bearer JWT (Supabase user session)
// Returns: { url: string }
//
// Required env vars (set in Supabase Dashboard → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY
//   SUPABASE_URL              (auto-set by Supabase)
//   SUPABASE_ANON_KEY         (auto-set by Supabase)
//
// IMPORTANT: Customer Portal must be enabled and configured in Stripe Dashboard:
//   Settings → Billing → Customer Portal → Activate
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
    if (userError || !user || !user.email) {
      return json({ error: 'Invalid session' }, 401);
    }

    const { origin } = await req.json();
    if (!origin) {
      return json({ error: 'Missing origin' }, 400);
    }

    // Find the Stripe customer by email — the customer was created automatically
    // by Stripe Checkout when the user purchased their subscription.
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return json({ error: 'no_customer_found' }, 404);
    }

    const customerId = customers.data[0].id;

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: origin,
    });

    return json({ url: session.url });
  } catch (err) {
    console.error('customer-portal error:', err);
    return json({ error: 'Internal error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
