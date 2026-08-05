# UAP Times — repo guide for Claude

Static [Astro](https://astro.build) site for uaptimes.com. Articles are Markdown
with typed frontmatter in `src/content/articles/`; images live in `public/images/`.
Hosted on Cloudflare Pages, which deploys automatically on every push to `main`.

House style, research standards and the article template live in the
`uap-times-article` skill. This file covers only what's specific to the repo.

## Publishing policy

**Scheduled UAP Times articles publish without a review gate.** Commit the new
article and any backlink edits together, and push directly to `main`. This is a
standing instruction from Graham and it overrides the default "develop on a
`claude/*` branch" behaviour — for article publishing only. He reviews live and
can amend or revert.

Two conditions on that:

- **Never push an article that fails `npm run build`.** This is the real gate.
  The content schema is validated at build time, so a bad `topic` enum, a
  `credibility` outside 1–5, a malformed `pubDate` or a non-URL `heroImageRemote`
  fails the build loudly. Run it before every push.
- **Never fake a cross-link.** Only link slugs you have confirmed exist in
  `src/content/articles/`. A dead internal link builds fine and ships broken.

Because nothing is gated on a human read, the accuracy and attribution rules
carry full pre-publication weight: separate claim from confirmation, name
sources, include the sceptic's read, and rate credibility honestly. If every
candidate story is thin, recycled or already debunked, publish nothing and say
so — a sceptical skip beats hype.

Anything that isn't an article — schema changes, layout, workflows, scripts —
follows the normal branch-and-review flow. The no-gate policy covers content,
not code.

## Before writing

List `src/content/articles/` and skim recent pieces first. The archive is dense
on the current US disclosure thread, and duplicating a story already covered is
the most likely way to waste a run.

## Hero images

Set `heroImageRemote` to the generated image URL and leave `heroImage` on a
placeholder (`/images/placeholder-sky.svg`). Do **not** hard-code
`/images/<slug>-hero.png` yourself.

`.github/workflows/localise-hero-images.yml` runs `scripts/localise-hero-images.mjs`
on every push to `main` and `claude/**`. It downloads the remote image into
`public/images/<slug>-hero.png`, repoints `heroImage`, sets `heroCredit`, and
commits — in a *separate* commit from yours. Hard-coding the local path before
that commit lands means any build in between renders a broken image.

The sandbox usually can't reach the image CDN; CI runners can. So recording the
URL and pushing is the reliable path, not a fallback.

Because that workflow commits to `main` itself, `main` will often have moved
since you last fetched — pull before you push.

## Checks

```bash
npm ci
npm run build        # schema validation + full static build
```
