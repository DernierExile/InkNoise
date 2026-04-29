// =============================================================================
// Edge Function · stripe-webhook
// Listens to Stripe events and updates the user's plan in app_metadata.
//
// Handled events:
//   - checkout.session.completed       → set plan to 'studio' or 'founder'
//   - customer.subscription.deleted    → set plan back to 'free'
//
// Required env vars (set in Supabase Dashboard → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY
//   STRIPE_WEBHOOK_SECRET             (from `stripe listen` or webhook endpoint)
//   STRIPE_PRICE_ID_STUDIO_MONTHLY
//   STRIPE_PRICE_ID_STUDIO_ANNUAL
//   STRIPE_PRICE_ID_FOUNDER_LIFETIME
//   SUPABASE_URL                      (auto-set)
//   SUPABASE_SERVICE_ROLE_KEY         (auto-set)
//
// IMPORTANT: When deploying, use `supabase functions deploy stripe-webhook
//   --no-verify-jwt` because Stripe doesn't send a Supabase JWT.
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&deno-std=0.224.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
});

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const PRICE_STUDIO_MONTHLY = Deno.env.get('STRIPE_PRICE_ID_STUDIO_MONTHLY');
const PRICE_STUDIO_ANNUAL = Deno.env.get('STRIPE_PRICE_ID_STUDIO_ANNUAL');
const PRICE_FOUNDER_LIFETIME = Deno.env.get('STRIPE_PRICE_ID_FOUNDER_LIFETIME');

const adminSupabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

type Plan = 'free' | 'studio' | 'founder';

function priceIdToPlan(priceId: string | undefined): Plan | null {
  if (!priceId) return null;
  if (priceId === PRICE_STUDIO_MONTHLY || priceId === PRICE_STUDIO_ANNUAL) {
    return 'studio';
  }
  if (priceId === PRICE_FOUNDER_LIFETIME) return 'founder';
  return null;
}

async function setUserPlan(userId: string, plan: Plan) {
  // Read existing app_metadata to preserve other fields (e.g. provider, providers)
  const { data: existing, error: fetchError } =
    await adminSupabase.auth.admin.getUserById(userId);
  if (fetchError) {
    console.error('Failed to fetch user', userId, fetchError);
    return;
  }

  const newAppMetadata = {
    ...(existing.user.app_metadata ?? {}),
    plan,
  };

  const { error } = await adminSupabase.auth.admin.updateUserById(userId, {
    app_metadata: newAppMetadata,
  });
  if (error) {
    console.error('Failed to update user plan', userId, error);
  } else {
    console.log(`Plan updated for ${userId} → ${plan}`);
  }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return new Response('Missing signature', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId =
          (session.client_reference_id as string | null) ||
          (session.metadata?.user_id as string | undefined);

        if (!userId) {
          console.error('No user_id in session', session.id);
          break;
        }

        // Get the price id from the session line items
        const lineItems = await stripe.checkout.sessions.listLineItems(
          session.id,
          { limit: 1 },
        );
        const priceId = lineItems.data[0]?.price?.id;
        const plan = priceIdToPlan(priceId);
        if (!plan) {
          console.error('Unknown price id', priceId);
          break;
        }

        await setUserPlan(userId, plan);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(sub.customer as string);
        if ('deleted' in customer && customer.deleted) break;
        const email = (customer as Stripe.Customer).email;
        if (!email) break;

        const { data, error } = await adminSupabase.auth.admin.listUsers();
        if (error) {
          console.error('Failed to list users', error);
          break;
        }
        const matched = data.users.find((u) => u.email === email);
        if (matched) await setUserPlan(matched.id, 'free');
        break;
      }

      default:
        // Ignore other events
        break;
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return new Response('Internal error', { status: 500 });
  }
});
