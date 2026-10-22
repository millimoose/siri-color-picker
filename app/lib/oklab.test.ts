import { describe, expect, it } from 'vite-plus/test';
import { hexToRgb, oklabDistance, oklabToSrgb, rgbToHex, srgbToOklab } from './oklab';

const HEXES = ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#808080', '#336699'];

describe('sRGB/OKLab', () => {
  it('round-trips sampled colors within one 8-bit step per channel', () => {
    for (const hex of HEXES) {
      const [r, g, b] = hexToRgb(hex);
      const [L, a, bb] = srgbToOklab(r / 255, g / 255, b / 255);
      const [r2, g2, b2] = oklabToSrgb(L, a, bb);
      expect(Math.abs(Math.round(r2 * 255) - r)).toBeLessThanOrEqual(1);
      expect(Math.abs(Math.round(g2 * 255) - g)).toBeLessThanOrEqual(1);
      expect(Math.abs(Math.round(b2 * 255) - b)).toBeLessThanOrEqual(1);
    }
  });

  it('parses hex case-insensitively and formats uppercase', () => {
    expect(hexToRgb('#ff0000')).toEqual([255, 0, 0]);
    expect(rgbToHex(255, 0, 0)).toBe('#FF0000');
    expect(rgbToHex(-20, 300, 12)).toBe('#00FF0C');
  });

  it('reports zero distance for identical colors', () => {
    const lab = srgbToOklab(0.2, 0.4, 0.6);
    expect(oklabDistance(lab, lab)).toBe(0);
  });
});
