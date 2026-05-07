// =============================================================================
// Edge Function · admin-set-plan
// Manually upgrade/downgrade a user's plan without going through Stripe.
// Used to grant Founder/Studio access to beta testers, partners, or refunded
// customers.
//
// Body: { email: string, plan: 'free' | 'studio' | 'founder' }
// Auth: Bearer ADMIN_TOKEN (NOT a user JWT — this is a custom static token)
// Returns: { success: true, userId, email, plan }
//
// Required env vars (set in Supabase Dashboard → Edge Functions → Secrets):
//   ADMIN_TOKEN              (random secret — generate with: openssl rand -hex 32)
//   SUPABASE_URL             (auto-set by Supabase)
//   SUPABASE_SERVICE_ROLE_KEY (auto-set by Supabase)
//
// IMPORTANT: Deploy with --no-verify-jwt — auth is handled internally via
// the ADMIN_TOKEN bearer header. Bolt should auto-deploy without JWT verification
// since the function checks its own auth.
//
// Usage example (curl):
//   curl -X POST https://<project>.supabase.co/functions/v1/admin-set-plan \
//     -H "Authorization: Bearer $ADMIN_TOKEN" \
//     -H "Content-Type: application/json" \
//     -d '{"email":"someone@example.com","plan":"founder"}'
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ADMIN_TOKEN = Deno.env.get('ADMIN_TOKEN');

const adminSupabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

type Plan = 'free' | 'studio' | 'founder';
const VALID_PLANS: readonly Plan[] = ['free', 'studio', 'founder'] as const;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  // --- Auth: bearer ADMIN_TOKEN (constant-time compare) ---
  if (!ADMIN_TOKEN) {
    return json({ error: 'admin_token_not_configured' }, 500);
  }
  const authHeader = req.headers.get('Authorization') ?? '';
  const provided = authHeader.replace(/^Bearer\s+/i, '');
  if (!constantTimeEquals(provided, ADMIN_TOKEN)) {
    return json({ error: 'unauthorized' }, 401);
  }

  // --- Body validation ---
  let body: { email?: string; plan?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const plan = body.plan as Plan | undefined;

  if (!email || !email.includes('@')) {
    return json({ error: 'invalid_email' }, 400);
  }
  if (!plan || !VALID_PLANS.includes(plan)) {
    return json({ error: 'invalid_plan', valid: VALID_PLANS }, 400);
  }

  // --- Find user by email ---
  // Note: listUsers paginates. For >1k users, switch to a server-side filter.
  const { data: list, error: listError } = await adminSupabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) {
    console.error('listUsers failed:', listError);
    return json({ error: 'list_users_failed' }, 500);
  }

  const user = list.users.find((u) => u.email?.toLowerCase() === email);
  if (!user) {
    return json({ error: 'user_not_found', email }, 404);
  }

  // --- Update plan, preserve other app_metadata fields ---
  const newAppMetadata = {
    ...(user.app_metadata ?? {}),
    plan,
  };

  const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
    user.id,
    { app_metadata: newAppMetadata },
  );

  if (updateError) {
    console.error('updateUser failed:', updateError);
    return json({ error: 'update_failed' }, 500);
  }

  console.log(`Admin set plan: ${email} (${user.id}) → ${plan}`);

  return json({
    success: true,
    userId: user.id,
    email,
    plan,
    note: 'User must sign out + sign in (or hard reload) to refresh JWT.',
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Constant-time string comparison to avoid timing attacks on the admin token.
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
