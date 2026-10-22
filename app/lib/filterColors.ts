import { sort } from 'radashi';
import { COLOR_ENTRIES } from './colors';
import { hue, lum } from './colorMath';

export interface ColorFilters {
  middleHue: number; // 0..360 — rotation of the wheel the window operates in
  hueFrom: number; // -180..180 — window start relative to middleHue
  hueTo: number; // -180..180 — window end relative to middleHue
  lumFrom: number; // 0..100 — CIELab L* range start
  lumTo: number; // 0..100 — CIELab L* range end
}

export const DEFAULT_FILTERS: ColorFilters = {
  middleHue: 0,
  hueFrom: -180,
  hueTo: 180,
  lumFrom: 0,
  lumTo: 100,
};

export interface ColorItem {
  id: string; // stable key: named color name, or normalized hex for palette colors
  name?: string; // absent for palette colors
  hex: string;
  hue: number;
  lum: number;
}

// Color parsing is expensive; every entry's hue and lightness are static, so
// derive them once at module load and keep filtering down to comparisons.
export const COLOR_ITEMS: readonly ColorItem[] = COLOR_ENTRIES.map(([name, hex]) => ({
  id: name,
  name,
  hex,
  hue: hue(hex),
  lum: lum(hex),
}));

/** Adapts a palette's hexes to the grid's item shape, deduping defensively. */
export function toColorItems(hexes: readonly string[]): ColorItem[] {
  const items: ColorItem[] = [];
  for (const value of hexes) {
    const hex = value.toUpperCase();
    if (items.some((item) => item.id === hex)) continue;
    items.push({ id: hex, name: undefined, hex, hue: hue(hex), lum: lum(hex) });
  }
  return items;
}

const BUCKET_COUNT = 3;
const wrap = (deg: number) => ((deg % 360) + 360) % 360;

export interface ColorGroup {
  from: number; // absolute hue of bucket start, 0..360
  span: number; // bucket width in degrees
  items: ColorItem[]; // sorted by lum descending
}

export function selectColorGroups(
  filters: ColorFilters,
  items: readonly ColorItem[] = COLOR_ITEMS,
): ColorGroup[] {
  const width = filters.hueTo - filters.hueFrom;
  const origin = filters.hueFrom + filters.middleHue;
  const unit = width / BUCKET_COUNT;

  const matching = items.filter(
    (color) =>
      wrap(color.hue - origin) < width &&
      filters.lumFrom <= color.lum &&
      color.lum <= filters.lumTo,
  );

  const buckets: ColorItem[][] = Array.from({ length: BUCKET_COUNT }, () => []);
  for (const color of matching) {
    buckets[Math.min(Math.floor(wrap(color.hue - origin) / unit), BUCKET_COUNT - 1)].push(color);
  }

  return buckets
    .map((items, i) => ({
      from: wrap(origin + i * unit),
      span: unit,
      items: sort(items, (color) => color.lum, true),
    }))
    .filter((g) => g.items.length > 0);
}
