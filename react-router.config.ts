import type { Config } from '@react-router/dev/config';

export default {
  ssr: true,
  basename: '/siri-color-picker/',
  // Prerender the index route so GitHub Pages (static hosting) serves full
  // markup from build/client while ssr:true still ships the server bundle.
  prerender: ['/'],
} satisfies Config;
