# Siri Color Picker

Browse a palette of 664 named colors — from Air Force Blue to Zinnwaldite Brown — filtered by hue and luminance with interactive sliders.

## Features

- **Middle hue** — rotates the color wheel (0–360°) that the other sliders operate in
- **Hue window** — range slider selecting a window of hues (±180°) around the middle hue
- **Lightness** — range slider filtering by CIELab lightness (L\*, 0–100)
- Matching colors are grouped into three hue buckets (each headed by its hue range and a count), sorted darkest to lightest, and rendered as compact swatches showing the name and hex value
- **Tap a swatch** to copy its hex — confirmed by a toast
- **Reset** restores the default full-spectrum view; the filter panel collapses to a summary on narrow screens and sticks to the top, and sits as a sticky sidebar next to the results on wide ones

Color conversions are computed with [colortranslator](https://github.com/NetanelBasal/colortranslator): hue from HSL, luminance from CIELab.

## Tech stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [React Router 7](https://reactrouter.com/) in framework mode with SSR — the index route is prerendered to static HTML at build time
- [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) primitives (Button, Slider, Card, Badge, Collapsible, Field, Empty, Sonner), themed by the `bdvw9FeS` preset, with slider rails rendered as CSS gradients
- [Vite+](https://viteplus.dev/) — unified toolchain (`vp` CLI): Vite 8 + Rolldown builds, Oxlint, Oxfmt, type-aware checks via `vp check`
- [radashi](https://radashi.js.org/) for filtering/grouping/sorting
- [Bun](https://bun.sh/) as the package manager (declared via `packageManager`, orchestrated by `vp`)

## Getting started

Requires the [`vp` CLI](https://viteplus.dev/) (on Windows: `irm https://vite.plus/ps1 | iex`). Node.js and Bun versions are selected automatically from `.node-version` and `packageManager`.

Install dependencies:

```sh
vp install
```

Start the dev server — SSR output is served at [`http://localhost:5173/siri-color-picker/`](http://localhost:5173/siri-color-picker/):

```sh
vp dev
```

Check formatting, lint, and types:

```sh
vp check
```

Build for production — emits `build/client` (static assets plus the prerendered `siri-color-picker/index.html`, basename-mirrored) and `build/server` (the SSR bundle):

```sh
react-router build
```

(`react-router build`, not `vp build`: React Router 7 prerenders from its own SSR-pass `writeBundle` hook, which vite-plus's built-in build command never triggers — the build would exit 0 with no prerendered HTML.)

Preview the production build locally:

```sh
vp preview
```

## Deployment

The app is deployed to GitHub Pages via the workflow in [`.github/workflows/pages.yml`](.github/workflows/pages.yml). Pages serves the prerendered `build/client` directory; the `build/server` bundle enables SSR when hosted on a Node server (e.g. `vp preview` or `react-router-serve`).

### Development snapshot

The same deployment also ships an unminified, sourcemapped build with React's development code at [https://millimoose.github.io/siri-color-picker/dev/](https://millimoose.github.io/siri-color-picker/dev/). It exists for React DevTools profiling: component names (`ColorSwatch`, `FilterPanel`) and functions (`selectColorGroups`) appear readable instead of minified, at the cost of bundle size and runtime speed.

Build it locally (emits to `dist/dev`, leaving the production `build/` output untouched):

```sh
DEV_SNAPSHOT=1 NODE_ENV=development react-router build
```

`DEV_SNAPSHOT=1` switches `basename`/`base` to `/siri-color-picker/dev/` and the output directory to `dist/dev` (via `react-router.config.ts` and `vite.config.ts`); `NODE_ENV=development` is what makes Vite statically replace `process.env.NODE_ENV` in the bundle so React ships its development builds. Without `DEV_SNAPSHOT`, `react-router build` behaves exactly as in the production path above. In CI, the snapshot is built after the production build and copied into `build/client/dev`, so the single Pages artifact serves both.

## Migration note

The UI was migrated from MUI to shadcn/ui on Tailwind v4: MUI's `Paper`/`Stack` layouts became Tailwind flex utilities, `Slider` + its gradient rails became shadcn's Radix-based `Slider` (composite `SliderTrack`/`SliderRange` API so the rails stay inline-styled gradients), and `Card`/`Typography`/`Button` became their shadcn counterparts. Filter state, `useDeferredValue` render deferral, and the `selectColorGroups` logic are unchanged; `@mui/material`, `@mui/icons-material`, and Emotion were removed entirely.

## License

Distributed under the [MIT License](LICENSE).
