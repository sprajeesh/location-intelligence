import sitemap from './sitemap';

describe('sitemap metadata route', () => {
  const originalEnv = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalEnv;
    }
  });

  it('generates sitemap entries for default and localized routes', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const entries = sitemap();
    expect(entries).toHaveLength(2);
    expect(entries[0]?.url).toBe('https://location-intelligence-web.sprajeesh.workers.dev/');
    expect(entries[1]?.url).toBe('https://location-intelligence-web.sprajeesh.workers.dev/mi');
    expect(entries[0]?.priority).toBe(1.0);
  });

  it('respects NEXT_PUBLIC_SITE_URL environment variable', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://custom-domain.nz';
    const entries = sitemap();
    expect(entries[0]?.url).toBe('https://custom-domain.nz/');
    expect(entries[1]?.url).toBe('https://custom-domain.nz/mi');
  });

  it('strips trailing slashes from custom NEXT_PUBLIC_SITE_URL', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://custom-domain.nz///';
    const entries = sitemap();
    expect(entries[0]?.url).toBe('https://custom-domain.nz/');
    expect(entries[1]?.url).toBe('https://custom-domain.nz/mi');
  });
});
