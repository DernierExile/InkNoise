// =============================================================================
// Auth helpers — thin wrappers over the Supabase client for clarity.
// =============================================================================

import type { Provider } from '@supabase/supabase-js';
import { supabase } from './supabase';

export async function signUp(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function resetPassword(email: string, redirectTo?: string) {
  return supabase.auth.resetPasswordForEmail(email, { redirectTo });
}

export async function refreshSession() {
  return supabase.auth.refreshSession();
}

/**
 * Sign in with an OAuth provider (Google, GitHub, etc.).
 * Browser redirects to provider, then back to the app.
 * The redirectTo URL must be allowlisted in Supabase Dashboard
 * → Authentication → URL Configuration.
 */
export async function signInWithProvider(provider: Provider) {
  return supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin,
    },
  });
}
