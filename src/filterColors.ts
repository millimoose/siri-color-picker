import { group, sort } from 'radashi';
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
  name: string;
  hex: string;
  hue: number;
  lum: number;
}

// Color parsing is expensive; every entry's hue and lightness are static, so
// derive them once at module load and keep filtering down to comparisons.
const COLOR_ITEMS: ColorItem[] = COLOR_ENTRIES.map(([name, hex]) => ({
  name,
  hex,
  hue: hue(hex),
  lum: lum(hex),
}));

const BUCKET_COUNT = 3;
const wrap = (deg: number) => ((deg % 360) + 360) % 360;

export function selectColorGroups(filters: ColorFilters): ColorItem[][] {
  const width = filters.hueTo - filters.hueFrom;
  const origin = filters.hueFrom + filters.middleHue;
  const unit = width / BUCKET_COUNT;

  const matching = COLOR_ITEMS.filter(
    (color) =>
      wrap(color.hue - origin) < width &&
      filters.lumFrom <= color.lum &&
      color.lum <= filters.lumTo,
  );

  return Object.values(
    group(matching, (color) =>
      Math.min(Math.floor(wrap(color.hue - origin) / unit), BUCKET_COUNT - 1),
    ),
  ).map((bucket) => sort(bucket ?? [], (color) => color.lum, true));
}
