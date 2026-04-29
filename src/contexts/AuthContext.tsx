// =============================================================================
// AuthProvider — watches Supabase session, exposes user/plan to the tree.
// Hooks live in use-auth.ts (split for Vite fast-refresh).
// =============================================================================

import { useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AuthContext, type Plan } from './auth-context';

function readPlan(user: User | null | undefined): Plan {
  const raw = user?.app_metadata?.plan;
  if (raw === 'studio' || raw === 'founder') return raw;
  return 'free';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      },
    );

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  const user = session?.user ?? null;
  const plan = readPlan(user);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refresh = async () => {
    const { data } = await supabase.auth.refreshSession();
    setSession(data.session);
  };

  return (
    <AuthContext.Provider
      value={{ session, user, plan, isLoading, signOut, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}
