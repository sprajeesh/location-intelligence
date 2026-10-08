import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getSiteUrl } from '@/lib/siteUrl';

// Fixed at build time so crawlers see a lastmod that only moves on deploys.
const BUILD_DATE = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();

  // Info pages are English-only for now; add a route's other locales here once
  // real translations exist (untranslated copies are noindex, so keep them out).
  const routes: { path: string; locales: readonly string[] }[] = [
    { path: '', locales: routing.locales },
    { path: '/about', locales: [routing.defaultLocale] },
    { path: '/contact', locales: [routing.defaultLocale] },
    { path: '/faq', locales: [routing.defaultLocale] },
    { path: '/data-sources', locales: [routing.defaultLocale] },
  ];
  const sitemapEntries: MetadataRoute.Sitemap = [];

  for (const { path: route, locales } of routes) {
    for (const locale of locales) {
      const localePath = locale === routing.defaultLocale ? route : `/${locale}${route}`;
      sitemapEntries.push({
        url: `${baseUrl}${localePath || '/'}`,
        lastModified: BUILD_DATE,
        priority: route === '' ? 1.0 : 0.8,
      });
    }
  }

  return sitemapEntries;
}
