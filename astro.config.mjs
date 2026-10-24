import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Your live address. Set SITE_URL in GitHub (Settings > Secrets and variables > Actions > Variables).
const site = process.env.SITE_URL || 'https://ditto-hub.pages.dev';
// PREVIEW=1 builds a copy that can be opened from any folder (used for the shareable preview).
const isPreview = process.env.PREVIEW === '1';

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  integrations: isPreview
    ? []
    : [sitemap({ filter: (page) => !/\/(admin|offline|bag|wishlist)\/$/.test(page) })],
  vite: {
    define: { __PREVIEW__: JSON.stringify(isPreview) },
    build: { modulePreload: false, assetsInlineLimit: 0 },
  },
  devToolbar: { enabled: false },
});
