# Siri Color Picker

Browse a palette of 664 named colors — from Air Force Blue to Zinnwaldite Brown — filtered by hue and luminance with interactive sliders.

## Features

- **Middle Hue** — rotates the color wheel (0–360°) that the other sliders operate in
- **Hue** — range slider selecting a window of hues (±180°) around the middle hue
- **Luminance** — range slider filtering by CIELab lightness (L\*, 0–100)
- Matching colors are grouped into three hue buckets, sorted darkest to lightest, and rendered as cards showing the name, hex value, hue, and lightness
- **Reset** restores the default full-spectrum view

Color conversions are computed with [colortranslator](https://github.com/NetanelBasal/colortranslator): hue from HSL, luminance from CIELab.

## Tech stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite+](https://viteplus.dev/) — unified toolchain (`vp` CLI): Vite 8 + Rolldown builds, Oxlint, Oxfmt, type-aware checks via `vp check`
- [MUI](https://mui.com/) for the UI, with slider rails rendered as CSS gradients
- [radashi](https://radashi.js.org/) for filtering/grouping/sorting
- [Bun](https://bun.sh/) as the package manager (declared via `packageManager`, orchestrated by `vp`)

## Getting started

Requires the [`vp` CLI](https://viteplus.dev/) (on Windows: `irm https://vite.plus/ps1 | iex`). Node.js and Bun versions are selected automatically from `.node-version` and `packageManager`.

Install dependencies:

```sh
vp install
```

Start the dev server:

```sh
vp dev
```

Check formatting, lint, and types:

```sh
vp check
```

Build for production:

```sh
vp build
```

Preview the production build locally:

```sh
vp preview
```

## Deployment

The app is deployed to GitHub Pages via the workflow in [`.github/workflows/pages.yml`](.github/workflows/pages.yml).

## License

Distributed under the [MIT License](LICENSE).
