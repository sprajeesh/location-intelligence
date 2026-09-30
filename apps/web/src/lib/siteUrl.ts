const DEFAULT_SITE_URL = 'https://location-intelligence-web.sprajeesh.workers.dev';

/** Absolute site origin with no trailing slash. */
export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL).replace(/\/+$/, '');
}
