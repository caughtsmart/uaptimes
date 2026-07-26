// ---------------------------------------------------------------
// UAP Times — Forum configuration
//
// The forum is powered by **giscus** (https://giscus.app), which turns
// your repo's GitHub Discussions into threaded comment boards. It's free,
// needs no backend, and works perfectly on static hosting (Cloudflare Pages).
//
// ONE-TIME SETUP (about 3 minutes) — see FORUM-SETUP.md for the full walk-through:
//   1. On GitHub → your repo → Settings → General → Features → tick "Discussions".
//   2. Install the giscus app: https://github.com/apps/giscus  (grant it this repo).
//   3. Go to https://giscus.app, enter your repo, pick the "Discussion" category
//      you want threads created in (a "General"-style category works well), and
//      copy the four values it generates into GISCUS below.
//
// Until GISCUS.repoId is filled in, the boards render a friendly "coming soon"
// notice instead of a broken widget — so it's safe to ship before setup is done.
// ---------------------------------------------------------------

export interface GiscusConfig {
  /** "owner/repo" — the repo whose Discussions back the forum. */
  repo: `${string}/${string}`;
  /** The repo's node ID from giscus.app, e.g. "R_kgD...". */
  repoId: string;
  /** The Discussions category name, e.g. "General". */
  category: string;
  /** The category's node ID from giscus.app, e.g. "DIC_kwD...". */
  categoryId: string;
}

// 👉 Paste the values from https://giscus.app here.
export const GISCUS: GiscusConfig = {
  repo: 'caughtsmart/uaptimes',
  repoId: 'REPO_ID_FROM_GISCUS_APP',
  category: 'General',
  categoryId: 'CATEGORY_ID_FROM_GISCUS_APP',
};

/** True once the placeholders above have been replaced with real values. */
export const isGiscusConfigured =
  GISCUS.repoId !== 'REPO_ID_FROM_GISCUS_APP' &&
  GISCUS.categoryId !== 'CATEGORY_ID_FROM_GISCUS_APP' &&
  GISCUS.repoId.length > 0 &&
  GISCUS.categoryId.length > 0;

export interface Board {
  /** URL slug — the board lives at /forum/<slug>/ */
  slug: string;
  /** Display name */
  title: string;
  /** One-line description shown on the forum index card */
  blurb: string;
  /** Emoji shown next to the board */
  icon: string;
}

// The boards. Each board is its own giscus discussion thread, keyed by the
// slug, so conversations stay separated. Add, remove, or reorder freely.
export const BOARDS: Board[] = [
  {
    slug: 'general',
    title: 'General Discussion',
    blurb: 'Introduce yourself and talk anything UAP that doesn’t fit elsewhere.',
    icon: '🛸',
  },
  {
    slug: 'sightings',
    title: 'Sightings & Encounters',
    blurb: 'Report what you saw, compare notes, and help others sort signal from flare.',
    icon: '👁️',
  },
  {
    slug: 'disclosure',
    title: 'Government & Disclosure',
    blurb: 'Hearings, FOIA drops, whistleblowers, and the slow grind toward the record.',
    icon: '🏛️',
  },
  {
    slug: 'science',
    title: 'Science & Analysis',
    blurb: 'Sensor data, propulsion physics, statistics, and healthy peer review.',
    icon: '🔬',
  },
  {
    slug: 'lounge',
    title: 'The Lounge',
    blurb: 'Off-topic chatter, book and film recs, and general hangout.',
    icon: '☕',
  },
];

export const getBoard = (slug: string): Board | undefined =>
  BOARDS.find((b) => b.slug === slug);
