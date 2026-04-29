// =============================================================================
// Auth context types + raw context handle.
// Components live in AuthContext.tsx, hooks live in use-auth.ts.
// Splitting keeps Vite fast-refresh happy.
// =============================================================================

import { createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';

export type Plan = 'free' | 'studio' | 'founder';

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  plan: Plan;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
