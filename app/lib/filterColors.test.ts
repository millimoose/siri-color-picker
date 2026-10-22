import { describe, expect, it } from 'vite-plus/test';
import { COLOR_ITEMS, DEFAULT_FILTERS, selectColorGroups, toColorItems } from './filterColors';

describe('toColorItems', () => {
  it('builds ids/hexes from uppercase hexes, deduping in order', () => {
    const items = toColorItems(['#ff0000', '#FF0000', '#00ff00']);
    expect(items.map((item) => item.id)).toEqual(['#FF0000', '#00FF00']);
    expect(items[1]).toMatchObject({ hex: '#00FF00', name: undefined });
  });

  it('computes hue and CIELab lightness', () => {
    const [red] = toColorItems(['#FF0000']);
    expect(red.hue).toBe(0);
    // colortranslator yields 54.29 for red; palette items share the named-color scale.
    expect(red.lum).toBeCloseTo(54.3, 1);
  });
});

describe('selectColorGroups', () => {
  it('keeps all 664 named colors in the default view', () => {
    const total = selectColorGroups(DEFAULT_FILTERS).reduce((n, g) => n + g.items.length, 0);
    expect(total).toBe(664);
    expect(COLOR_ITEMS).toHaveLength(664);
  });

  it('buckets a palette item like a named item', () => {
    const groups = selectColorGroups(DEFAULT_FILTERS, toColorItems(['#FF0000']));
    expect(groups).toHaveLength(1);
    // origin = hueFrom + middleHue = -180; red (0°) wraps to offset 180 → bucket 1.
    expect(groups[0]).toMatchObject({ from: 300, span: 120 });
    expect(groups[0].items[0].id).toBe('#FF0000');
  });

  it('returns no groups when the filters exclude every palette color', () => {
    expect(
      selectColorGroups({ ...DEFAULT_FILTERS, lumFrom: 90 }, toColorItems(['#FF0000'])),
    ).toEqual([]);
  });
});
