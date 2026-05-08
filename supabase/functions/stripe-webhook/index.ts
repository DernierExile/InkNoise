// =============================================================================
// Edge Function · stripe-webhook
// Listens to Stripe events and updates the user's plan in app_metadata.
//
// Handled events:
//   - checkout.session.completed       → set plan to 'studio' or 'founder'
//                                        + send Resend founder welcome email
//                                          when plan = 'founder'
//   - customer.subscription.deleted    → set plan back to 'free'
//
// Required env vars (set in Supabase Dashboard → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY
//   STRIPE_WEBHOOK_SECRET             (from `stripe listen` or webhook endpoint)
//   STRIPE_PRICE_ID_STUDIO_MONTHLY
//   STRIPE_PRICE_ID_STUDIO_ANNUAL
//   STRIPE_PRICE_ID_FOUNDER_LIFETIME
//   RESEND_API_KEY                    (for founder welcome email · optional;
//                                      if absent, email sending is skipped)
//   FOUNDER_FROM_EMAIL                (default: "Bezier <noreply@machine.b23.email>")
//   FOUNDER_REPLY_TO                  (default: "founders@bezier.one")
//   APP_BASE_URL                      (default: "https://inknoise.bezier.one")
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

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FOUNDER_FROM_EMAIL =
  Deno.env.get('FOUNDER_FROM_EMAIL') ?? 'Bezier <noreply@machine.b23.email>';
const FOUNDER_REPLY_TO =
  Deno.env.get('FOUNDER_REPLY_TO') ?? 'founders@bezier.one';
const APP_BASE_URL =
  Deno.env.get('APP_BASE_URL') ?? 'https://inknoise.bezier.one';

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

// =============================================================================
// FOUNDER ONBOARDING · count + email
// =============================================================================

/**
 * Count users with plan='founder'. Used to assign a founder number to the
 * latest sign-up. Race condition risk for simultaneous payments is acceptable
 * for the 500-seat launch (see docs).
 */
async function countFounders(): Promise<number> {
  let total = 0;
  let page = 1;
  // Paginate listUsers in case > 1000 (defensive)
  while (true) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) {
      console.error('Failed to list users for founder count', error);
      return 0;
    }
    type AppMeta = { plan?: string };
    total += data.users.filter(
      (u) => ((u.app_metadata ?? {}) as AppMeta).plan === 'founder',
    ).length;
    if (data.users.length < 1000) break;
    page++;
  }
  return total;
}

interface FounderEmail {
  subject: string;
  html: string;
  text: string;
}

function composeFounderEmail(founderNumber: number): FounderEmail {
  const numFormatted = String(founderNumber).padStart(3, '0');
  const subject = `Welcome to Bezier · Founder #${numFormatted}`;

  const text = `Welcome to Bezier · Founder #${numFormatted}

You just bought a Bezier Founder pass. Lifetime access. No subscription. No upgrade fee.

What's included
  - InkNoise · full access, no watermark, 4K export, save presets, batch processing
  - Outline · full access on day one, when it ships
  - Every future module added under the Bezier umbrella
  - Founder badge on your account
  - Direct line for feature requests

Open InkNoise:
${APP_BASE_URL}

Manage your account (billing, invoices, downgrade):
${APP_BASE_URL}/account

Direct contact for founders:
${FOUNDER_REPLY_TO}

Bezier · Running visual culture · MMXXVI
`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#050607;color:#F4F4F1;font-family:'Inter','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#050607;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- Brand mark -->
          <tr>
            <td style="padding:0 0 32px 0;">
              <div style="display:inline-block;font-weight:600;font-size:18px;color:#F4F4F1;letter-spacing:-0.01em;">
                Bezier<span style="color:#00D5FF;">.</span>one
              </div>
            </td>
          </tr>

          <!-- Eyebrow -->
          <tr>
            <td style="padding:0 0 12px 0;">
              <div style="font-family:'JetBrains Mono','Courier New',monospace;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#8A8F98;">
                Founder · #${numFormatted} · Lifetime
              </div>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding:0 0 24px 0;">
              <h1 style="margin:0;font-size:36px;font-weight:600;line-height:1.1;letter-spacing:-0.02em;color:#F4F4F1;">
                Welcome to Bezier.
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:0 0 24px 0;">
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#C8CCD1;">
                You just bought a Founder pass. Lifetime access, no subscription, no upgrade fee. Locked in for every Bezier module shipped today and tomorrow.
              </p>
              <p style="margin:0;font-size:16px;line-height:1.6;color:#C8CCD1;">
                You're founder <strong style="color:#F4F4F1;">#${numFormatted}</strong> out of 500. Welcome to the workbench.
              </p>
            </td>
          </tr>

          <!-- CTA primary -->
          <tr>
            <td style="padding:0 0 12px 0;">
              <a href="${APP_BASE_URL}" style="display:inline-block;background:#F4F4F1;color:#050607;text-decoration:none;font-family:'JetBrains Mono','Courier New',monospace;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;font-weight:500;padding:14px 28px;border:1px solid #F4F4F1;">
                Open InkNoise →
              </a>
            </td>
          </tr>

          <!-- CTA secondary -->
          <tr>
            <td style="padding:0 0 32px 0;">
              <a href="${APP_BASE_URL}/account" style="display:inline-block;background:transparent;color:#F4F4F1;text-decoration:none;font-family:'JetBrains Mono','Courier New',monospace;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;font-weight:500;padding:14px 28px;border:1px solid #2A2F36;">
                Manage account →
              </a>
            </td>
          </tr>

          <!-- Hairline -->
          <tr>
            <td style="border-top:1px solid #2A2F36;padding:32px 0 0 0;"></td>
          </tr>

          <!-- What's included -->
          <tr>
            <td style="padding:0 0 24px 0;">
              <div style="font-family:'JetBrains Mono','Courier New',monospace;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#8A8F98;margin-bottom:12px;">
                What's included
              </div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr><td style="padding:6px 0;font-size:14px;line-height:1.5;color:#C8CCD1;">→ InkNoise · full access, no watermark, 4K export, save presets, batch processing</td></tr>
                <tr><td style="padding:6px 0;font-size:14px;line-height:1.5;color:#C8CCD1;">→ Outline · full access on day one, when it ships</td></tr>
                <tr><td style="padding:6px 0;font-size:14px;line-height:1.5;color:#C8CCD1;">→ Every future module added under the Bezier umbrella, no extra fee</td></tr>
                <tr><td style="padding:6px 0;font-size:14px;line-height:1.5;color:#C8CCD1;">→ Founder badge on your account</td></tr>
                <tr><td style="padding:6px 0;font-size:14px;line-height:1.5;color:#C8CCD1;">→ Direct line for feature requests</td></tr>
              </table>
            </td>
          </tr>

          <!-- Hairline -->
          <tr>
            <td style="border-top:1px solid #2A2F36;padding:32px 0 0 0;"></td>
          </tr>

          <!-- Direct contact -->
          <tr>
            <td style="padding:0 0 24px 0;">
              <p style="margin:0;font-size:14px;line-height:1.6;color:#C8CCD1;">
                Direct line for feature requests, bug reports, or just to say hi:
                <br />
                <a href="mailto:${FOUNDER_REPLY_TO}" style="color:#00D5FF;text-decoration:none;">${FOUNDER_REPLY_TO}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #2A2F36;padding:24px 0 0 0;font-family:'JetBrains Mono','Courier New',monospace;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#8A8F98;">
              <span style="color:#F4F4F1;">Bezier</span> · MMXXVI · Running visual culture
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

async function sendFounderWelcomeEmail(
  email: string,
  founderNumber: number,
): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn(
      'RESEND_API_KEY not set, skipping founder welcome email for',
      email,
    );
    return;
  }

  const { subject, html, text } = composeFounderEmail(founderNumber);

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FOUNDER_FROM_EMAIL,
        to: [email],
        reply_to: FOUNDER_REPLY_TO,
        subject,
        html,
        text,
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      console.error('Resend send failed:', resp.status, body);
    } else {
      console.log(
        `Founder welcome email sent to ${email} (founder #${founderNumber})`,
      );
    }
  } catch (err) {
    console.error('Resend send threw:', err);
  }
}

// =============================================================================
// SERVE
// =============================================================================

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

        // Founder onboarding: count + welcome email.
        // Errors are swallowed so the webhook never fails because of email.
        if (plan === 'founder') {
          const email =
            (session.customer_email as string | null) ||
            (session.customer_details?.email as string | undefined);
          if (email) {
            const founderNumber = await countFounders();
            await sendFounderWelcomeEmail(email, founderNumber);
          } else {
            console.warn(
              'No customer email on founder session, skipping welcome email',
              session.id,
            );
          }
        }

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
