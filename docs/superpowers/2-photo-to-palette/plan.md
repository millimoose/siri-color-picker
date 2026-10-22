# Photo → Named Palette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user upload a photo, extract its dominant colors in the browser, save them as a named palette in `localStorage`, and browse those exact colors through the existing hue/lightness picker grid.

**Architecture:** Four pure modules carry all logic — OKLab math, an area-weighted 5-bit histogram + weighted k-means quantizer, a validated `localStorage` store with an external-store snapshot, and a generalized `selectColorGroups(filters, items)` — so every rule is unit-testable without a DOM. Two React components (`PaletteSourceBar`, `PaletteManagerDialog`) and the index route wire those modules into the existing shadcn/Tailwind UI; only the decode/downscale wrapper touches Canvas.

**Tech Stack:** React 19, React Router 7 (SSR + prerender), TypeScript 7, Tailwind v4 + shadcn (`radix-mira`), Vitest via `vp test`, Vite+ (`vp install`, `vp check`, `vpr build`).

**Spec:** `docs/superpowers/2-photo-to-palette/spec.md`

## Global Constraints

- Static hosting: all image processing client-side; the image MUST never be uploaded, fetched, or persisted.
- File guard: reject `file.size > 20 * 1024 * 1024` before decode; accept empty MIME and attempt decode, reject other non-`image/*` types.
- Sampling: longest edge scaled to at most **200 px**, each edge at least 1 px.
- Extraction: **6** colors target (`DEFAULT_PALETTE_SIZE = 6`), fewer when the photo has fewer distinct dominant colors.
- Quantizer constants: 5 bits per channel, seed separation **0.06**, **12** Lloyd iterations, drop clusters under **0.5%** of visible pixels.
- Palettes: 1–6 colors, uppercase `#RRGGBB`, name trimmed 1–40 chars, unique case-insensitively; storage key `siri-color-picker:palettes:v1`, envelope `{ "version": 1, "palettes": Palette[] }`.
- No `localStorage` access at module import or during SSR render; the server snapshot is referentially stable.
- No new runtime dependencies. Only already-installed `radix-ui`, `lucide-react`, `sonner`, `radashi`, `colortranslator`.
- Named color data (`app/lib/colors.ts`, 664 entries) and its hex casing stay unchanged.
- Toolchain: Node 20.20.2, Bun 1.4.2. Verify with `vp check`, `vp test`, `vpr build` (`react-router build`, never `vp build`). Base path `/siri-color-picker/`.
- Every task ends green: `vp check` and `vp test` pass, and the task's own tests are included in the run.

## Assumptions (non-interactive session — review these)

| # | Decision | Reason / consequence |
| --- | --- | --- |
| P1 | Test config lives as a `test: { include: ['app/**/*.test.ts'], environment: 'node' }` block in `vite.config.ts`; tests import from `vite-plus/test` (Vite+ 0.3.3 bundles Vitest 4.1.11, which supports Node 20). | Avoids a second runner and keeps one config. If the `reactRouter()` plugin breaks Vitest's config load, move only the test block + alias into `vitest.config.ts` and run `vp test --config vitest.config.ts`, updating README/CI in Task 6. Criterion: a failing `vp test` whose error names the React Router plugin. |
| P2 | The plan supersedes the spec on two review findings. **AC 5** is narrowed to: only a read that *threw* (`error === 'unavailable'`) is write-protected; a successful save after `corrupt`/`partial` rewrites the surviving palettes. **Delete** failures now toast "Deleted “name” for this session only". | The spec's AC 5 wording contradicted its storage design; a delete write failure would otherwise vanish silently, breaking the anti-goal. |
| P3 | `addPalette` uppercases, dedupes preserving order, and caps at 6 colors before validation, exactly like `parseStoredPalettes`. | Keeps the in-memory palette equal to the persisted one; prevents an in-memory invariant violation until reload. |
| P4 | Extraction error copy is fixed in `photoPalette.ts` as `PHOTO_PALETTE_ERROR_MESSAGES` and used verbatim in the dialog. | The spec named only name-validation copy; divergent invented strings would break `role="alert"` assertions and cross-task consistency. |
| P5 | `defaultPaletteName(fileName)`, `normalizePaletteName(name)`, and `hasPaletteName(palettes, name)` live in `app/lib/palettes.ts`. | The dialog and store must agree on trimming/case rules; pure helpers make that testable without a DOM. |
| P6 | `imageFileError(file)` is exported from `photoPalette.ts` and called by `extractPaletteFromFile`. | The size/MIME guards are the only extraction rules testable in Node; exporting them turns a manual check into a unit test. |
| P7 | UI entry labels stay as specified: header "Palettes", source-bar "From photo". | A8 fixed these; the review's "Add from photo…" suggestion is cosmetic and not adopted. |
| P8 | Quantitative checks stay in node-environment unit tests; the React/DOM surface is verified by `vp check` plus the manual smoke in Task 6. No jsdom/testing-library is added. | The spec lists only pure-module tests and forbids a second runner; adding a DOM test stack would exceed the accepted scope. |
| P9 | `ColorItem.id` is the palette hex (`#RRGGBB`) or the named color's name; `toColorItems` uppercases before deduping. | React keys stay unique per source; palette hexes are already unique by construction. |
| P10 | One `AlertDialog` instance in the dialog is driven by `pendingDelete: Palette | null`, not one per row. | Radix nested-dialog focus is the spec's known risk; a single controlled confirm avoids stacking triggers. |

## Review Focus

1. **Prerender/hydration:** importing the store or calling the hook on the server must not touch `localStorage` or `window`; test in Task 3 (`getPalettesSnapshot()` with no `window`, stable server snapshot) and hydration check in Task 6.
2. **Unreadable storage is never clobbered:** a read that threw must block `setItem` for the rest of the session, while `corrupt`/`partial` must recover on the next successful write; test in Task 3.
3. **Extraction refusal paths:** non-image files, >20 MB, and transparent-only images must produce visible inline messages and never a rejected promise nobody handles; `imageFileError` tests in Task 2, dialog wiring + smoke in Tasks 5/6.
4. **Degenerate quantizer input:** uniform photos, fewer than 6 dominant colors, sub-0.5% accents, and repeat runs must yield 1 color, fewer colors, no accent, and identical output; tests in Task 2.
5. **Name identity:** names differing only by case or whitespace, 41-char names, and blank stems must not create duplicates or unusable rows; tests in Task 3, inline gating in Task 5.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `app/lib/oklab.ts` (new) | sRGB↔OKLab conversion, hex parse/format, OKLab distance. |
| `app/lib/photoPalette.ts` (new) | File guards, Canvas decode/downscale wrapper, pure quantizer, typed errors + copy. |
| `app/lib/palettes.ts` (new) | `Palette` model, parse/validate, localStorage store + subscriptions, name helpers. |
| `app/lib/usePalettes.ts` (new) | `useSyncExternalStore` binding. |
| `app/lib/filterColors.ts` (modify) | `ColorItem` gains `id`/optional `name`; exports `COLOR_ITEMS`, `toColorItems`; item source parameter. |
| `app/components/ColorSwatch.tsx` (modify) | Optional name; mono hex fallback label. |
| `app/components/ColorGroup.tsx` (modify) | Key rows by `color.id`, forward optional name. |
| `app/components/PaletteSourceBar.tsx` (new) | Source `Select` + "From photo" button. |
| `app/components/PaletteManagerDialog.tsx` (new) | Create-from-photo flow, saved list, delete confirm, storage notices. |
| `app/components/ui/{dialog,alert-dialog,input,select}.tsx` (new) | shadcn primitives. |
| `app/routes/_index.tsx` (modify) | Source state, effective source, memoized items, header count, both entry buttons. |
| `app/lib/*.test.ts` (new) | Unit tests for oklab, photoPalette, palettes, filterColors. |
| `vite.config.ts` (modify) | Test block. |
| `README.md`, `.github/workflows/pages.yml` (modify) | Feature + privacy + test docs; CI test step. |

---

### Task 1: OKLab conversion module and Vitest harness

**Files:**
- Create: `app/lib/oklab.ts`, `app/lib/oklab.test.ts`
- Modify: `vite.config.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export type Oklab = readonly [L: number, a: number, b: number];
  export type Rgb = readonly [r: number, g: number, b: number]; // 0..255
  export function srgbToOklab(r: number, g: number, b: number): Oklab; // channels 0..1
  export function oklabToSrgb(L: number, a: number, b: number): Rgb;   // 0..1, clamped
  export function hexToRgb(hex: string): [number, number, number];    // throws on non-#RRGGBB
  export function rgbToHex(r: number, g: number, b: number): string;  // uppercase, clamped
  export function oklabDistance(a: Oklab, b: Oklab): number;
  ```

- [ ] **Step 1: Install dependencies**

Run: `vp install`
Expected: exit 0, `node_modules` present.

- [ ] **Step 2: Add the test block to `vite.config.ts`**

Inside the existing `defineConfig({ ... })`, after `lint`, add:

```ts
  test: {
    include: ['app/**/*.test.ts'],
    environment: 'node',
  },
```

- [ ] **Step 3: Write the failing test `app/lib/oklab.test.ts`**

```ts
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
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `vp test app/lib/oklab.test.ts`
Expected: FAIL — cannot resolve `./oklab`.

- [ ] **Step 5: Implement `app/lib/oklab.ts`**

Use Ottosson's matrices. Companding: `linear = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4`; inverse `c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055`.

```ts
// linear sRGB → LMS
l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
l_ = Math.cbrt(l); m_ = Math.cbrt(m); s_ = Math.cbrt(s);
L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
b = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;
// inverse
l_ = L + 0.3963377774 * a + 0.2158037573 * b;
m_ = L - 0.1055613458 * a - 0.0638541728 * b;
s_ = L - 0.0894841775 * a - 1.2914855480 * b;
l = l_ ** 3; m = m_ ** 3; s = s_ ** 3;
r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
b = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
```

`rgbToHex` clamps each channel to 0..255, rounds, pads with `padStart(2, '0')`, and uppercases. `hexToRgb` matches `/^#?([0-9a-f]{6})$/i` and throws `new Error(\`Invalid hex: ${hex}\`)` otherwise.

- [ ] **Step 6: Run the test to verify it passes**

Run: `vp test app/lib/oklab.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 7: Run the full check**

Run: `vp check`
Expected: no errors (formatting, lint, types).

- [ ] **Step 8: Commit**

```bash
git add app/lib/oklab.ts app/lib/oklab.test.ts vite.config.ts
git commit -m "feat: add oklab color conversion with test harness"
```

---

### Task 2: Photo decoding and color quantization

**Files:**
- Create: `app/lib/photoPalette.ts`, `app/lib/photoPalette.test.ts`

**Interfaces:**
- Consumes: `hexToRgb`, `oklabDistance`, `oklabToSrgb`, `rgbToHex`, `srgbToOklab` from `~/lib/oklab` (Task 1).
- Produces:
  ```ts
  export type PhotoPaletteErrorCode =
    | 'unsupported-type' | 'too-large' | 'decode-failed' | 'no-visible-pixels';
  export const PHOTO_PALETTE_ERROR_MESSAGES: Record<PhotoPaletteErrorCode, string>;
  export class PhotoPaletteError extends Error { readonly code: PhotoPaletteErrorCode }
  export const DEFAULT_PALETTE_SIZE = 6;
  export const MAX_FILE_BYTES = 20 * 1024 * 1024;
  export const MAX_SAMPLE_EDGE = 200;
  export const SEED_MIN_DISTANCE = 0.06;
  export const MAX_ITERATIONS = 12;
  export const MIN_CLUSTER_WEIGHT = 0.005;
  export function imageFileError(file: { size: number; type: string }): PhotoPaletteErrorCode | null;
  export function quantizePixels(rgba: Uint8ClampedArray, colorCount?: number): string[];
  export async function extractPaletteFromFile(file: File): Promise<string[]>;
  ```

- [ ] **Step 1: Write the failing tests `app/lib/photoPalette.test.ts`**

```ts
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
    expect(quantizePixels(rgbaOf([['#FF0000', 50], ['#0000FF', 50]]))).toEqual([
      '#0000FF',
      '#FF0000',
    ]);
  });

  it('returns six flat colors', () => {
    const buffer = rgbaOf([
      ['#FF0000', 10], ['#00FF00', 10], ['#0000FF', 10],
      ['#FFFF00', 10], ['#00FFFF', 10], ['#FF00FF', 10],
    ]);
    expect(quantizePixels(buffer)).toEqual([
      '#0000FF', '#00FF00', '#00FFFF', '#FF0000', '#FF00FF', '#FFFF00',
    ]);
  });

  it('returns exactly one color for a uniform buffer', () => {
    expect(quantizePixels(rgbaOf([['#0A141E', 16]]))).toEqual(['#0A141E']);
  });

  it('returns no colors when every pixel is transparent', () => {
    expect(quantizePixels(new Uint8ClampedArray(16))).toEqual([]);
  });

  it('drops a cluster below 0.5% of visible pixels', () => {
    expect(quantizePixels(rgbaOf([['#FF0000', 399], ['#00FF00', 1]]))).toEqual(['#FF0000']);
  });

  it('is deterministic', () => {
    const buffer = rgbaOf([['#336699', 20], ['#CC8844', 20], ['#112233', 5]]);
    expect(quantizePixels(buffer)).toEqual(quantizePixels(buffer));
  });

  it('does not emit duplicate hexes for near-duplicate shades', () => {
    const colors = quantizePixels(rgbaOf([['#808080', 40], ['#818181', 40]]));
    expect(colors).toHaveLength(1);
    expect(new Set(colors).size).toBe(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `vp test app/lib/photoPalette.test.ts`
Expected: FAIL — cannot resolve `./photoPalette`.

- [ ] **Step 3: Implement `app/lib/photoPalette.ts`**

- Error copy (used verbatim):
  ```ts
  export const PHOTO_PALETTE_ERROR_MESSAGES = {
    'unsupported-type': "That file isn't an image. Choose a PNG, JPEG, WebP, GIF, or another image file.",
    'too-large': 'That image is larger than 20 MB. Choose a smaller file.',
    'decode-failed': "That image couldn't be opened. Try a different file.",
    'no-visible-pixels': 'That image has no visible pixels to sample.',
  } as const;
  ```
  `PhotoPaletteError` calls `super(PHOTO_PALETTE_ERROR_MESSAGES[code])`, sets `this.name = 'PhotoPaletteError'` and `this.code`.
- `imageFileError`: `size > MAX_FILE_BYTES` → `'too-large'`; `type !== '' && !type.startsWith('image/')` → `'unsupported-type'`; else `null`.
- `quantizePixels`, in this order:
  1. Return `[]` if `colorCount < 1`. Walk 4-byte pixels; skip `alpha < 128`; count visible pixels. If 0 → `[]`.
  2. Histogram: `Int32Array(32768)` counts + `Float64Array(32768 * 3)` channel sums, index `((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)`.
  3. Build bin records `{ index, count, lab }` in ascending bin index; `lab = srgbToOklab(meanR / 255, meanG / 255, meanB / 255)`.
  4. Seeds: sort a copy by `count` descending, ties by bin index ascending. Accept a bin when its OKLab distance to every accepted seed is `>= SEED_MIN_DISTANCE`, until `colorCount` seeds. Fewer seeds is valid.
  5. Lloyd: at most `MAX_ITERATIONS`; assign each bin to the nearest centroid by `oklabDistance`; recompute each centroid as the count-weighted mean of its bins; drop clusters with zero weight; stop early when the assignment array is unchanged.
  6. Convert survivors; drop those whose weight / visibleCount `< MIN_CLUSTER_WEIGHT`.
  7. `oklabToSrgb` → clamp/round via `rgbToHex`, pair with weight; dedupe by hex keeping the larger weight; sort by weight descending, ties by hex ascending; slice to `colorCount`.
- `extractPaletteFromFile`: `imageFileError` → throw `PhotoPaletteError`. Decode via `createImageBitmap(file, { imageOrientation: 'from-image' })`, retry bare on throw, fallback to `<img>` + object URL + `decode()`. Draw to `OffscreenCanvas` (fallback `<canvas>`) scaled so `max(w, h) <= MAX_SAMPLE_EDGE` (both edges `Math.max(1, Math.round(...))`), `imageSmoothingQuality = 'high'`, `willReadFrequently: true`. `getImageData(...).data`, then `bitmap.close()` / `img.src = ''` / `URL.revokeObjectURL` in `finally`. Any decode/draw failure → `PhotoPaletteError('decode-failed')`. Empty quantizer output → `PhotoPaletteError('no-visible-pixels')`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `vp test app/lib/photoPalette.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Run the full check**

Run: `vp check`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/lib/photoPalette.ts app/lib/photoPalette.test.ts
git commit -m "feat: quantize dominant photo colors with typed errors"
```

---

### Task 3: Palette store, validation, and persistence

**Files:**
- Create: `app/lib/palettes.ts`, `app/lib/palettes.test.ts`

**Interfaces:**
- Consumes: nothing (pure + `localStorage`).
- Produces:
  ```ts
  export interface Palette { id: string; name: string; colors: string[]; createdAt: string }
  export interface PaletteStoreState {
    palettes: Palette[];
    error: 'corrupt' | 'partial' | 'unavailable' | null;
  }
  export const PALETTE_STORAGE_KEY = 'siri-color-picker:palettes:v1';
  export const MAX_PALETTE_COLORS = 6;
  export const MAX_PALETTE_NAME_LENGTH = 40;
  export function parseStoredPalettes(raw: string | null): PaletteStoreState;
  export function getPalettesSnapshot(): PaletteStoreState;
  export function getServerPalettesSnapshot(): PaletteStoreState;
  export function subscribePalettes(listener: () => void): () => void;
  export type AddPaletteResult =
    | { ok: true; palette: Palette; persisted: boolean }
    | { ok: false; reason: 'invalid' | 'duplicate-name' };
  export function addPalette(input: { name: string; colors: string[] }): AddPaletteResult;
  export function deletePalette(id: string): boolean;
  export function normalizePaletteName(name: string): string | null;
  export function hasPaletteName(palettes: readonly Palette[], name: string): boolean;
  export function defaultPaletteName(fileName: string): string;
  ```

- [ ] **Step 1: Write the failing tests `app/lib/palettes.test.ts`**

```ts
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  defaultPaletteName, hasPaletteName, normalizePaletteName, parseStoredPalettes,
} from './palettes';

const KEY = 'siri-color-picker:palettes:v1';
const CREATED_AT = '2026-01-01T00:00:00.000Z';

function makeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  const getItem = vi.fn((key: string) => map.get(key) ?? null);
  const setItem = vi.fn((key: string, value: string) => {
    map.set(key, value);
  });
  const storage = {
    getItem,
    setItem,
    removeItem: vi.fn((key: string) => map.delete(key)),
    clear: vi.fn(() => map.clear()),
    key: vi.fn(() => null),
    length: 0,
  } as unknown as Storage;
  return { storage, getItem, setItem, map };
}

async function loadStore(storage: Storage) {
  vi.resetModules();
  const addEventListener = vi.fn((_type: string, _handler: (event: StorageEvent) => void) => {});
  vi.stubGlobal('window', {
    localStorage: storage,
    addEventListener,
    removeEventListener: vi.fn(),
  });
  const store = await import('./palettes');
  return { store, addEventListener };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});
```

`describe('parseStoredPalettes')`:

```ts
it('returns an empty clean state for missing data', () => {
  expect(parseStoredPalettes(null)).toEqual({ palettes: [], error: null });
});

it('flags malformed JSON and wrong versions as corrupt', () => {
  expect(parseStoredPalettes('{')).toEqual({ palettes: [], error: 'corrupt' });
  expect(parseStoredPalettes('{"version":2,"palettes":[]}')).toEqual({
    palettes: [], error: 'corrupt',
  });
});

it('keeps valid entries, drops unusable ones, and reports partial', () => {
  const raw = JSON.stringify({ version: 1, palettes: [
    { id: 'a', name: 'Sunset', colors: ['#ff0000'], createdAt: CREATED_AT },
    { id: 'b', name: 'Broken', colors: ['red'], createdAt: CREATED_AT },
  ] });
  expect(parseStoredPalettes(raw)).toEqual({
    palettes: [{ id: 'a', name: 'Sunset', colors: ['#FF0000'], createdAt: CREATED_AT }],
    error: 'partial',
  });
});

it('normalizes colors, caps at six, and keeps the first duplicate id/name', () => {
  const raw = JSON.stringify({ version: 1, palettes: [
    { id: 'a', name: 'Sunset', createdAt: CREATED_AT, colors: [
      '#ff0000', '#FF0000', '#00ff00', '#0000ff',
      '#ffff00', '#00ffff', '#ff00ff', '#123456',
    ] },
    { id: 'a', name: 'Other', colors: ['#111111'], createdAt: CREATED_AT },
    { id: 'b', name: '  SUNSET ', colors: ['#222222'], createdAt: CREATED_AT },
  ] });
  expect(parseStoredPalettes(raw)).toEqual({
    palettes: [{
      id: 'a', name: 'Sunset', createdAt: CREATED_AT,
      colors: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF'],
    }],
    error: 'partial',
  });
});
```

`describe('palette store')`:

```ts
it('writes the envelope and updates the snapshot on add', async () => {
  const { storage, setItem } = makeStorage();
  const { store } = await loadStore(storage);
  const result = store.addPalette({ name: '  Bay  ', colors: ['#ff0000', '#FF0000'] });
  if (!result.ok) throw new Error('expected ok');
  expect(result.persisted).toBe(true);
  expect(result.palette).toMatchObject({ name: 'Bay', colors: ['#FF0000'] });
  expect(setItem).toHaveBeenCalledWith(
    KEY,
    JSON.stringify({ version: 1, palettes: [result.palette] }),
  );
  expect(store.getPalettesSnapshot()).toEqual({ palettes: [result.palette], error: null });
});

it('rejects invalid and duplicate names, case- and whitespace-insensitively', async () => {
  const { storage } = makeStorage();
  const { store } = await loadStore(storage);
  expect(store.addPalette({ name: '   ', colors: ['#FF0000'] }))
    .toEqual({ ok: false, reason: 'invalid' });
  expect(store.addPalette({ name: 'a'.repeat(41), colors: ['#FF0000'] }))
    .toEqual({ ok: false, reason: 'invalid' });
  expect(store.addPalette({ name: 'Not a color', colors: ['red'] }))
    .toEqual({ ok: false, reason: 'invalid' });
  expect(store.addPalette({ name: 'Bay', colors: ['#FF0000'] }).ok).toBe(true);
  expect(store.addPalette({ name: '  bay  ', colors: ['#00FF00'] }))
    .toEqual({ ok: false, reason: 'duplicate-name' });
});

it('removes a palette and persists the removal', async () => {
  const { storage, setItem } = makeStorage();
  const { store } = await loadStore(storage);
  const first = store.addPalette({ name: 'One', colors: ['#FF0000'] });
  const second = store.addPalette({ name: 'Two', colors: ['#00FF00'] });
  if (!first.ok || !second.ok) throw new Error('expected ok');
  expect(store.deletePalette(first.palette.id)).toBe(true);
  expect(store.getPalettesSnapshot().palettes.map((p) => p.name)).toEqual(['Two']);
  expect(setItem).toHaveBeenCalledTimes(3);
});

it('keeps the in-memory palette when the write throws', async () => {
  const { storage, setItem } = makeStorage();
  const { store } = await loadStore(storage);
  setItem.mockImplementation(() => {
    throw new Error('quota');
  });
  expect(store.addPalette({ name: 'Session', colors: ['#FF0000'] }))
    .toMatchObject({ ok: true, persisted: false });
  expect(store.getPalettesSnapshot().palettes.map((p) => p.name)).toEqual(['Session']);
});

it('deletes from memory and returns false when the delete write throws', async () => {
  const { storage, setItem } = makeStorage();
  const { store } = await loadStore(storage);
  const added = store.addPalette({ name: 'Doomed', colors: ['#FF0000'] });
  if (!added.ok) throw new Error('expected ok');
  setItem.mockImplementation(() => {
    throw new Error('quota');
  });
  expect(store.deletePalette(added.palette.id)).toBe(false);
  expect(store.getPalettesSnapshot().palettes).toEqual([]);
});

it('surfaces a throwing read as unavailable and never writes', async () => {
  const { storage, getItem, setItem } = makeStorage();
  getItem.mockImplementation(() => {
    throw new Error('blocked');
  });
  const { store } = await loadStore(storage);
  expect(store.getPalettesSnapshot()).toEqual({ palettes: [], error: 'unavailable' });
  const added = store.addPalette({ name: 'Memory', colors: ['#FF0000'] });
  if (!added.ok) throw new Error('expected ok');
  expect(added.persisted).toBe(false);
  expect(store.deletePalette(added.palette.id)).toBe(false);
  expect(setItem).not.toHaveBeenCalled();
});

it('recovers from corrupt storage on the next successful save', async () => {
  const { storage, setItem } = makeStorage({ [KEY]: '{' });
  const { store } = await loadStore(storage);
  expect(store.getPalettesSnapshot().error).toBe('corrupt');
  expect(store.addPalette({ name: 'Fixed', colors: ['#FF0000'] }))
    .toMatchObject({ ok: true, persisted: true });
  expect(store.getPalettesSnapshot().error).toBeNull();
  expect(setItem).toHaveBeenCalledTimes(1);
});

it('returns a stable empty snapshot on the server', async () => {
  vi.unstubAllGlobals();
  vi.resetModules();
  const store = await import('./palettes');
  const server = store.getServerPalettesSnapshot();
  expect(store.getPalettesSnapshot()).toBe(server);
  expect(store.getServerPalettesSnapshot()).toBe(server);
  expect(server).toEqual({ palettes: [], error: null });
});

it('invalidates the cache when storage changes in another tab', async () => {
  const { storage, map } = makeStorage();
  const { store, addEventListener } = await loadStore(storage);
  const listener = vi.fn();
  store.subscribePalettes(listener);
  const handler = addEventListener.mock.calls.find(([type]) => type === 'storage')?.[1];
  if (!handler) throw new Error('missing storage listener');
  const remote = { id: 'x', name: 'Remote', colors: ['#FF0000'], createdAt: CREATED_AT };
  map.set(KEY, JSON.stringify({ version: 1, palettes: [remote] }));
  handler({ key: KEY } as StorageEvent);
  expect(listener).toHaveBeenCalledTimes(1);
  expect(store.getPalettesSnapshot().palettes).toEqual([remote]);
});
```

`describe('name helpers')`:

```ts
it('derives a default name from the filename', () => {
  expect(defaultPaletteName('sunset-over-bay.png')).toBe('sunset-over-bay');
  expect(defaultPaletteName('.hidden')).toBe('.hidden');
  expect(defaultPaletteName('a'.repeat(60) + '.jpg')).toBe('a'.repeat(40));
  expect(defaultPaletteName('   .png')).toBe('Untitled palette');
});

it('normalizes and compares names', () => {
  expect(normalizePaletteName('  Bay ')).toBe('Bay');
  expect(normalizePaletteName('   ')).toBeNull();
  expect(normalizePaletteName('a'.repeat(41))).toBeNull();
  const palettes = [{ id: '1', name: 'Bay', colors: ['#FF0000'], createdAt: CREATED_AT }];
  expect(hasPaletteName(palettes, '  bAY ')).toBe(true);
  expect(hasPaletteName(palettes, 'Bayou')).toBe(false);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `vp test app/lib/palettes.test.ts`
Expected: FAIL — cannot resolve `./palettes`.

- [ ] **Step 3: Implement `app/lib/palettes.ts`**

- `parseStoredPalettes(raw)`: `null` → `{ palettes: [], error: null }`. `JSON.parse` in `try`; corrupt unless the value is a non-null object, `version === 1`, and `palettes` is an array. Normalize each entry, setting `partial` on any drop/normalization:
  - `id`: non-empty `string`, else drop.
  - `name`: `string` → trim → keep if 1..40 chars, else drop.
  - `createdAt`: `string` with finite `Date.parse`, else drop.
  - `colors`: array → keep entries matching `/^#[0-9a-f]{6}$/i` uppercased, dedupe preserving order, cap at 6; if none remain → drop entry; if anything was dropped/deduped/capped → `partial`.
  - Duplicate `id` and duplicate trimmed-lowercase `name` keep the first, drop later, `partial`.
  - Return `{ palettes, error: partial ? 'partial' : null }`.
- `normalizePaletteName`: trim; return it when length is 1..40, else `null`.
- `hasPaletteName`: compare `normalizePaletteName(name)?.toLowerCase()` against each palette's trimmed-lowercased name.
- `defaultPaletteName`: split at `lastIndexOf('.')` only when `> 0`; trim; `slice(0, 40)`; fallback `'Untitled palette'`.
- Store internals: module-level `cached: PaletteStoreState | null`, `listeners = new Set<() => void>()`, frozen `SERVER_STATE`. `getPalettesSnapshot` returns `SERVER_STATE` when `typeof window === 'undefined'`; otherwise `cached ??= read()`, where `read()` wraps `getItem` + `parse` in `try/catch` and maps a throw to `{ palettes: [], error: 'unavailable' }`.
- `subscribePalettes`: add listener; register a `storage` handler (ignore keys other than `PALETTE_STORAGE_KEY` unless `key === null`), which sets `cached = null` and calls every listener; cleanup removes both.
- `commit(palettes)`: if the current state is `unavailable`, set `cached = { palettes, error: 'unavailable' }`, notify, return `false`. Otherwise attempt `setItem(KEY, JSON.stringify({ version: 1, palettes }))`; on success `cached = { palettes, error: null }`, on failure `cached = { palettes, error: current.error }`; notify; return the boolean.
- `addPalette`: `normalizePaletteName` → `invalid`; colors normalized (uppercase, dedupe, cap 6) → `invalid` when any is not hex or the result is empty; duplicate → `duplicate-name`; else build `{ id, name, colors, createdAt: new Date().toISOString() }`, `commit([...current, palette])`.
- `deletePalette`: unknown id → `false`; else `commit(current.filter(...))`.
- ID: `crypto.randomUUID()` when available, else `` `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}` ``.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `vp test app/lib/palettes.test.ts`
Expected: PASS, 15 tests.

- [ ] **Step 5: Run the full check**

Run: `vp check`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/lib/palettes.ts app/lib/palettes.test.ts
git commit -m "feat: persist validated named palettes in localstorage"
```

---

### Task 4: Generalize the picker to any color item source

**Files:**
- Modify: `app/lib/filterColors.ts`, `app/components/ColorSwatch.tsx`, `app/components/ColorGroup.tsx`
- Create: `app/lib/filterColors.test.ts`

**Interfaces:**
- Consumes: `hue`, `lum` from `~/lib/colorMath`; `COLOR_ENTRIES` from `~/lib/colors`.
- Produces:
  ```ts
  export interface ColorItem { id: string; name?: string; hex: string; hue: number; lum: number }
  export const COLOR_ITEMS: readonly ColorItem[];
  export function toColorItems(hexes: readonly string[]): ColorItem[];
  export function selectColorGroups(
    filters: ColorFilters,
    items?: readonly ColorItem[],
  ): ColorGroup[];
  // ColorSwatch: name?: string
  ```

- [ ] **Step 1: Write the failing tests `app/lib/filterColors.test.ts`**

```ts
import { describe, expect, it } from 'vite-plus/test';
import {
  COLOR_ITEMS, DEFAULT_FILTERS, selectColorGroups, toColorItems,
} from './filterColors';

describe('toColorItems', () => {
  it('builds ids/hexes from uppercase hexes, deduping in order', () => {
    const items = toColorItems(['#ff0000', '#FF0000', '#00ff00']);
    expect(items.map((item) => item.id)).toEqual(['#FF0000', '#00FF00']);
    expect(items[1]).toMatchObject({ hex: '#00FF00', name: undefined });
  });

  it('computes hue and CIELab lightness', () => {
    const [red] = toColorItems(['#FF0000']);
    expect(red.hue).toBe(0);
    expect(red.lum).toBeCloseTo(53.2, 0);
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
    expect(selectColorGroups({ ...DEFAULT_FILTERS, lumFrom: 90 }, toColorItems(['#FF0000'])))
      .toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `vp test app/lib/filterColors.test.ts`
Expected: FAIL — `toColorItems`/`COLOR_ITEMS` not exported.

- [ ] **Step 3: Modify `app/lib/filterColors.ts`**

- Add `id: string` and `name?: string` to `ColorItem`; build `COLOR_ITEMS` with `id: name`, exported as `readonly ColorItem[]`.
- Add `toColorItems(hexes)`: for each hex, uppercase, skip if already seen, push `{ id: hex, hex, hue: hue(hex), lum: lum(hex) }`.
- Add the optional second parameter `items: readonly ColorItem[] = COLOR_ITEMS` and filter that array instead of the module constant. Leave `wrap`, bucket math, and the descending `lum` sort unchanged.

- [ ] **Step 4: Modify `ColorSwatch.tsx` and `ColorGroup.tsx`**

- `ColorSwatch`: `name?: string`. Compact: left label is `name ?? hex` (`font-mono` when unnamed), and the right-hand hex span renders only when `name` exists. Comfortable: the primary line is `name ?? hex` (`font-mono text-sm` when unnamed), the secondary hex line renders only when `name` exists, H/L readout unchanged. Tone stays `lum > 55 ? 'onLight' : 'onDark'`.
- `ColorGroup`: `key={color.id}`; pass `name={color.name}`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `vp test`
Expected: PASS — all four suites.

- [ ] **Step 6: Run the full check**

Run: `vp check`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add app/lib/filterColors.ts app/lib/filterColors.test.ts app/components/ColorSwatch.tsx app/components/ColorGroup.tsx
git commit -m "refactor: generalize the palette grid to any color item source"
```

---

### Task 5: shadcn primitives and the palette manager dialog

**Files:**
- Create: `app/components/ui/dialog.tsx`, `app/components/ui/alert-dialog.tsx`, `app/components/ui/input.tsx`, `app/components/ui/select.tsx`
- Create: `app/components/PaletteManagerDialog.tsx`

**Interfaces:**
- Consumes: `addPalette`, `deletePalette`, `normalizePaletteName`, `hasPaletteName`, `defaultPaletteName` (Task 3); `extractPaletteFromFile`, `PhotoPaletteError`, `PHOTO_PALETTE_ERROR_MESSAGES` (Task 2); `copyColor`; `Button`, `Input`, `Label`, `Dialog*`, `AlertDialog*`, `Select*`; `toast` from `sonner`; `Palette`, `PaletteStoreState` types.
- Produces:
  ```ts
  export function PaletteManagerDialog(props: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    palettes: readonly Palette[];
    error: PaletteStoreState['error'];
    onSelect: (id: string) => void;
  }): React.ReactElement;
  ```

- [ ] **Step 1: Generate the primitives**

Run: `bunx shadcn add dialog alert-dialog input select --yes`
Expected: four files created under `app/components/ui/`; `vp check` still passes.

If the registry is unreachable, hand-write them with `radix-ui` namespace imports and the same `data-slot`/`cn` idioms as `app/components/ui/collapsible.tsx`, exporting: `Dialog, DialogTrigger, DialogPortal, DialogClose, DialogOverlay, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription`; `AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel`; `Input`; `Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem, SelectLabel, SelectSeparator`.

- [ ] **Step 2: Write `app/components/PaletteManagerDialog.tsx`**

State: `file`, `previewUrl`, `colors: string[]`, `status: 'idle' | 'extracting' | 'error'`, `errorText`, `name`, `pendingDelete: Palette | null`, and `runId` ref. Structure:

- `Dialog open={open} onOpenChange={...}`; content `className="max-h-[85vh] overflow-y-auto sm:max-w-lg"`. Title "Palettes"; description "Create a palette from a photo. Processing happens here; the image is never uploaded." Wrap `onOpenChange`: when the next value is `false`, bump `runId`, clear `file`/`colors`/`errorText`/`name`/`status`/`pendingDelete`, then call the prop, so reopening starts clean.
- Create section: `<Label htmlFor="palette-photo">Photo</Label>` + `<Input id="palette-photo" type="file" accept="image/*" onChange={handleFile} />`. `handleFile` reads `files?.[0]`, sets `target.value = ''`, revokes the previous URL, sets the preview URL, sets `name` to `defaultPaletteName(file.name)`, bumps `runId`, sets `extracting`, and calls `extractPaletteFromFile`. Apply results only when `runId.current` still equals the captured id; on `PhotoPaletteError` set its `message`, on anything else use `PHOTO_PALETTE_ERROR_MESSAGES['decode-failed']`.
- Preview: `<img src={previewUrl} alt="Selected image preview" className="max-h-40 rounded-md object-contain" />`; revoke in an effect cleanup keyed on `previewUrl` and when the dialog closes.
- Extracted swatches: 48px color block buttons (`style={{ backgroundColor: hex }}`, visible hex under in `font-mono`, `aria-label={\`Copy ${hex}\`}`, `onClick={() => copyColor(hex)}`).
- Status: `<p role="status">Extracting colors…</p>` while extracting; `<p role="alert" className="text-destructive">{errorText}</p>` on error.
- Name: `<Label htmlFor="palette-name">Name</Label>` + `<Input id="palette-name" maxLength={40} value={name} onChange={...} aria-invalid={nameError !== null} />`; inline `<p role="alert">` for "Enter a name." and "A palette with this name already exists."
- Save disabled when extracting, `colors.length === 0`, `normalizePaletteName(name) === null`, or `hasPaletteName(palettes, name)`. On click call `addPalette({ name, colors })`: `ok: false` shows the inline message and keeps the dialog open; `ok: true` resets the create section, `onSelect(palette.id)`, `onOpenChange(false)`, then `toast(\`Saved “${palette.name}”\`)` or `toast.warning('Saved for this session only — storage is unavailable.')` when `persisted === false`.
- Saved list: heading "Saved palettes"; each row shows a strip of up to 6 small rounded color squares, the name, `` `${colors.length} colors` ``, a `Button size="sm"` "Use" (`aria-label={\`Use “${name}”\`}`) that calls `onSelect(id)` and closes, and an icon `Button variant="ghost" size="icon-sm"` with `Trash2` (`aria-label={\`Delete “${name}”\`}`) setting `pendingDelete`.
- Empty state "No saved palettes yet." A single controlled `AlertDialog` (`open={pendingDelete !== null}`) asks "Delete “{name}”? This can't be undone." The confirm calls `deletePalette(id)`; on `false` show `toast.warning(\`Deleted “${name}” for this session only.\`)`, otherwise `toast(\`Deleted “${name}”\`)`; clear `pendingDelete`.
- Storage notice from `error`: `corrupt` → "Saved palettes couldn't be read and were ignored. Saving will replace them."; `partial` → "Some saved palettes couldn't be read; they'll be discarded the next time you save."; `unavailable` → "Palettes can't be stored in this browser; they'll last until you reload."; `null` → nothing. Render as `<p role="status" className="text-xs text-muted-foreground">`.

- [ ] **Step 3: Verify types and lint**

Run: `vp check`
Expected: no errors. (`vp test` still passes; no new tests in this task — DOM behavior is covered by Task 6's smoke.)

- [ ] **Step 4: Commit**

```bash
git add app/components/ui/dialog.tsx app/components/ui/alert-dialog.tsx app/components/ui/input.tsx app/components/ui/select.tsx app/components/PaletteManagerDialog.tsx
git commit -m "feat: add palette manager dialog with photo extraction"
```

---

### Task 6: Source bar, route integration, docs, and CI

**Files:**
- Create: `app/components/PaletteSourceBar.tsx`, `app/lib/usePalettes.ts`
- Modify: `app/routes/_index.tsx`, `README.md`, `.github/workflows/pages.yml`

**Interfaces:**
- Consumes: `COLOR_ITEMS`, `toColorItems`, `selectColorGroups` (Task 4); `usePalettes` → `PaletteStoreState` (Task 3); `PaletteManagerDialog` (Task 5); `PaletteSourceBar`.
- Produces:
  ```ts
  export function usePalettes(): PaletteStoreState;
  export function PaletteSourceBar(props: {
    palettes: readonly Palette[];
    value: string;                     // 'named' | palette id
    onChange: (value: string) => void;
    onFromPhoto: () => void;
  }): React.ReactElement;
  ```

- [ ] **Step 1: Create `app/lib/usePalettes.ts`**

```ts
import { useSyncExternalStore } from 'react';
import {
  getPalettesSnapshot, getServerPalettesSnapshot, subscribePalettes,
} from './palettes';

export function usePalettes() {
  return useSyncExternalStore(subscribePalettes, getPalettesSnapshot, getServerPalettesSnapshot);
}
```

- [ ] **Step 2: Create `app/components/PaletteSourceBar.tsx`**

Wrapping flex row (`flex flex-wrap items-center gap-2`) with `<Label htmlFor="color-source">Colors</Label>`, a `Select` (trigger `id="color-source"`, `className="min-w-48"`) whose items are `Named colors (${COLOR_ITEMS.length})` with value `"named"` and `${palette.name} (${palette.colors.length})` with value `palette.id`, plus `<Button variant="outline" size="sm" onClick={onFromPhoto}><ImagePlus />From photo</Button>`.

- [ ] **Step 3: Integrate the source in `app/routes/_index.tsx`**

Add, in order:

```tsx
const { palettes, error: paletteError } = usePalettes();
const [sourceId, setSourceId] = useState('named');
const [paletteDialogOpen, setPaletteDialogOpen] = useState(false);
const activePalette = palettes.find((palette) => palette.id === sourceId) ?? null;
const effectiveSourceId = activePalette ? sourceId : 'named';
const items = useMemo(
  () => (activePalette ? toColorItems(activePalette.colors) : COLOR_ITEMS),
  [activePalette],
);
const groups = useMemo(() => selectColorGroups(deferredFilters, items), [deferredFilters, items]);
```

Header becomes `flex flex-wrap items-start justify-between gap-3`: the existing title/subtitle block stays verbatim except the count line, which becomes `<strong className="font-medium text-foreground">{matchCount}</strong> of {items.length} {activePalette ? <>colors in “{activePalette.name}”</> : 'named colors'} · tap a swatch to copy its hex`; add the right-aligned `<Button variant="outline" size="sm" onClick={() => setPaletteDialogOpen(true)}><PaletteIcon />Palettes</Button>` (`import { Palette as PaletteIcon } from 'lucide-react'`).

Wrap the results column:

```tsx
<div className="flex min-w-0 flex-[999_1_480px] flex-col gap-3">
  <PaletteSourceBar
    palettes={palettes}
    value={effectiveSourceId}
    onChange={setSourceId}
    onFromPhoto={() => setPaletteDialogOpen(true)}
  />
  <ColorResults className="min-w-0" groups={groups} density={density} onReset={...} />
</div>
```

Mount the dialog once at the end of the root div:

```tsx
<PaletteManagerDialog
  open={paletteDialogOpen}
  onOpenChange={setPaletteDialogOpen}
  palettes={palettes}
  error={paletteError}
  onSelect={setSourceId}
/>
```

The sticky filter column and `useDeferredValue` behavior stay unchanged.

- [ ] **Step 4: Add the CI test step**

In `.github/workflows/pages.yml`, between `Check` and `Build Application`:

```yaml
      - name: Test
        run: vp test
```

- [ ] **Step 5: Update `README.md`**

- Feature bullet: "**Palettes from photos** — upload an image; up to six dominant colors are extracted on-device (the image never leaves the browser), saved under a name, and selectable as the grid's color source".
- Getting started, after `vp check`: a `vp test` block (runs the Vitest suites for the color math, quantizer, and palette store).
- Short "Palettes" section: storage key/local-only behavior, 6-color cap, delete-only management, reload returns to named colors.

- [ ] **Step 6: Run the automated verification**

Run: `vp check` → no errors.
Run: `vp test` → 4 suites, all pass.
Run: `vpr build` → exit 0 with `build/client/siri-color-picker/index.html` and `build/server`.
Expected: no prerender warnings about `window`/`localStorage`.

- [ ] **Step 7: Manual smoke (required)**

Run `vp dev`, open `http://localhost:5173/siri-color-picker/`:
1. Upload a photo → preview, 6 (or fewer) swatches, filename stem prefilled; Save enabled only with colors + valid unique name.
2. Save → dialog closes, palette becomes the source, header reads `N of M colors in “Name”`, swatches group/copy, sliders and Reset filter it.
3. Reload → palette still listed; select it; delete it with confirmation → falls back to named colors; toast appears.
4. Upload a `.txt` file, a transparent-only PNG, and re-select the same photo → inline errors for the first two, re-selection still extracts.
5. Corrupt the key by hand (`localStorage.setItem('siri-color-picker:palettes:v1','{')`) and reload → notice in the dialog; save a new palette → notice clears.
6. Console shows no hydration warnings; DevTools Network shows no request carrying image data.

- [ ] **Step 8: Commit**

```bash
git add app/components/PaletteSourceBar.tsx app/lib/usePalettes.ts app/routes/_index.tsx
git commit -m "feat: select saved palettes as the picker source"

git add README.md .github/workflows/pages.yml
git commit -m "docs: document photo palettes and run tests in ci"
```

---

## Self-Review

- **Spec coverage:** extraction (T1/T2), storage + validation + SSR (T3), palette-as-source + swatch/group rendering (T4), manager dialog with create/use/delete/notices (T5), source bar/header/route/docs/CI (T6). Non-goals (rename, uploads, export, count control) have no task.
- **Type consistency:** `Palette.colors: string[]`, `ColorItem.id: string`, `selectColorGroups(filters, items)`, `PaletteManagerDialog` props, and `addPalette`/`deletePalette` return types are identical across tasks.
- **Review Focus:** each of the five lines names the owning task's test (T3 SSR/unavailable-recovery/name identity, T2 extraction guards + degenerate quantizer), with the DOM-only remainder covered by T6's manual smoke.
- **Proportion:** tasks carry signatures, constants, and assertions; no task transcribes a full component body.
