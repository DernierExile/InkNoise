// =============================================================================
// Edge Function · founder-count
// Public endpoint that returns the count of users with app_metadata.plan
// === 'founder'. Used by the Pricing section's FounderCounter component.
// =============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2';

const FOUNDER_TOTAL = 500;

const adminSupabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

async function countFounders(): Promise<number> {
  const { data, error } = await adminSupabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) throw error;
  return data.users.filter((u) => u.app_metadata?.plan === 'founder').length;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'GET') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  try {
    const claimed = await countFounders();
    return json({ claimed, total: FOUNDER_TOTAL }, 200, {
      'Cache-Control': 'public, max-age=60, s-maxage=60',
    });
  } catch (err) {
    console.error('founder-count error:', err);
    return json({ claimed: 0, total: FOUNDER_TOTAL, error: 'count_failed' }, 200);
  }
});

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}
