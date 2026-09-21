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

- [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) for dev server and builds
- [MUI](https://mui.com/) for the UI, with slider rails rendered as CSS gradients
- [lodash-es](https://www.npmjs.com/package/lodash-es) for filtering/grouping/sorting

## Getting started

Requires Node.js. Install dependencies:

```sh
npm install
```

Start the dev server:

```sh
npm run dev
```

Build for production (type-checks with `tsc`, then bundles with Vite):

```sh
npm run build
```

Preview the production build locally:

```sh
npm run preview
```

Lint the sources:

```sh
npm run lint
```

## Deployment

The app is deployed to GitHub Pages via the workflow in [`.github/workflows/pages.yml`](.github/workflows/pages.yml).

## License

Distributed under the [MIT License](LICENSE).
