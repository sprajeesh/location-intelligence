import { routing } from '@/i18n/routing';

/**
 * Path for `path` in `locale`, honouring `localePrefix: "as-needed"` (see
 * src/i18n/routing.ts): the default locale is unprefixed, others get `/<locale>`.
 * `path` must start with "/" (use "/" for the home page).
 */
export function localizedPath(locale: string, path: string): string {
  if (locale === routing.defaultLocale) return path;
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}
