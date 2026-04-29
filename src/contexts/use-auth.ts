// =============================================================================
// Auth hooks — useAuth, usePlan, useIsPro.
// =============================================================================

import { useContext } from 'react';
import { AuthContext, type Plan } from './auth-context';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

export function usePlan(): Plan {
  return useAuth().plan;
}

export function useIsPro(): boolean {
  const plan = usePlan();
  return plan === 'studio' || plan === 'founder';
}
