import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import en from './en.json';

type Messages = Record<string, unknown>;

// Fills keys missing from `overrides` with the English copy, so English-only
// pages (e.g. /data-sources) render in every locale until translated.
function withFallback(base: Messages, overrides: Messages): Messages {
  const merged: Messages = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    const baseValue = merged[key];
    merged[key] =
      value && typeof value === 'object' && baseValue && typeof baseValue === 'object'
        ? withFallback(baseValue as Messages, value as Messages)
        : value;
  }
  return merged;
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  const messages: Messages =
    locale === routing.defaultLocale
      ? en
      : withFallback(en, (await import(`./${locale}.json`)).default);

  return { locale, messages };
});
