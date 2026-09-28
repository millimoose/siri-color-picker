import { fileURLToPath } from 'node:url';
import { defineConfig, lazyPlugins } from 'vite-plus';
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';

// Development snapshot build (DEV_SNAPSHOT=1, see react-router.config.ts):
// unminified and sourcemapped so React DevTools profiles are readable. The
// snapshot's separate output directory and basename live in
// react-router.config.ts (React Router's build plugin forces the environment
// outDirs from its own buildDirectory, so vite build.outDir would not take).
// The vp-managed blocks (staged/fmt/lint) are toolchain-wide and must stay
// unconditional; without DEV_SNAPSHOT the resolved config is exactly the
// production configuration (no `build` block, prod base).
const DEV_SNAPSHOT = process.env.DEV_SNAPSHOT === '1';

// https://vitejs.dev/config/
export default defineConfig({
  staged: {
    '*': 'vp check --fix',
  },
  fmt: { singleQuote: true },
  lint: {
    jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
    rules: { 'vite-plus/prefer-vite-plus-imports': 'error' },
    options: { typeAware: true, typeCheck: true },
  },
  base: DEV_SNAPSHOT ? '/siri-color-picker/dev/' : '/siri-color-picker/',
  // RR8 no longer auto-configures the `~` alias; tsconfig paths mirror this.
  resolve: { alias: { '~': fileURLToPath(new URL('./app', import.meta.url)) } },
  plugins: lazyPlugins(() => [reactRouter(), tailwindcss()]),
  // Snapshot-only Vite build overrides; the spread stays empty for
  // production builds so their configuration is unchanged.
  ...(DEV_SNAPSHOT ? { build: { minify: false, sourcemap: true } } : {}),
});
