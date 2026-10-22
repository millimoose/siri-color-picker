# Photo → named palette — design

- Issue: [#2 Create color palette from uploaded photo](https://github.com/millimoose/siri-color-picker/issues/2)
- Branch: `task/2-photo-to-palette`
- Date: 2026-10-22
- Status: proposed for review

This document is the output of a **non-interactive** brainstorming session. Open
product questions are settled as explicit **Assumptions** below; each records what
was chosen, why, and what it costs. Reviewers should treat the Assumptions and the
"Decisions taken" markers as the places to push back.

## Intent and why

The app today is a browser over 664 hand-picked named colors, filtered by a hue
window and a CIELab lightness range. The request is to start from a photo instead:
upload an image, extract its dominant colors, save them under a name, and use them
with the picker that already exists.

The value is that a user can turn a real object, room, or artwork into a palette and
then work with it in the same UI they already know: same filtered grid, same hue
buckets, same copy-a-hex-on-tap. Success is a user who uploads a photo, names the
result, and immediately browses/filters those exact colors without any new mental
model.

## Current state (what the change touches)

| Area | Today |
| --- | --- |
| Routing | One route, `app/routes/_index.tsx`, prerendered to static HTML (`react-router.config.ts`, `prerender: ['/']`). GitHub Pages serves static files; no server runtime. |
| Filter state | `ColorFilters` in the index route, passed to `FilterPanel`; `useDeferredValue` defers the grid. |
| Results | `selectColorGroups(filters)` in `app/lib/filterColors.ts` filters module-level `COLOR_ITEMS` (664 entries, precomputed hue via `colorMath.hue` and CIELab L\* via `colorMath.lum`), splits into 3 hue buckets, sorts by lightness descending. |
| Swatches | `ColorSwatch` renders a colored button, copies hex via `copyColor`, picks text tone from L\*. `ColorGroup` keys rows by `color.name`. |
| Data | `app/lib/colors.ts` — static `COLORS` record, uppercase `#RRGGBB`. |
| Persistence | None in app code. `next-themes` stores only the theme class in localStorage; no color or palette state is persisted. |
| Tests | None. No test files, no vitest config. Toolchain is Vite+ (`vp check`, `vp test`); CI runs `vp check`, then `vpr build` twice (production and the `DEV_SNAPSHOT=1` snapshot) in `.github/workflows/pages.yml`. A single test step after `vp check` gates both builds. |
| UI kit | Tailwind v4 + shadcn (`radix-mira` preset), primitives in `app/components/ui`. No Dialog, Input, Select, or AlertDialog yet. `radix-ui` (unified package) and `lucide-react` are installed. |

## Goals

1. Upload an image from the index page and see its dominant colors extracted in
   the browser, with no upload to any server.
2. Save the extracted colors as a named palette; palettes survive reloads.
3. Make a saved palette a **color source for the existing picker**: it renders in
   the same filtered grid, grouped by the same hue buckets, filtered by the same
   sliders, and copies hex on tap.
4. Keep named colors as the default source and keep the existing experience intact.
5. Keep the feature working in the static/SSR-prerendered deployment, with no
   hydration warnings and no server dependency.

## Non-goals

- Accounts, syncing, sharing, URLs, or any server endpoint.
- Storing the source image (localStorage is quota-limited, and storing photos is a
  privacy and size problem).
- Renaming palettes after save, drag-and-drop upload, camera capture, multiple
  images at once, or editing individual extracted colors.
- Palette export (CSS/JSON/ASE) or import.
- A user-selectable palette size (count), color-blindness simulation, or a
  nearest-named-color label for extracted colors.
- Adding a test runner beyond what Vite+ already ships.

## Anti-goals

- The image must never leave the device. No analytics, no fetch of image data.
- The feature must not make the named-color browser worse: no extra work on the
  initial render path, no localStorage access during SSR render, no layout shift
  of the filter/results columns.
- Do not silently discard failures: decode errors, storage errors, and rejected
  names must surface in the UI.
- Do not make the extracted palette a second-class swatch wall that ignores the
  picker's filters — that would satisfy the words of the request but miss its point.

## Constraints

- **Static hosting.** All processing is client-side: Canvas/`ImageData` +
  in-browser quantization. GitHub Pages has no server runtime.
- **Prerendering.** The index route is rendered to HTML at build time. Any
  `localStorage` read must happen only in the browser (`useSyncExternalStore` with
  a stable server snapshot), never during render on the server.
- **No new rendering dependencies.** `radix-ui` and `lucide-react` are already
  installed; the quantizer is hand-written math, not a new package.
- **Toolchain.** Vite+ runs Oxfmt/Oxlint/type-aware checks via `vp check`; tests (if
  enabled) run through `vp test` (Vitest). No `node_modules` is checked in; the
  implementation starts with `vp install`.
- **Data compatibility.** Named colors and their hex casing stay unchanged.

## Assumptions (settled without Q&A)

| # | Assumption | Reason / cost |
| --- | --- | --- |
| A1 | "Works with the existing color picker" means a saved palette becomes a **selectable color source inside the existing grid**: same hue/lightness filters, same 3 hue buckets, same tap-to-copy swatches. | This is the only reading that reuses the picker rather than duplicating it. Cost: `selectColorGroups` and `ColorSwatch` must be generalized for unnamed colors. |
| A2 | Palettes persist in `localStorage` under a versioned key; no accounts or server. | The deployment is static. Cost: data is per-browser; private mode may block writes (handled). |
| A3 | Extraction always targets **6 colors** (fewer when the photo genuinely has fewer distinct dominant colors). No count control. | Smallest complete feature; avoids an extra control and extraction re-runs. Cost: users cannot ask for 8 or 4. |
| A4 | Names are required, unique (case-insensitive, trimmed), 1–40 characters, defaulting to the image filename stem. | Prevents an unusable source selector full of duplicate names. Cost: a second save with the same name is rejected with an inline message. |
| A5 | Saved palettes can be deleted (with confirmation) but not renamed or edited. | Delete is needed to recover from mistakes; rename/edit is scope. |
| A6 | The image is not stored, only the extracted hexes (plus name, id, createdAt). | Privacy and quota. Cost: reopening a palette can't show its source photo. |
| A7 | The selected source (named colors vs. a palette) is **not** persisted across reloads; reload starts on named colors. | Matches current stateless behavior; avoids more storage schema. Cost: one extra selection after reload. |
| A8 | Entry points: a "Palettes" button in the header and a "From photo" button in the source bar both open one manager dialog. The source bar sits above the results grid. | Discoverable without a new route; keeps the sticky filter sidebar unchanged. |
| A9 | Tests are added with Vitest (`vp test`) for the pure modules, and CI runs them. | First tests in the repo; pure logic is deterministic and cheap to test. Cost: test-runner setup is verified during implementation. |
| A10 | Images up to 20 MB are accepted; anything larger is rejected before decode. | Prevents accidental multi-hundred-MB decodes on phones. |
| A11 | New shadcn primitives (`dialog`, `alert-dialog`, `input`, `select`) are generated into `app/components/ui` and used; no custom modal implementation. | Matches the established UI convention and Radix accessibility. |

## User flows

### Create a palette

1. User clicks **Palettes** (header) or **From photo** (source bar).
2. In the dialog's "Create from photo" section, the user picks an image file
   (`accept="image/*"`).
3. The image is previewed locally. Extraction runs automatically; a status line
   says "Extracting colors…", then the extracted swatches appear (hex under each).
4. The name field is prefilled from the filename stem; the user may edit it.
   **Save** stays disabled while extraction is running, when there are no colors,
   when the name is blank, or when the name already exists.
5. On save: the palette is written to localStorage, the dialog closes, the new
   palette becomes the active source, and a toast confirms the save (with a warning
   if storage failed).

### Browse a palette

1. The source bar above the results contains a **Colors** select: `Named colors
   (664)` plus every saved palette.
2. Selecting a palette replaces the grid's source. The header count becomes
   `N of M colors in "Palette name"`. The sliders and reset behave exactly as
   before; filtering to zero shows the existing empty state.
3. Tapping a palette color copies its hex with the existing toast.

### Manage

1. The dialog lists saved palettes: name, a strip of its colors, the count, a
   **Use** action, and a delete icon.
2. **Use** selects that palette as the source and closes the dialog.
3. Delete asks for confirmation ("Delete “Name”? This can't be undone."). If the
   deleted palette was active, the picker falls back to named colors.
4. Empty storage shows "No saved palettes yet."; storage errors show a muted notice
   (see Storage).

## Approaches considered

### Integration shape

1. **Palette as an alternate color source in the existing picker (chosen).**
   Generalize the filter/grouping pipeline to take a `ColorItem[]`; the index route
   switches between the 664 named items and the active palette's items. Reuses the
   grid, group headers, empty state, copy behavior, and sliders. Cost: touches the
   core picker types and `ColorSwatch`.
2. **A separate palette card next to the results.** Cheapest to build, but the
   sliders would not apply to it, and two different swatch UIs would exist. Fails
   the stated intent.
3. **Merge palette colors into the named-color grid with a badge.** Mixes
   provenance, inflates counts, and makes "which palette am I looking at" unclear.
   Rejected.
4. **Map extracted colors to the nearest named colors.** Loses the exact colors the
   photo produced — the opposite of the feature. Rejected.

### Extraction method

1. **5-bit RGB histogram + weighted k-means in OKLab (chosen).** Aggregate sampled
   pixels into at most 32³ bins (area-weighted), seed centroids from the most
   populous well-separated bins, run weighted Lloyd iterations in OKLab, and convert
   centroids back to sRGB hex. Deterministic, area-weighted, perceptually spaced,
   and dependency-free. Cost: ~100 lines of quantization plus ~40 lines of OKLab
   math; thresholds may need tuning on real photos.
2. **Histogram peaks + perceptual merge (no k-means).** Simpler, but a large flat
   background can consume most output slots and nearby bins blur into muddy
   averages. Kept as a fallback if k-means proves unstable; the `quantizePixels`
   interface stays the same.
3. **Third-party quantizer (`color-thief` / MMCQ / `quantize`).** Least code, but
   adds a dependency, couples to its canvas behavior, and its output is less
   testable/deterministic for this repo. Rejected.

### Decisions taken

- Integration shape 1, extraction method 1.
- The pure quantizer is separated from decoding so it can be unit-tested with
  synthetic RGBA buffers; the canvas/`createImageBitmap` wrapper stays thin.

## Detailed design

### Data model

```ts
// app/lib/filterColors.ts
export interface ColorItem {
  id: string;        // stable key: named color name, or normalized hex for palette colors
  name?: string;     // absent for palette colors
  hex: string;       // uppercase #RRGGBB
  hue: number;       // HSL H, 0..360
  lum: number;       // CIELab L*, 0..100
}

export interface ColorGroup {
  from: number;
  span: number;
  items: ColorItem[];
}

export const COLOR_ITEMS: ColorItem[];                    // named colors, built once
export function toColorItems(hexes: readonly string[]): ColorItem[]; // palette adapter
export function selectColorGroups(
  filters: ColorFilters,
  items: readonly ColorItem[] = COLOR_ITEMS,
): ColorGroup[];
```

`toColorItems` builds `{ id: hex, hex, hue: hue(hex), lum: lum(hex) }` using the
existing `colorMath` helpers (six conversions per switch, negligible). Deduplicate
hexes defensively while preserving order.

```ts
// app/lib/palettes.ts
export interface Palette {
  id: string;
  name: string;
  colors: string[];   // 1..6 uppercase #RRGGBB (extraction never yields more)
  createdAt: string;  // ISO timestamp
}

export interface PaletteStoreState {
  palettes: Palette[];
  // 'partial': the envelope parsed, but some entries were unusable and skipped.
  error: 'corrupt' | 'partial' | 'unavailable' | null;
}
```

Storage key: `siri-color-picker:palettes:v1`. Envelope:
`{ "version": 1, "palettes": Palette[] }`.

Read validation (pure `parseStoredPalettes(raw: string | null)`):

- `null` → `{ palettes: [], error: null }`.
- Malformed JSON, a non-object, or `version !== 1` → `{ palettes: [], error: 'corrupt' }`.
- A valid envelope is normalized entry by entry. Drop an entry when its `id` is not
  a non-empty string, its `name` is not a string that is non-empty after trim and at
  most 40 characters, its `createdAt` is not an ISO string (`Date.parse` finite),
  or it has no valid colors.
- Colors must match `/^#[0-9a-f]{6}$/i`; normalize to uppercase, deduplicate in
  order, and cap at 6. A cap or dedupe that changes the stored list marks the read
  partial.
- Duplicate `id`s and duplicate names (case-insensitive, trimmed) keep the first
  occurrence and drop later ones. Cross-tab or hand-edited storage thus cannot
  produce ambiguous `find()` results or duplicate React keys.
- Any dropped entry or normalized color list sets `error: 'partial'`; the surviving
  palettes are still returned. The dialog tells the user those entries are
  unreadable and will be discarded on the next save. This is the deliberate
  resolution of "never silently discard": the data is lost either way if the user
  saves again, but it is not lost silently.
- Never throw out of the store. `localStorage` access is wrapped; a throwing read
  yields `{ palettes: [], error: 'unavailable' }`.

Store API:

```ts
export function subscribePalettes(listener: () => void): () => void;
export function getPalettesSnapshot(): PaletteStoreState;       // browser-only, cached
export function getServerPalettesSnapshot(): PaletteStoreState; // stable frozen empty state
export function parseStoredPalettes(raw: string | null): PaletteStoreState; // pure, tests

export type AddPaletteResult =
  | { ok: true; palette: Palette; persisted: boolean }
  | { ok: false; reason: 'invalid' | 'duplicate-name' };

export function addPalette(input: { name: string; colors: string[] }):
  AddPaletteResult;
export function deletePalette(id: string): boolean;             // persisted?
```

- Module-level `state | null` cache; `getPalettesSnapshot` reads and validates once
  on first browser call.
- **The store owns name uniqueness.** `addPalette` trims the name, rejects
  `'invalid'` unless it is 1–40 characters with 1–6 valid hexes, and rejects
  `'duplicate-name'` against the current list using a case-insensitive, trimmed
  comparison. The dialog repeats the same check for immediate inline feedback, but
  the store result is authoritative (two tabs can pass the dialog check at once).
- Mutations update the cache, then write the envelope; a write failure returns
  `false` / `persisted: false` but keeps the in-memory change (session-only).
- **Never write after a failed read.** While `error === 'unavailable'`, mutations
  stay in memory and report `persisted: false`; writing would replace an envelope
  the store could not see. The state recovers on the next successful read (a
  reload).
- A successful write after `corrupt` or `partial` clears that error and rewrites
  the key with the surviving palettes.
- Subscribers: local mutations notify; a `storage` event on the key (or `key ===
  null` for `clear()`) invalidates the cache and notifies, so multiple tabs stay in
  sync.
- IDs: `crypto.randomUUID()` when available, otherwise
  `${Date.now().toString(36)}-${random}`. No collision handling beyond that.

```ts
// app/lib/usePalettes.ts
export function usePalettes(): PaletteStoreState; // useSyncExternalStore
```

The hook uses the three store functions directly, mirroring `useIsStacked`. The
server snapshot is referentially stable, so prerendered markup matches hydration
(no palettes in SSR output); palettes appear after hydration.

### Extraction pipeline

`app/lib/oklab.ts`

- `srgbToOklab(r: number, g: number, b: number): [L, a, b]` — channels 0..1, sRGB
  companding + the standard OKLab matrices (Ottosson).
- `oklabToSrgb(L, a, b): [r, g, b]` — inverse, clamped to 0..1.
- `hexToRgb(hex)` / `rgbToHex(r255, g255, b255)` — uppercase `#RRGGBB`.
- `oklabDistance(a, b): number` — Euclidean in OKLab.

`app/lib/photoPalette.ts`

```ts
export type PhotoPaletteErrorCode =
  | 'unsupported-type' | 'too-large' | 'decode-failed' | 'no-visible-pixels';

export class PhotoPaletteError extends Error { code: PhotoPaletteErrorCode }

export const DEFAULT_PALETTE_SIZE = 6;

// Pure, testable: RGBA bytes → up to `colorCount` uppercase hex colors.
export function quantizePixels(
  rgba: Uint8ClampedArray,
  colorCount = DEFAULT_PALETTE_SIZE,
): string[];

// Browser wrapper: validate, decode, downscale, read pixels, quantize.
export async function extractPaletteFromFile(file: File): Promise<string[]>;
```

Decode and sampling:

1. Reject `file.size > 20 * 1024 * 1024` (`too-large`) and a non-image MIME type
   (accept empty `type` and attempt decode) (`unsupported-type`).
2. `createImageBitmap(file, { imageOrientation: 'from-image' })`; if the options
   form throws, retry `createImageBitmap(file)`; if `createImageBitmap` is missing,
   fall back to an `<img>` element with an object URL and `decode()`. Any failure →
   `decode-failed`.
3. Draw into an `OffscreenCanvas` (fallback: `<canvas>`) scaled so the longest edge
   is at most **200 px** (each edge at least 1 px), `imageSmoothingQuality =
   'high'`, `willReadFrequently: true`.
4. `getImageData(0, 0, w, h).data`. Close/dispose the bitmap and the object URL.
   Canvas is same-origin (local `File`), so no taint issues.

Quantization (`quantizePixels`):

1. Skip pixels with `alpha < 128`. If none are visible, return `[]`; the wrapper
   throws `no-visible-pixels`.
2. Histogram with 5 bits per channel: for each visible pixel accumulate count,
   sum r/g/b in arrays indexed by `(r >> 3) << 10 | (g >> 3) << 5 | (b >> 3)`.
3. Convert each occupied bin's mean color to OKLab; keep `{ lab, count }`, ordered
   by bin index for stable tie-breaking.
4. Seeding: walk bins by count descending (ties by bin index); accept a bin as a
   centroid if its OKLab distance to every accepted centroid is ≥ **0.06**, until
   `colorCount` seeds exist or bins run out. Fewer seeds means a photo with fewer
   perceptually distinct dominant colors — return fewer colors.
5. Weighted Lloyd: up to **12** iterations. Assign each bin to its nearest centroid;
   recompute each centroid as the count-weighted mean in OKLab; drop clusters that
   receive no weight; stop early when no assignment changes.
6. Drop clusters weighing less than **0.5%** of visible pixels.
7. Convert centroids back to sRGB, clamp, round to 8-bit, format uppercase hex;
   deduplicate identical hexes; sort by cluster weight descending, ties by hex
   ascending; return up to `colorCount`.

Determinism: no randomness, no `Set` iteration order dependence, no time or locale
input. The same RGBA buffer always produces the same hex list. Cross-browser canvas
resampling can shift a few 8-bit values, so the guarantee is per-browser, not
bit-exact across engines; unit tests use synthetic RGBA buffers and are exact.

### UI

```
┌─────────────────────────────────────────────────────────────────────┐
│ Siri Color Picker                          [Palettes]               │
│ N of M named colors · tap a swatch to copy its hex                  │
├───────────────────┬─────────────────────────────────────────────────┤
│ Filters (sticky)  │ Colors [ Named colors (664) ▾ ] [From photo]    │
│                   │ ┌───────────┬───────────┬───────────┐           │
│                   │ │ 0–120°    │ 120–240°  │ 240–360°  │           │
│                   │ │ swatches  │ swatches  │ swatches  │           │
└───────────────────┴─────────────────────────────────────────────────┘

Palette manager dialog
┌───────────────────────────────────────────────────────────┐
│ Palettes                                              [×] │
│ Create a palette from a photo. Processing happens here;   │
│ the image is never uploaded.                              │
│ [ Choose image… ]   (preview thumbnail)                   │
│ [color][color][color][color][color][color]                │
│  #hex   #hex   #hex   #hex   #hex   #hex                  │
│ Name [ Sunset over the bay        ]                       │
│                                    [Cancel] [Save]        │
│ ───────────────────────────────────────────────────────── │
│ Saved palettes                                            │
│ Sunset over the bay  ▮▮▮▮▮▮  6 colors   [Use] [🗑]       │
│ No saved palettes yet.            (when empty)            │
└───────────────────────────────────────────────────────────┘
```

- **`PaletteManagerDialog`** (`app/components/PaletteManagerDialog.tsx`)
  - shadcn `Dialog`, `max-h-[85vh] overflow-y-auto`, width ~`sm:max-w-lg`.
  - Title "Palettes", description states local processing + privacy.
  - Create section: labeled file `Input type="file" accept="image/*"`; after a file
    is chosen, reset the input's `value` so re-selecting the same file fires again.
    Preview via object URL (`<img>` with `alt="Selected image preview"`, max height
    ~160px), extracted swatches as buttons (48px color block + mono hex below,
    `aria-label="Copy #RRGGBB"`, `onClick={() => copyColor(hex)}`), status line
    (`role="status"` while extracting, `role="alert"` for errors), name `Input`
    with `Label` and `maxLength={40}`, inline errors for blank/duplicate names.
  - Save calls `addPalette`. On `ok: false`, keep the dialog open and show the
    inline error (`duplicate-name` → "A palette with this name already exists.",
    `invalid` → the field-level message). On `ok: true`, close,
    `onSourceChange(palette.id)`, and toast `Saved “name”`; when
    `persisted === false`, use a warning toast instead.
  - A run token (ref counter or `AbortController`-style flag) ignores results from a
    superseded file selection.
  - Leaving/closing the dialog resets create-section state and revokes the object
    URL.
  - Saved list: color strip (small rounded squares), name, count, **Use** button
    (selects + closes), delete icon button with `aria-label="Delete “name”"`
    opening a nested `AlertDialog` confirm. Empty state text; storage error notice
    (muted, with `role="status"`).
- **`PaletteSourceBar`** (`app/components/PaletteSourceBar.tsx`)
  - Flex row that wraps on narrow screens: `Label` + shadcn `Select` (value:
    `named` or palette id; items show `Named colors (664)` and
    `name (n)`), plus a `From photo` outline button with `ImagePlus` icon.
  - Controlled by the index route. The `value` it receives is the *effective*
    source (see below), never a raw id that no longer exists.
- **Header**: a `Palettes` outline button with `Palette` icon, right-aligned; opens
  the same dialog.

### Picker generalization

- `selectColorGroups(filters, items = COLOR_ITEMS)`: filtering/grouping logic is
  unchanged; the source array is now a parameter. `wrap`, bucket math, and the
  lightness-descending sort stay as-is.
- `ColorGroup` keys rows by `color.id`.
- `ColorSwatch`: `name` becomes optional. If present, layout is unchanged. If
  absent, the left label renders the hex in mono type and the right-hand duplicate
  hex (compact) is omitted; comfortable density still shows the H/L readout. Tone
  selection stays `lum > 55`.
- Index route:
  - `const { palettes, error } = usePalettes();` — `palettes` feeds the source
    bar and the grid; `error` is passed to `PaletteManagerDialog` for its notice.
  - `const [sourceId, setSourceId] = useState<'named' | string>('named');`
  - `const activePalette = palettes.find(p => p.id === sourceId) ?? null;`
  - `const effectiveSourceId = activePalette ? sourceId : 'named';` — this is what
    `PaletteSourceBar` receives. Deleting the active palette (locally or in another
    tab) therefore leaves the select, the grid, and the header consistent without
    an effect writing state; a later save sets a real id again.
  - `const items = useMemo(() => activePalette ? toColorItems(activePalette.colors) : COLOR_ITEMS, [activePalette]);`
  - `const groups = useMemo(() => selectColorGroups(deferredFilters, items), [deferredFilters, items]);`
  - Header subtitle: named → existing text; palette →
    `N of M colors in “Name” · tap a swatch to copy its hex`.
  - Dialog open state lives here; both buttons set it true. A successful save/Use
    calls `setSourceId(id)`.

### Storage and SSR behavior

- No `localStorage` access at module import or during SSR. `getPalettesSnapshot`
  guards `typeof window === 'undefined'`, and `useSyncExternalStore` uses the
  stable server snapshot for the prerender/hydration pass; the first browser read
  happens after hydration and is cached.
- SSR output shows `Named colors (664)` and no palettes; after hydration
  `useSyncExternalStore` re-renders with stored palettes. No hydration warnings.
- Corrupt storage: palettes are ignored and an inline notice appears in the dialog;
  the next successful save rewrites the key.
- Partially valid storage: readable palettes are shown, the notice says
  "Some saved palettes couldn't be read; they'll be discarded the next time you
  save", and the next successful save rewrites the key with the survivors.
- Storage unavailable/blocked: palettes live in memory for the session, the dialog
  shows "Palettes can't be stored in this browser; they'll last until you reload",
  saves warn via toast, and the store never writes over the unreadable envelope.
  Nothing is silently dropped.
- All three notices are text inside the dialog (`role="status"`), not toasts, so
  they stay visible while the user works in it.

### Edge cases

| Case | Behavior |
| --- | --- |
| Non-image file / empty MIME that fails decode | Inline error with a specific message; Save disabled. |
| File > 20 MB | Rejected before decode with `too-large`. |
| Image with alpha only | `no-visible-pixels` error. |
| Re-selecting the same file | Works (input value reset). |
| Rapid re-selection while decoding | Only the latest run's result is applied. |
| Uniform photo | One color is returned and savable. |
| Photo with < 6 distinct dominant colors | Fewer swatches; Save enabled with ≥ 1. |
| Palette filtered to zero by sliders | Existing `Empty` state and Reset button. |
| Duplicate name, differing case | Inline "A palette with this name already exists."; Save disabled. `addPalette` rejects it too if another tab wins the race. |
| Active palette deleted locally | Grid and header fall back to named colors via `effectiveSourceId`; toast confirms the delete. |
| Active palette deleted in another tab | Same fallback, with no local toast (the storage event is the only signal). |
| Storage full on save | In-memory palette remains for the session + warning toast. |
| Some stored entries invalid (bad hex, duplicate id/name, truncated write) | Readable palettes shown; partial notice in the dialog; next save rewrites survivors. |
| Read throws but write might work | No write is attempted; session-only palettes + notice. Avoids clobbering unseen data. |
| Two tabs | `storage` event refreshes the list and source options; the effective source falls back if the active palette disappears. |
| Long filename | Name stem truncated to 40 chars; blank stem → "Untitled palette" (a duplicate name still blocks Save until edited). |

### Accessibility

- Radix dialog/alert-dialog supply focus trap, Escape, and focus return.
- File input has a visible label; status and errors use `role="status"` / `role="alert"`.
- Extracted colors are buttons with visible hex text and `aria-label="Copy …"`; the
  hex is the accessible name of the color, so no information is color-only.
- Delete and Use actions are real buttons; both carry the palette name
  (`aria-label="Use “name”"`, `aria-label="Delete “name”"`) so repeated rows are
  distinguishable.
- The source `Select` has a label and a stable id.

### Performance

- Sampling caps at 200 px on the longest edge (≤ ~40k pixels). Histogram and
  Lloyd iterations operate on occupied bins, not raw pixels; target well under
  50 ms after decode. Decode of large photos dominates and is shown as pending.
- No new runtime dependency; OKLab math is local.
- The dialog and extraction code live in the main bundle (est. ~10–15 KB before
  gzip, not measured). Dynamic import is not required; initial render does no work
  beyond importing modules.

## File-level plan

New:

- `app/lib/oklab.ts` — conversion + distance.
- `app/lib/photoPalette.ts` — decode/downscale wrapper + pure quantizer + errors.
- `app/lib/palettes.ts` — types, parse/validate, store, persistence.
- `app/lib/usePalettes.ts` — `useSyncExternalStore` binding.
- `app/components/PaletteManagerDialog.tsx`
- `app/components/PaletteSourceBar.tsx`
- `app/components/ui/dialog.tsx`, `alert-dialog.tsx`, `input.tsx`, `select.tsx`
  (shadcn, `radix-mira` style).
- `app/lib/oklab.test.ts`, `app/lib/photoPalette.test.ts`, `app/lib/palettes.test.ts`,
  `app/lib/filterColors.test.ts`

Modified:

- `app/lib/filterColors.ts` — `ColorItem` gains `id` and optional `name`; export
  `COLOR_ITEMS` and `toColorItems`; `selectColorGroups` takes an item source.
- `app/components/ColorSwatch.tsx` — optional name rendering, mono hex fallback.
- `app/components/ColorGroup.tsx` — key by `id`.
- `app/routes/_index.tsx` — palette hook, source state, source bar, dialog, header
  button, subtitle/count, palette item memo.
- `README.md` — feature description, local-only/privacy note, test command.
- `.github/workflows/pages.yml` — add a `vp test` step after `vp check`.

## Testing and verification

Unit tests (Vitest, explicit imports from `vitest`, node environment). The store's
module-level cache is reset per test with `vi.resetModules()` plus a fresh dynamic
import, so no production test hook is needed:

- `oklab.test.ts`: round-trip sRGB→OKLab→sRGB within 1/255 per channel for a spread
  of colors (primaries, white, black, mid-grays); `#RRGGBB` parsing/casing;
  identical colors have distance 0.
- `photoPalette.test.ts` (synthetic RGBA buffers, no canvas):
  - two 50/50 flat colors → both returned, ordered by weight (tie → hex ascending);
  - six flat colors → six distinct colors returned;
  - uniform buffer → exactly one color;
  - all-transparent buffer → `[]`;
  - a <0.5% accent is dropped;
  - deterministic: identical input twice → identical output;
  - seed separation: near-duplicate shades do not produce duplicate hexes.
- `palettes.test.ts`:
  - parse: `null` → empty/no error; malformed JSON → `corrupt`; wrong version →
    `corrupt`; one invalid entry among valid ones → survivors + `partial`;
    lowercase hex normalized; color list deduped/capped at 6; duplicate `id` and
    duplicate case-insensitive name keep the first and set `partial`;
  - store with a stubbed `localStorage`: add → written envelope + snapshot updated;
    delete → removed; read-back round trip; write throw → `persisted: false` and
    memory retained; `unavailable` on read throw; add/delete while `unavailable`
    does not call `setItem`; `addPalette` rejects `invalid` and `duplicate-name`;
  - `getServerPalettesSnapshot` returns the stable empty state (same reference each
    call).
- `filterColors.test.ts`: `toColorItems` produces `id === hex`, computes hue/lum,
  and dedupes while preserving order; `selectColorGroups(filters, items)` buckets
  arbitrary palette items exactly as it does named items (a known hue/lightness
  lands in the expected bucket, and the zero-match case returns `[]`).

Manual smoke (required before "done"):

1. `vp install`, `vp check`, `vp test`, `vpr build` (the README notes
   `react-router build`, not `vp build`).
2. `vp dev`, open `/siri-color-picker/`:
   - upload a photo, confirm preview + 6 swatches + default name;
   - save, confirm auto-selection and grid rendering, group counts, copy toast;
   - drag the hue/lightness sliders, confirm palette colors filter and Reset works;
   - reload, confirm the palette persists; select it again; delete it (confirm
     fallback to named colors);
   - upload a text file, a transparent-only PNG, and re-select the same photo;
   - check the console for hydration warnings; verify the network panel shows no
     image upload requests.

Acceptance criteria:

1. Uploading a valid image yields extracted colors in the dialog with a preview;
   Save is disabled until colors and a valid unique name exist.
2. Saving persists the palette across reloads and immediately makes it the active
   source; the grid shows its colors in the existing hue buckets with the palette
   count in the header.
3. Hue/lightness filters and reset apply identically to named colors and palettes;
   tapping any palette swatch copies its hex.
4. The image never leaves the browser; no image data is persisted.
5. Corrupt, partially valid, and unavailable storage, plus all extraction failures,
   surface in the UI and do not crash the app; unreadable storage is never
   overwritten by a write.
6. `vp check`, `vp test`, and the production build pass; the prerendered page
   hydrates without warnings.

## Risks and what is left to the builder

- **Extraction thresholds** (seed separation 0.06, minimum weight 0.5%, 12
  iterations, 200 px sampling) are reasonable defaults, not photo-tuned. Keep them
  as named module constants; adjust after eyeballing real photos without changing
  the interface. This is the main quality risk.
- **First test setup.** `vp test` (Vitest) is documented by the toolchain but the
  repo has no tests. If discovery/config needs a small `test` block in
  `vite.config.ts` or a `vitest.config.ts`, add the minimal version; do not add a
  second runner.
- **shadcn generation.** If `shadcn add` cannot reach the registry, hand-write the
  four primitives using the installed `radix-ui` exports and the existing
  `collapsible.tsx`/`slider.tsx` style.
- **Nested AlertDialog inside Dialog** needs a focus-behavior check in the manual
  smoke; if it misbehaves, replace with an inline two-step confirm (store only
  local state) rather than a custom modal.
- **Cross-browser resampling** changes a few sampled bytes; determinism is
  per-browser. Tests avoid canvas entirely.
- **`crypto.randomUUID`** requires a secure context; GitHub Pages and localhost
  qualify, but keep the fallback for other hosts.
- Styling details (spacing, dialog width, icon choice) are left to the builder
  within the existing shadcn/Tailwind conventions.
