import type { Config } from '@react-router/dev/config';

// DEV_SNAPSHOT=1 builds a second, unminified + sourcemapped snapshot of the
// app for React DevTools profiling (deployed to Pages under
// /siri-color-picker/dev/, see the "Development snapshot" README section).
// React itself is switched to its development builds via NODE_ENV=development
// in the build step's environment: Vite statically replaces
// process.env.NODE_ENV in the bundle from the actual NODE_ENV env var.
// Every consumer that evaluates this file without DEV_SNAPSHOT (production
// builds, `vp check`/fmt/lint metadata reads) gets the production values.
const DEV_SNAPSHOT = process.env.DEV_SNAPSHOT === '1';

export default {
  ssr: true,
  basename: DEV_SNAPSHOT ? '/siri-color-picker/dev/' : '/siri-color-picker/',
  // The snapshot builds into a separate tree (dist/dev) so the production
  // build/ artifacts are never touched; 'build' is React Router's own default.
  buildDirectory: DEV_SNAPSHOT ? 'dist/dev' : 'build',
  // Prerender the index route so GitHub Pages (static hosting) serves full
  // markup from build/client while ssr:true still ships the server bundle.
  prerender: ['/'],
} satisfies Config;
