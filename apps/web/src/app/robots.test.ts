import robots from './robots';

describe('robots metadata route', () => {
  const originalEnv = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalEnv;
    }
  });

  it('generates correct robots.txt configuration with default site URL', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const config = robots();
    expect(config.sitemap).toBe('https://location-intelligence-web.sprajeesh.workers.dev/sitemap.xml');
    expect(config.rules).toEqual([
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
    ]);
  });

  it('uses custom NEXT_PUBLIC_SITE_URL when provided', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://custom-domain.nz';
    const config = robots();
    expect(config.sitemap).toBe('https://custom-domain.nz/sitemap.xml');
  });
});
