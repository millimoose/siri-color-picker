import { describe, expect, it } from 'vite-plus/test';
import { hexToRgb } from './oklab';
import { imageFileError, quantizePixels } from './photoPalette';

function rgbaOf(colors: Array<[hex: string, repeat: number]>): Uint8ClampedArray {
  const pixels = colors.flatMap(([hex, repeat]) => Array.from({ length: repeat }, () => hex));
  const data = new Uint8ClampedArray(pixels.length * 4);
  pixels.forEach((hex, i) => {
    const [r, g, b] = hexToRgb(hex);
    data.set([r, g, b, 255], i * 4);
  });
  return data;
}

describe('imageFileError', () => {
  it('rejects oversized files before decode', () => {
    expect(imageFileError({ size: 20 * 1024 * 1024 + 1, type: 'image/png' })).toBe('too-large');
  });
  it('rejects non-image MIME types but allows an empty type', () => {
    expect(imageFileError({ size: 10, type: 'text/plain' })).toBe('unsupported-type');
    expect(imageFileError({ size: 10, type: '' })).toBeNull();
    expect(imageFileError({ size: 10, type: 'image/png' })).toBeNull();
  });
});

describe('quantizePixels', () => {
  it('returns both colors of a two-color buffer, ties by hex ascending', () => {
    expect(
      quantizePixels(
        rgbaOf([
          ['#FF0000', 50],
          ['#0000FF', 50],
        ]),
      ),
    ).toEqual(['#0000FF', '#FF0000']);
  });

  it('returns six flat colors', () => {
    const buffer = rgbaOf([
      ['#FF0000', 10],
      ['#00FF00', 10],
      ['#0000FF', 10],
      ['#FFFF00', 10],
      ['#00FFFF', 10],
      ['#FF00FF', 10],
    ]);
    expect(quantizePixels(buffer)).toEqual([
      '#0000FF',
      '#00FF00',
      '#00FFFF',
      '#FF0000',
      '#FF00FF',
      '#FFFF00',
    ]);
  });

  it('returns exactly one color for a uniform buffer', () => {
    expect(quantizePixels(rgbaOf([['#0A141E', 16]]))).toEqual(['#0A141E']);
  });

  it('returns no colors when every pixel is transparent', () => {
    expect(quantizePixels(new Uint8ClampedArray(16))).toEqual([]);
  });

  it('drops a cluster below 0.5% of visible pixels', () => {
    expect(
      quantizePixels(
        rgbaOf([
          ['#FF0000', 399],
          ['#00FF00', 1],
        ]),
      ),
    ).toEqual(['#FF0000']);
  });

  it('is deterministic', () => {
    const buffer = rgbaOf([
      ['#336699', 20],
      ['#CC8844', 20],
      ['#112233', 5],
    ]);
    expect(quantizePixels(buffer)).toEqual(quantizePixels(buffer));
  });

  it('does not emit duplicate hexes for near-duplicate shades', () => {
    const colors = quantizePixels(
      rgbaOf([
        ['#808080', 40],
        ['#818181', 40],
      ]),
    );
    expect(colors).toHaveLength(1);
    expect(new Set(colors).size).toBe(1);
  });
});
