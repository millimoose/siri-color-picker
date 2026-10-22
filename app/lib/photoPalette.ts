import { oklabDistance, oklabToSrgb, rgbToHex, srgbToOklab, type Oklab } from './oklab';

export type PhotoPaletteErrorCode =
  | 'unsupported-type'
  | 'too-large'
  | 'decode-failed'
  | 'no-visible-pixels';

export const PHOTO_PALETTE_ERROR_MESSAGES = {
  'unsupported-type':
    "That file isn't an image. Choose a PNG, JPEG, WebP, GIF, or another image file.",
  'too-large': 'That image is larger than 20 MB. Choose a smaller file.',
  'decode-failed': "That image couldn't be opened. Try a different file.",
  'no-visible-pixels': 'That image has no visible pixels to sample.',
} as const satisfies Record<PhotoPaletteErrorCode, string>;

export class PhotoPaletteError extends Error {
  readonly code: PhotoPaletteErrorCode;

  constructor(code: PhotoPaletteErrorCode) {
    super(PHOTO_PALETTE_ERROR_MESSAGES[code]);
    this.name = 'PhotoPaletteError';
    this.code = code;
  }
}

export const DEFAULT_PALETTE_SIZE = 6;
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_SAMPLE_EDGE = 200;
export const SEED_MIN_DISTANCE = 0.06;
export const MAX_ITERATIONS = 12;
export const MIN_CLUSTER_WEIGHT = 0.005;

const BIN_COUNT = 32 ** 3;
const BIN_COUNT_OFFSET = 5;
const ALPHA_VISIBLE = 128;
const CHANNEL_BITS = 5;

/** Size/MIME guard. Runs before any decode so oversized files never allocate. */
export function imageFileError(file: { size: number; type: string }): PhotoPaletteErrorCode | null {
  if (file.size > MAX_FILE_BYTES) return 'too-large';
  if (file.type !== '' && !file.type.startsWith('image/')) return 'unsupported-type';
  return null;
}

/**
 * Area-weighted 5-bit histogram + weighted k-means in OKLab.
 * Transparent pixels are ignored; bins are weighted by pixel count so a large
 * flat background cannot be drowned out by a noisy subject.
 */
export function quantizePixels(
  rgba: Uint8ClampedArray,
  colorCount = DEFAULT_PALETTE_SIZE,
): string[] {
  if (colorCount < 1) return [];

  const counts = new Int32Array(BIN_COUNT);
  const sums = new Float64Array(BIN_COUNT * 3);
  let visibleCount = 0;

  for (let i = 0; i + 3 < rgba.length; i += 4) {
    if (rgba[i + 3] < ALPHA_VISIBLE) continue;
    visibleCount += 1;
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];
    const bin =
      ((r >> (8 - CHANNEL_BITS)) << (CHANNEL_BITS * 2)) |
      ((g >> (8 - CHANNEL_BITS)) << BIN_COUNT_OFFSET) |
      (b >> (8 - CHANNEL_BITS));
    counts[bin] += 1;
    sums[bin * 3] += r;
    sums[bin * 3 + 1] += g;
    sums[bin * 3 + 2] += b;
  }

  if (visibleCount === 0) return [];

  // Bins in ascending index order keep every tie deterministic.
  const bins: Array<{ index: number; count: number; lab: Oklab }> = [];
  for (let index = 0; index < BIN_COUNT; index++) {
    const count = counts[index];
    if (count === 0) continue;
    bins.push({
      index,
      count,
      lab: srgbToOklab(
        sums[index * 3] / count / 255,
        sums[index * 3 + 1] / count / 255,
        sums[index * 3 + 2] / count / 255,
      ),
    });
  }

  // Seeds: most populous bins that are perceptually far from every earlier seed.
  const ordered = [...bins].sort((a, b) => b.count - a.count || a.index - b.index);
  const seeds: typeof bins = [];
  for (const bin of ordered) {
    if (seeds.length === colorCount) break;
    if (seeds.every((seed) => oklabDistance(seed.lab, bin.lab) >= SEED_MIN_DISTANCE)) {
      seeds.push(bin);
    }
  }

  type Lab = [number, number, number];
  let centroids: Lab[] = seeds.map((seed) => [...seed.lab]);
  const assignment = new Int32Array(bins.length).fill(-1);

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    let changed = false;
    for (let i = 0; i < bins.length; i++) {
      let nearest = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (let c = 0; c < centroids.length; c++) {
        const distance = oklabDistance(bins[i].lab, centroids[c]);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = c;
        }
      }
      if (assignment[i] !== nearest) {
        assignment[i] = nearest;
        changed = true;
      }
    }
    if (!changed) break;

    const weights = new Float64Array(centroids.length);
    const sumsOfLabs: Lab[] = centroids.map(() => [0, 0, 0]);
    for (let i = 0; i < bins.length; i++) {
      const cluster = assignment[i];
      const weight = bins[i].count;
      weights[cluster] += weight;
      sumsOfLabs[cluster][0] += bins[i].lab[0] * weight;
      sumsOfLabs[cluster][1] += bins[i].lab[1] * weight;
      sumsOfLabs[cluster][2] += bins[i].lab[2] * weight;
    }

    let dropped = false;
    const kept: Lab[] = [];
    for (let c = 0; c < centroids.length; c++) {
      if (weights[c] === 0) {
        dropped = true;
        continue;
      }
      kept.push([
        sumsOfLabs[c][0] / weights[c],
        sumsOfLabs[c][1] / weights[c],
        sumsOfLabs[c][2] / weights[c],
      ]);
    }
    centroids = kept;
    // Cluster indices moved; force a fresh assignment pass next iteration.
    if (dropped) assignment.fill(-1);
  }

  const clusterWeights = new Float64Array(centroids.length);
  for (let i = 0; i < bins.length; i++) {
    clusterWeights[assignment[i]] += bins[i].count;
  }

  const results: Array<{ hex: string; weight: number }> = [];
  for (let c = 0; c < centroids.length; c++) {
    const weight = clusterWeights[c];
    if (weight / visibleCount < MIN_CLUSTER_WEIGHT) continue;
    const [r, g, b] = oklabToSrgb(...centroids[c]);
    const hex = rgbToHex(r * 255, g * 255, b * 255);
    const existing = results.find((entry) => entry.hex === hex);
    if (existing) {
      existing.weight = Math.max(existing.weight, weight);
    } else {
      results.push({ hex, weight });
    }
  }

  return results
    .sort((a, b) => b.weight - a.weight || (a.hex < b.hex ? -1 : a.hex > b.hex ? 1 : 0))
    .slice(0, colorCount)
    .map((entry) => entry.hex);
}

interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // Older browsers reject the options bag; retry bare before the <img> path.
      try {
        const bitmap = await createImageBitmap(file);
        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          release: () => bitmap.close(),
        };
      } catch {
        // fall through to <img>
      }
    }
  }

  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    release: () => {
      image.src = '';
      URL.revokeObjectURL(url);
    },
  };
}

function readSamplePixels(image: DecodedImage): Uint8ClampedArray {
  const scale = Math.min(1, MAX_SAMPLE_EDGE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const context =
    typeof OffscreenCanvas === 'function'
      ? new OffscreenCanvas(width, height).getContext('2d', { willReadFrequently: true })
      : Object.assign(document.createElement('canvas'), { width, height }).getContext('2d', {
          willReadFrequently: true,
        });
  if (!context) throw new Error('Canvas 2D context unavailable');

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image.source, 0, 0, width, height);
  return context.getImageData(0, 0, width, height).data;
}

/** Decodes, downscales, and quantizes an uploaded image entirely on-device. */
export async function extractPaletteFromFile(file: File): Promise<string[]> {
  const fileError = imageFileError(file);
  if (fileError) throw new PhotoPaletteError(fileError);

  let rgba: Uint8ClampedArray;
  const image = await decodeImage(file).catch(() => {
    throw new PhotoPaletteError('decode-failed');
  });
  try {
    rgba = readSamplePixels(image);
  } catch {
    throw new PhotoPaletteError('decode-failed');
  } finally {
    image.release();
  }

  const colors = quantizePixels(rgba);
  if (colors.length === 0) throw new PhotoPaletteError('no-visible-pixels');
  return colors;
}
