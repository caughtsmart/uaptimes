# UAP Times 🛸

*UAP news, filed from the edge of the known.*

A fast, SEO-friendly UFO/UAP news site built with [Astro](https://astro.build).
Articles are plain Markdown files, the whole site is static (so hosting is free),
and it comes wired for audience-building: RSS feed, sitemap, social share cards,
and an email-signup block.

Live domain: **uaptimes.com** · Hosting: **Cloudflare Pages** (auto-deploys from GitHub).

---

## Quick start (run it on your own machine)

You need [Node.js](https://nodejs.org) 18+ installed. Then, in this folder:

```bash
npm install       # first time only — downloads the tools
npm run dev        # starts a live preview at http://localhost:4321
```

Edit a file, save, and the browser updates instantly. When you're happy:

```bash
npm run build      # outputs the finished site into dist/
npm run preview    # preview the built version locally
```

---

## Publishing to your live site (uaptimes.com)

Your GitHub repo (`uaptimes`) is already connected to Cloudflare Pages, so
**pushing to GitHub = publishing**. To get this project into that repo the first
time, open a terminal in this folder and run:

```bash
git init
git add .
git commit -m "Initial commit: UAP Times site"
git branch -M main
# replace YOURNAME with your GitHub username:
git remote add origin https://github.com/YOURNAME/uaptimes.git
git push -u origin main
```

If GitHub already put a README or licence in the repo when you created it, the
push above may be rejected. Easiest fix — pull their file in first, then push:

```bash
git pull origin main --allow-unrelated-histories --no-edit
git push -u origin main
```

After that, your day-to-day workflow is just:

```bash
git add .
git commit -m "New article: whatever it's about"
git push
```

Cloudflare rebuilds and redeploys automatically within a minute or two.

> **Build settings in Cloudflare** (if it asks): Framework preset = **Astro**,
> build command = `npm run build`, output directory = `dist`.

---

## Writing a new article

1. Create a new `.md` file in `src/content/articles/`. The **filename becomes the
   URL** (e.g. `roswell-anniversary.md` → `/articles/roswell-anniversary/`), so
   keep it lowercase-with-hyphens.
2. Copy the frontmatter block (the bit between the `---` lines) from an existing
   article and fill it in. Fields:

   | Field | Required | What it does |
   |-------|----------|--------------|
   | `title` | ✅ | Headline |
   | `description` | ✅ | Card preview + SEO/social summary |
   | `pubDate` | ✅ | Publish date, `YYYY-MM-DD` |
   | `topic` | ✅ | One of: Sightings, Government & Disclosure, Science, History, Analysis |
   | `author` | | Defaults to "UAP Times Desk" |
   | `tags` | | List, e.g. `["Roswell", "history"]` |
   | `heroImage` | | Path in `public/`, e.g. `/images/roswell.jpg` |
   | `heroCredit` | | Image credit line |
   | `credibility` | | 1 (solid) to 5 (take with salt) — shows as dots |
   | `source` / `sourceUrl` | | Where the claim comes from |
   | `featured` | | `true` to mark it (available for future use) |
   | `draft` | | `true` hides it from the live site — perfect for work in progress |

3. Write the article body in Markdown below the frontmatter. **Use `#####`
   (five hashes) for section headings** — the theme styles those as the serif
   sub-heads you see in the sample posts.

> ⚠️ **The three sample articles are illustrative** — written to demonstrate the
> format and house voice. Fact-check and update them (or delete them) before you
> rely on them; don't publish them as-is.

---

## The community forum

There's a **Forum** section (linked in the nav) with themed discussion boards —
General, Sightings, Disclosure, Science, and a Lounge. It's powered by
[giscus](https://giscus.app), which uses this repo's **GitHub Discussions** as the
backend, so it's free and needs no server. Boards show a "warming up" notice until
you complete a quick one-time hookup — see **[FORUM-SETUP.md](FORUM-SETUP.md)**.
Add or rename boards in `src/config/forum.ts`.

## Turning on email signups (your #1 growth lever)

The signup box (`src/components/EmailSignup.astro`) is a demo until you connect a
provider. Both of these have generous free tiers and give you copy-paste HTML:

- **[MailerLite](https://www.mailerlite.com)** — simplest, generous free tier.
- **[Kit / ConvertKit](https://kit.com)** — creator-focused, great automations.

Sign up, create an audience/form, copy their embed code, and paste it in place of
the `<form>` in `EmailSignup.astro`. No backend needed.

---

## A tip@uaptimes.com inbox for free

The site links to `tips@uaptimes.com`. Since your domain is on Cloudflare, you can
turn on **Cloudflare Email Routing** (free) to forward that address to your normal
inbox — no mailbox to pay for. It's in the Cloudflare dashboard under
**Email → Email Routing**.

---

## Auto-posting to social media (free reach)

The site publishes an RSS feed at `/rss.xml`. Point a free
[Zapier](https://zapier.com) or [Make](https://make.com) "RSS → X/Facebook/Bluesky"
automation at it, and every new article posts itself. Set-and-forget distribution.

---

## Project structure

```
uaptimes/
├─ astro.config.mjs        ← site URL + integrations
├─ src/
│  ├─ content.config.ts    ← the article schema (what fields a post needs)
│  ├─ content/articles/    ← your articles live here (.md files)
│  ├─ components/           ← Header, Footer, ArticleCard, EmailSignup
│  ├─ layouts/              ← BaseLayout (page shell + SEO), ArticleLayout
│  ├─ pages/                ← routes: home, about, /articles/*, /topics/*, rss
│  └─ styles/global.css     ← ALL the styling + design tokens (re-skin here)
└─ public/                  ← images, favicon (served as-is)
```

Want to re-skin the whole site? Open `src/styles/global.css` and edit the colour
variables at the top (`--accent`, `--bg`, etc.). Everything keys off those.

---

The truth is out there; the CSS is in `global.css`.
