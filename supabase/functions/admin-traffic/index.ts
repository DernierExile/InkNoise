// =============================================================================
// Edge Function · admin-traffic
// Pulls site traffic from the Google Analytics 4 Data API for the admin page
// (bezier.one/admin). Read-only. Returns 28-day totals, a daily sessions
// series, top pages and top channels.
//
// Auth: Bearer ADMIN_TOKEN (same static token as admin-stats / admin-set-plan).
// Method: GET
//
// Required secrets (Supabase Dashboard → Edge Functions → Secrets):
//   ADMIN_TOKEN      (already set)
//   GA_PROPERTY_ID   numeric GA4 property id (NOT the G-XXXX measurement id ·
//                    GA4 → Admin → Property Settings → "Property ID")
//   GA_SA_KEY        the FULL service-account JSON (one secret, pasted whole).
//                    The service account email must be added as Viewer in
//                    GA4 → Admin → Property Access Management, and the
//                    "Google Analytics Data API" must be enabled in the
//                    Google Cloud project.
//
// If GA_PROPERTY_ID / GA_SA_KEY are missing, returns { configured:false } so
// the admin page degrades gracefully instead of breaking.
//
// Deploy: supabase functions deploy admin-traffic --no-verify-jwt
// =============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const ADMIN_TOKEN = Deno.env.get('ADMIN_TOKEN');
const GA_PROPERTY_ID = Deno.env.get('GA_PROPERTY_ID');
const GA_SA_KEY = Deno.env.get('GA_SA_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);

  if (!ADMIN_TOKEN) return json({ error: 'admin_token_not_configured' }, 500);
  const provided = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!constantTimeEquals(provided, ADMIN_TOKEN)) return json({ error: 'unauthorized' }, 401);

  if (!GA_PROPERTY_ID || !GA_SA_KEY) {
    return json({ configured: false, hint: 'Set GA_PROPERTY_ID and GA_SA_KEY secrets.' });
  }

  try {
    const sa = JSON.parse(GA_SA_KEY);
    const token = await getAccessToken(sa);

    const body = {
      requests: [
        { // 0 · 28-day totals
          dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
          metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
        },
        { // 1 · daily sessions series
          dateRanges: [{ startDate: '27daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'date' }],
          metrics: [{ name: 'sessions' }],
          orderBys: [{ dimension: { dimensionName: 'date' } }],
        },
        { // 2 · top pages
          dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'pagePath' }],
          metrics: [{ name: 'screenPageViews' }],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: 8,
        },
        { // 3 · top channels
          dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          metrics: [{ name: 'sessions' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 6,
        },
      ],
    };

    const r = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${GA_PROPERTY_ID}:batchRunReports`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    if (!r.ok) {
      const txt = await r.text();
      console.error('GA4 API error:', r.status, txt);
      return json({ configured: true, error: 'ga_api_error', status: r.status });
    }
    const data = await r.json();
    const reports = data.reports ?? [];

    const totalsRow = reports[0]?.rows?.[0]?.metricValues ?? [];
    const totals = {
      users: int(totalsRow[0]?.value),
      sessions: int(totalsRow[1]?.value),
      pageviews: int(totalsRow[2]?.value),
    };
    const byDay = (reports[1]?.rows ?? []).map((row: GaRow) => ({
      date: fmtDate(row.dimensionValues?.[0]?.value),
      sessions: int(row.metricValues?.[0]?.value),
    }));
    const topPages = (reports[2]?.rows ?? []).map((row: GaRow) => ({
      path: row.dimensionValues?.[0]?.value ?? '',
      views: int(row.metricValues?.[0]?.value),
    }));
    const channels = (reports[3]?.rows ?? []).map((row: GaRow) => ({
      channel: row.dimensionValues?.[0]?.value ?? '',
      sessions: int(row.metricValues?.[0]?.value),
    }));

    return json(
      { configured: true, range: '28 jours', totals, byDay, topPages, channels, generatedAt: new Date().toISOString() },
      200,
      { 'Cache-Control': 'private, max-age=300' },
    );
  } catch (err) {
    console.error('admin-traffic error:', err);
    return json({ configured: true, error: 'traffic_failed', detail: String(err) }, 200);
  }
});

interface GaRow {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Array<{ value?: string }>;
}

// --- Google service-account → OAuth2 access token (RS256 signed JWT) ---
async function getAccessToken(sa: { client_email: string; private_key: string; token_uri?: string }): Promise<string> {
  const tokenUri = sa.token_uri ?? 'https://oauth2.googleapis.com/token';
  const now = Math.floor(Date.now() / 1000);
  const header = b64urlStr(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64urlStr(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: tokenUri,
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claim}`;
  const key = await importPrivateKey(sa.private_key);
  const sig = await crypto.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${b64urlBuf(sig)}`;

  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error('token_exchange_failed: ' + JSON.stringify(j));
  return j.access_token;
}

function importPrivateKey(pem: string): Promise<CryptoKey> {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', der.buffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

function b64urlStr(s: string): string {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlBuf(buf: ArrayBuffer): string {
  const b = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function int(v: unknown): number { return parseInt(String(v ?? '0'), 10) || 0; }
function fmtDate(s?: string): string {
  if (!s || s.length !== 8) return s ?? '';
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

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
