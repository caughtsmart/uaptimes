#!/usr/bin/env node
// Localise remote hero images into the repo.
//
// The article-writing workflow can't always download a generated hero image
// itself — the web sandbox it runs in is blocked from the image CDN. So it
// records the image's URL in the article frontmatter as `heroImageRemote`, and
// this script — run in CI, where outbound internet is open — fetches the file
// into public/images/ and points `heroImage` at the local copy.
//
// Idempotent: once the local file exists the article is skipped, so re-runs
// (and the commit this script's own changes trigger) do no further work.

import { readdir, readFile, writeFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const ARTICLES_DIR = 'src/content/articles';
const IMAGES_DIR = 'public/images';
const SITE_MEDIA_FILE = 'src/site-media.json';

// Only pull from hosts we expect, so a stray URL can't have us commit junk.
const ALLOWED_HOSTS = [/\.cloudfront\.net$/, /(^|\.)higgsfield\.ai$/];

const isAllowedHost = (u) => {
  try {
    return ALLOWED_HOSTS.some((re) => re.test(new URL(u).hostname));
  } catch {
    return false;
  }
};

const fileExists = (p) =>
  access(p, constants.F_OK).then(() => true).catch(() => false);

// Read a simple `key: "..."` / `key: ...` frontmatter line.
const readField = (fm, key) => {
  const m = fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
};

// Replace (or append) a single frontmatter line, leaving everything else be.
const setField = (fm, key, value) => {
  const line = `${key}: "${value}"`;
  const re = new RegExp(`^${key}:.*$`, 'm');
  return re.test(fm) ? fm.replace(re, line) : `${fm}\n${line}`;
};

const extFromUrl = (u) => {
  const ext = path.extname(new URL(u).pathname).toLowerCase();
  return /^\.(png|jpe?g|webp|gif|avif)$/.test(ext) ? ext : '.png';
};

let changed = 0;
let failed = 0;

// --- Static site media (masthead background, etc.) ------------------------
// Same problem as article heroes — recorded as remote URLs in site-media.json
// and pulled down here in CI. No frontmatter to rewrite; just fetch the bytes
// to a fixed path if they're not already present.
if (await fileExists(SITE_MEDIA_FILE)) {
  try {
    const manifest = JSON.parse(await readFile(SITE_MEDIA_FILE, 'utf8'));
    for (const asset of manifest.assets || []) {
      const { remote, path: dest } = asset;
      if (!remote || !dest) continue;
      if (await fileExists(dest)) continue; // idempotent
      if (!isAllowedHost(remote)) {
        console.warn(`skip site media: host not on allow-list -> ${remote}`);
        failed++;
        continue;
      }
      try {
        const res = await fetch(remote);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await writeFile(dest, Buffer.from(await res.arrayBuffer()));
        console.log(`localised site media -> ${dest}`);
        changed++;
      } catch (err) {
        console.error(`FAILED site media ${dest}: ${err.message} (${remote})`);
        failed++;
      }
    }
  } catch (err) {
    console.error(`site-media.json unreadable: ${err.message}`);
  }
}

const files = (await readdir(ARTICLES_DIR)).filter((f) => f.endsWith('.md'));

for (const file of files) {
  const slug = file.replace(/\.md$/, '');
  const mdPath = path.join(ARTICLES_DIR, file);
  const raw = await readFile(mdPath, 'utf8');

  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) continue;
  const fm = fmMatch[1];

  const remote = readField(fm, 'heroImageRemote');
  if (!remote) continue;

  const ext = extFromUrl(remote);
  const localRel = `/images/${slug}-hero${ext}`;
  const localAbs = path.join(IMAGES_DIR, `${slug}-hero${ext}`);

  // Already downloaded — just make sure heroImage points at it.
  if (await fileExists(localAbs)) {
    if (readField(fm, 'heroImage') !== localRel) {
      await writeFile(mdPath, raw.replace(fm, setField(fm, 'heroImage', localRel)));
      console.log(`fixed heroImage path for ${slug}`);
      changed++;
    }
    continue;
  }

  if (!isAllowedHost(remote)) {
    console.warn(`skip ${slug}: host not on allow-list -> ${remote}`);
    failed++;
    continue;
  }

  try {
    const res = await fetch(remote);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await writeFile(localAbs, Buffer.from(await res.arrayBuffer()));

    let newFm = setField(fm, 'heroImage', localRel);
    const credit = readField(newFm, 'heroCredit') || '';
    if (!credit || /placeholder/i.test(credit)) {
      newFm = setField(newFm, 'heroCredit', 'AI-generated illustration');
    }
    await writeFile(mdPath, raw.replace(fm, newFm));
    console.log(`localised ${slug}-hero${ext}`);
    changed++;
  } catch (err) {
    console.error(`FAILED ${slug}: ${err.message} (${remote})`);
    failed++;
  }
}

console.log(`done: ${changed} updated, ${failed} failed`);
// A missing hero shouldn't block a deploy — failures are surfaced in the log.
process.exit(0);
