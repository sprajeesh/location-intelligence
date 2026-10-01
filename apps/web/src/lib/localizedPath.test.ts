import { localizedPath } from './localizedPath';

describe('localizedPath', () => {
  it('leaves default-locale paths unprefixed', () => {
    expect(localizedPath('en', '/')).toBe('/');
    expect(localizedPath('en', '/data-sources')).toBe('/data-sources');
  });

  it('prefixes non-default locales', () => {
    expect(localizedPath('mi', '/')).toBe('/mi');
    expect(localizedPath('mi', '/data-sources')).toBe('/mi/data-sources');
  });
});
