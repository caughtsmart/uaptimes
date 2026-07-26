import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// The "articles" collection. Every .md file in src/content/articles/
// must have frontmatter matching this schema. If a field is wrong or
// missing, `astro build` fails loudly — which is exactly what you want,
// because it stops a broken post going live.
const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    // Optional shorter, keyword-front-loaded title for the <title> tag and
    // social cards. Google shows ~60 chars incl. the " — UAP Times" suffix, so
    // long editorial headlines get truncated in results. When set, this is used
    // for SEO metadata; the full `title` still renders as the on-page <h1>.
    seoTitle: z.string().optional(),
    description: z.string(),               // used for SEO + the card preview
    pubDate: z.coerce.date(),              // "2026-07-24" becomes a real Date
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('UAP Times Desk'),
    topic: z.enum([
      'Sightings',
      'Government & Disclosure',
      'Science',
      'History',
      'Analysis',
    ]),
    tags: z.array(z.string()).default([]),
    heroImage: z.string().optional(),      // path in /public, e.g. /images/foo.jpg
    heroCredit: z.string().optional(),
    // Optional remote source for the hero (e.g. a freshly generated image on a
    // CDN). CI downloads it into /public/images and repoints heroImage at the
    // local copy — see scripts/localise-hero-images.mjs. Lets the article
    // pipeline record an image URL even when it can't fetch the bytes itself.
    heroImageRemote: z.string().url().optional(),
    // A bit of house personality: how much salt to take the story with.
    // 1 = "we saw the FAA report ourselves", 5 = "bloke on Facebook".
    credibility: z.number().min(1).max(5).default(3),
    source: z.string().optional(),         // where the claim originates
    sourceUrl: z.string().url().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),     // draft:true is hidden from the live site
  }),
});

export const collections = { articles };
