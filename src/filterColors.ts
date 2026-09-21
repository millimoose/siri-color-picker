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

const BUCKET_COUNT = 3;
const wrap = (deg: number) => ((deg % 360) + 360) % 360;

export function selectColorGroups(filters: ColorFilters): [string, string][][] {
  const width = filters.hueTo - filters.hueFrom;
  const origin = filters.hueFrom + filters.middleHue;
  const unit = width / BUCKET_COUNT;

  const matching = COLOR_ENTRIES.filter(([, hex]) => {
    const lightness = lum(hex);
    return (
      wrap(hue(hex) - origin) < width && filters.lumFrom <= lightness && lightness <= filters.lumTo
    );
  });

  return Object.values(
    group(matching, ([, hex]) =>
      Math.min(Math.floor(wrap(hue(hex) - origin) / unit), BUCKET_COUNT - 1),
    ),
  ).map((bucket) => sort(bucket ?? [], ([, hex]) => lum(hex), true));
}
