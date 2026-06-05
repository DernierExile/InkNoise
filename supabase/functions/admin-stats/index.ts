// =============================================================================
// Edge Function · admin-stats
// Aggregate dashboard data for the private admin page (bezier.one/admin).
// Returns signup counts, plan breakdown, Founder seats claimed, recent signups
// and a 30-day signup timeline. Read-only · never mutates.
//
// Auth: Bearer ADMIN_TOKEN (the same static token used by admin-set-plan).
// Method: GET
// Returns: {
//   total, byPlan: { free, studio, founder }, founderClaimed, founderTotal,
//   active7d, signups: [{ day, count }], recent: [{ email, plan, created_at, last_sign_in_at }]
// }
//
// Required env vars (Supabase Dashboard → Edge Functions → Secrets):
//   ADMIN_TOKEN                (already set for admin-set-plan)
//   SUPABASE_URL               (auto)
//   SUPABASE_SERVICE_ROLE_KEY  (auto · needed to read auth.users)
//
// Deploy with --no-verify-jwt (auth is the ADMIN_TOKEN bearer, not a user JWT):
//   supabase functions deploy admin-stats --no-verify-jwt
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ADMIN_TOKEN = Deno.env.get('ADMIN_TOKEN');
const FOUNDER_TOTAL = 500;

const adminSupabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

type Plan = 'free' | 'studio' | 'founder';

// Page through every user (listUsers caps at 1000 per page).
async function allUsers() {
  const users: Array<Record<string, unknown>> = [];
  const perPage = 1000;
  let page = 1;
  while (true) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < perPage) break;
    page++;
    if (page > 50) break; // safety cap · 50k users
  }
  return users;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);

  if (!ADMIN_TOKEN) return json({ error: 'admin_token_not_configured' }, 500);
  const provided = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!constantTimeEquals(provided, ADMIN_TOKEN)) return json({ error: 'unauthorized' }, 401);

  try {
    const users = await allUsers();
    const byPlan = { free: 0, studio: 0, founder: 0 };
    const now = Date.now();
    const since30 = now - 30 * 864e5;
    const since7 = now - 7 * 864e5;
    const dayMap = new Map<string, number>();
    let active7d = 0;

    for (const u of users) {
      const plan = ((u.app_metadata as Record<string, unknown> | undefined)?.plan as Plan) ?? 'free';
      if (plan === 'studio' || plan === 'founder') byPlan[plan]++;
      else byPlan.free++;

      const created = new Date(u.created_at as string).getTime();
      if (created >= since30) {
        const d = new Date(u.created_at as string).toISOString().slice(0, 10);
        dayMap.set(d, (dayMap.get(d) ?? 0) + 1);
      }
      const lastSeen = u.last_sign_in_at ? new Date(u.last_sign_in_at as string).getTime() : 0;
      if (lastSeen >= since7) active7d++;
    }

    const signups = [...dayMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => ({ day, count }));

    const recent = [...users]
      .sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime())
      .slice(0, 50)
      .map((u) => ({
        email: u.email as string,
        plan: ((u.app_metadata as Record<string, unknown> | undefined)?.plan as Plan) ?? 'free',
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
      }));

    return json(
      {
        total: users.length,
        byPlan,
        founderClaimed: byPlan.founder,
        founderTotal: FOUNDER_TOTAL,
        active7d,
        signups,
        recent,
        generatedAt: new Date().toISOString(),
      },
      200,
      { 'Cache-Control': 'private, max-age=30' },
    );
  } catch (err) {
    console.error('admin-stats error:', err);
    return json({ error: 'stats_failed' }, 500);
  }
});

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extra },
  });
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}
