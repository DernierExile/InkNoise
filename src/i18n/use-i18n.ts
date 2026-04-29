// =============================================================================
// i18n hooks — useT (translation function), useLocale (current locale).
// =============================================================================

import { useContext } from 'react';
import { I18nContext } from './i18n-context';

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

/** Returns just the translation function. */
export function useT() {
  return useI18n().t;
}

/** Returns the current locale (e.g. 'en', 'fr', 'ja', 'zh'). */
export function useLocale() {
  return useI18n().locale;
}
