import { escapeHtml, buildHazardTooltipHtml } from './hazardTooltip';
import type { HazardCellFeature } from '@/types/hazard';

describe('escapeHtml', () => {
  it('escapes HTML metacharacters', () => {
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;');
  });

  it('leaves plain text untouched', () => {
    expect(escapeHtml('demo_hazard')).toBe('demo_hazard');
  });
});

describe('buildHazardTooltipHtml', () => {
  const baseHazard: HazardCellFeature['properties']['hazards'][number] = {
    hazardType: 'demo_hazard',
    score: 55,
    isProxy: true,
    isSevere: false,
    currencyDate: '2026-08-01',
    source: 'Phase-0 Scaffold Dummy Generator',
  };

  const baseProps: HazardCellFeature['properties'] = {
    cellId: '8752c9adfffffff',
    resolution: 7,
    composite: 42,
    worstHazard: 55,
    worstHazardType: 'demo_hazard',
    anySevere: false,
    hazards: [baseHazard],
  };

  it('escapes a malicious hazardType instead of injecting markup', () => {
    const html = buildHazardTooltipHtml({
      ...baseProps,
      hazards: [{ ...baseHazard, hazardType: '<img src=x onerror=alert(1)>' }],
    });

    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('preserves the proxy label and composite/worst values for a normal hazardType', () => {
    const html = buildHazardTooltipHtml(baseProps);

    expect(html).toContain('demo_hazard (proxy)');
    expect(html).toContain('Composite: 42');
    expect(html).toContain('Worst: 55');
  });
});
