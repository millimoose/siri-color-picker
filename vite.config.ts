import { fileURLToPath } from 'node:url';
import { defineConfig, lazyPlugins } from 'vite-plus';
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';

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
  base: '/siri-color-picker/',
  // RR8 no longer auto-configures the `~` alias; tsconfig paths mirror this.
  resolve: { alias: { '~': fileURLToPath(new URL('./app', import.meta.url)) } },
  plugins: lazyPlugins(() => [reactRouter(), tailwindcss()]),
});
