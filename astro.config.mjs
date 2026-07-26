// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';
import path from 'node:path';

// Your live domain — used for the sitemap, RSS feed and social share cards.
const SITE_URL = 'https://uaptimes.com';

// Build a map of /articles/<slug>/ -> last-modified date, read straight from
// the article frontmatter, so the sitemap can carry accurate <lastmod> dates.
// Fresh lastmod is a real crawl/freshness signal, especially for a news site.
function articleLastmod() {
  const dir = path.resolve('./src/content/articles');
  const map = {};
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.md')) continue;
    const src = fs.readFileSync(path.join(dir, file), 'utf8');
    const fm = src.split('---')[1] || '';
    if (/\bdraft:\s*true/.test(fm)) continue;
    const pub = fm.match(/\bpubDate:\s*"?([0-9]{4}-[0-9]{2}-[0-9]{2})/);
    const upd = fm.match(/\bupdatedDate:\s*"?([0-9]{4}-[0-9]{2}-[0-9]{2})/);
    const date = (upd && upd[1]) || (pub && pub[1]);
    if (date) map[`/articles/${file.replace(/\.md$/, '')}/`] = new Date(date).toISOString();
  }
  return map;
}
const LASTMOD = articleLastmod();

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  integrations: [
    sitemap({
      serialize(item) {
        const p = new URL(item.url).pathname;
        if (LASTMOD[p]) item.lastmod = LASTMOD[p];
        // Homepage changes most often; articles are the priority content.
        if (p === '/') item.changefreq = 'daily', (item.priority = 1.0);
        else if (p.startsWith('/articles/')) item.changefreq = 'monthly', (item.priority = 0.8);
        else item.changefreq = 'weekly';
        return item;
      },
    }),
  ],
  markdown: {
    shikiConfig: {
      theme: 'css-variables',
    },
  },
});
