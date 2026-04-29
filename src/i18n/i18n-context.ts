// =============================================================================
// i18n context — types and raw context handle.
// Provider lives in I18nProvider.tsx, hooks in use-i18n.ts.
// =============================================================================

import { createContext } from 'react';

export type Locale = 'en' | 'fr' | 'ja' | 'zh';

export const SUPPORTED_LOCALES: { code: Locale; label: string; native: string }[] = [
  { code: 'en', label: 'EN', native: 'English' },
  { code: 'fr', label: 'FR', native: 'Français' },
  { code: 'ja', label: 'JA', native: '日本語' },
  { code: 'zh', label: '中', native: '中文' },
];

export type TranslationDict = Record<string, unknown>;

export interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);
