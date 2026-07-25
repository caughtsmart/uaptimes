// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Your live domain — used for the sitemap, RSS feed and social share cards.
const SITE_URL = 'https://uaptimes.com';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      theme: 'css-variables',
    },
  },
});
