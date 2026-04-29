// =============================================================================
// I18nProvider — provides translation function + locale state to the tree.
// Persists locale in localStorage. Auto-detects browser language on first load.
// =============================================================================

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { I18nContext, type Locale, type TranslationDict } from './i18n-context';
import en from './locales/en.json';
import fr from './locales/fr.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';

const STORAGE_KEY = 'inknoise_locale';

const DICTIONARIES: Record<Locale, TranslationDict> = {
  en: en as TranslationDict,
  fr: fr as TranslationDict,
  ja: ja as TranslationDict,
  zh: zh as TranslationDict,
};

function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'fr' || stored === 'ja' || stored === 'zh') {
    return stored;
  }
  const browser = (navigator.language || 'en').toLowerCase();
  if (browser.startsWith('fr')) return 'fr';
  if (browser.startsWith('ja')) return 'ja';
  if (browser.startsWith('zh')) return 'zh';
  return 'en';
}

function resolveKey(dict: TranslationDict, key: string): string | null {
  const parts = key.split('.');
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return null;
    }
  }
  return typeof cur === 'string' ? cur : null;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    k in params ? String(params[k]) : `{${k}}`,
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => detectInitialLocale());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, locale);
      document.documentElement.setAttribute('lang', locale);
    }
  }, [locale]);

  const value = useMemo(() => {
    const dict = DICTIONARIES[locale];
    const fallback = DICTIONARIES.en;

    const t = (key: string, params?: Record<string, string | number>): string => {
      const found = resolveKey(dict, key) ?? resolveKey(fallback, key);
      if (found === null) {
        // In dev, this helps spot missing keys; in prod, returns the key itself
        if (import.meta.env.DEV) console.warn(`[i18n] missing key: ${key}`);
        return key;
      }
      return interpolate(found, params);
    };

    return { locale, setLocale: setLocaleState, t };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
