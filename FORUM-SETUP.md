# Forum setup (one-time, ~3 minutes)

The **Forum** section is already built and live in the site's navigation. It uses
[**giscus**](https://giscus.app) — a free, backend-less widget that turns this
repo's **GitHub Discussions** into threaded discussion boards. Perfect for a static
site on Cloudflare Pages: no server, no database, no monthly bill.

Until you complete the four steps below, the boards show a friendly *"warming up"*
notice instead of the widget, so it's safe to have shipped this already.

---

## 1. Enable Discussions on the repo

GitHub → your `uaptimes` repo → **Settings** → **General** →
scroll to **Features** → tick **Discussions**.

## 2. Install the giscus app

Open <https://github.com/apps/giscus> → **Install** → grant it access to the
`uaptimes` repository (only this repo is needed).

## 3. Get your four config values

Go to <https://giscus.app> and, in the **Configuration** section:

- **Repository**: enter `caughtsmart/uaptimes`. A green tick confirms it's ready.
- **Page ↔ Discussions Mapping**: leave as-is — the site sets this per board in code.
- **Discussion Category**: pick a category (e.g. **General**). Announcement-type
  categories work too if you want only maintainers to open the top-level threads.
- **Theme**: ignore — the site pins its own dark theme.

Scroll to the **Enable giscus** box at the bottom. In the generated `<script>`
snippet, copy these two values:

- `data-repo-id="R_..."`
- `data-category-id="DIC_..."`

## 4. Paste them into the config

Open [`src/config/forum.ts`](src/config/forum.ts) and fill in `GISCUS`:

```ts
export const GISCUS: GiscusConfig = {
  repo: 'caughtsmart/uaptimes',
  repoId: 'R_kgD...',              // ← data-repo-id from giscus.app
  category: 'General',            // ← the category name you picked
  categoryId: 'DIC_kwD...',       // ← data-category-id from giscus.app
};
```

Commit and push. Cloudflare rebuilds, and the boards go live — readers post by
signing in with their GitHub account.

---

## Notes

- **Boards** are defined in the `BOARDS` array in the same file. Add, rename, or
  reorder them freely; each board is its own discussion thread keyed by its slug.
- **Moderation** happens in GitHub Discussions (hide, lock, delete, block) — the
  same tools you already have as the repo owner.
- **Privacy**: giscus loads only when a board page is opened, sets no tracking
  cookies, and posts go through GitHub's own auth. No third-party analytics.
