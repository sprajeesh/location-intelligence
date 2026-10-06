import { infoPageMetadata } from './infoPageMetadata';

const input = { path: '/faq', title: 'T', description: 'D' };

describe('infoPageMetadata', () => {
  it('indexes the default-locale page with a self canonical', () => {
    const m = infoPageMetadata({ locale: 'en', ...input });
    expect(m.alternates?.canonical).toBe('/faq');
    expect(m.robots).toBeUndefined();
    expect(m.openGraph?.url).toBe('/faq');
  });

  it('noindexes other locales and canonicalises them to the English page', () => {
    const m = infoPageMetadata({ locale: 'mi', ...input });
    expect(m.alternates?.canonical).toBe('/faq');
    expect(m.robots).toEqual({ index: false, follow: true });
    expect(m.openGraph?.url).toBe('/mi/faq');
  });
});
