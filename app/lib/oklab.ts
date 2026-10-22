// sRGB ↔ OKLab conversion (Björn Ottosson's matrices), plus hex helpers.
// Used by the photo quantizer, which clusters in perceptual space; keeping the
// math here makes it unit-testable without a canvas.

export type Oklab = readonly [L: number, a: number, b: number];
export type Rgb = readonly [r: number, g: number, b: number]; // 0..255

const linearize = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const delinearize = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Converts sRGB channels in 0..1 to OKLab. */
export function srgbToOklab(r: number, g: number, b: number): Oklab {
  const lr = linearize(r);
  const lg = linearize(g);
  const lb = linearize(b);

  // linear sRGB → LMS
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  // cube roots, then LMS → OKLab
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ];
}

/** Converts OKLab back to sRGB channels in 0..1, clamped to the gamut. */
export function oklabToSrgb(L: number, a: number, b: number): Rgb {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  // LMS → linear sRGB
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  return [clamp(delinearize(r), 0, 1), clamp(delinearize(g), 0, 1), clamp(delinearize(bb), 0, 1)];
}

/** Parses `#RRGGBB` or `RRGGBB` case-insensitively. Throws on anything else. */
export function hexToRgb(hex: string): [number, number, number] {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) throw new Error(`Invalid hex: ${hex}`);
  const value = Number.parseInt(match[1], 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

/** Formats 0..255 channels as uppercase `#RRGGBB`, clamping and rounding. */
export function rgbToHex(r: number, g: number, b: number): string {
  const channel = (value: number) =>
    Math.round(clamp(value, 0, 255))
      .toString(16)
      .padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`.toUpperCase();
}

/** Euclidean distance in OKLab; 0 for identical colors. */
export function oklabDistance(a: Oklab, b: Oklab): number {
  const dL = a[0] - b[0];
  const da = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dL * dL + da * da + db * db);
}
