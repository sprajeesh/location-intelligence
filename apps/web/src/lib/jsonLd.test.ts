import { serializeJsonLd } from './jsonLd';

describe('serializeJsonLd', () => {
  it('escapes "<" so a value cannot close the script element', () => {
    const out = serializeJsonLd({ inLanguage: '</script><img src=x onerror=alert(1)>' });
    expect(out).not.toContain('<');
    expect(JSON.parse(out).inLanguage).toBe('</script><img src=x onerror=alert(1)>');
  });

  it('round-trips ordinary data unchanged', () => {
    const data = { '@type': 'AboutPage', n: 1, list: ['a', 'b'] };
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });
});
