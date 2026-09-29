import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const rawBaseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://location-intelligence-web.sprajeesh.workers.dev';
  const baseUrl = rawBaseUrl.replace(/\/+$/, '');

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
