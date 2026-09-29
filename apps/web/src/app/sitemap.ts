import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';

export default function sitemap(): MetadataRoute.Sitemap {
  const rawBaseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://location-intelligence-web.sprajeesh.workers.dev';
  const baseUrl = rawBaseUrl.replace(/\/+$/, '');

  const routes = [''];
  const sitemapEntries: MetadataRoute.Sitemap = [];

  for (const route of routes) {
    for (const locale of routing.locales) {
      const localePath = locale === routing.defaultLocale ? route : `/${locale}${route}`;
      sitemapEntries.push({
        url: `${baseUrl}${localePath || '/'}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: route === '' ? 1.0 : 0.8,
      });
    }
  }

  return sitemapEntries;
}
