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

// What encoding a destination path is promising to hold.
const formatForExt = (dest) =>
  ({ '.webp': 'webp', '.jpg': 'jpeg', '.jpeg': 'jpeg', '.png': 'png' })[
    path.extname(dest).toLowerCase()
  ] || null;

// Write downloaded bytes to disk, optionally resizing/re-encoding first.
//
// Article heroes are written byte-for-byte, exactly as before — one hero per
// page at ~2MB is fine. Site-media assets can opt in to optimisation with
// `maxWidth` / `format`, which matters for pages carrying several images at
// once (the field kit page has eight; unoptimised that's ~30MB of PNG).
//
// Opt-in assets REQUIRE sharp. If it's missing we skip the asset and report a
// failure rather than writing PNG bytes to a .webp path — a loudly missing
// image is easier to spot and fix than a silently mislabelled one.
async function writeAsset(dest, bytes, { maxWidth, maxHeight, format } = {}) {
  if (!maxWidth && !maxHeight && !format) {
    await writeFile(dest, bytes);
    return;
  }
  // The encoding is whatever the destination extension says it is. Every
  // remote here is a PNG, so a .webp or .jpg path that didn't re-encode would
  // land PNG bytes under a lying extension — 2.5MB where 75KB was intended.
  // Taking the extension as the source of truth makes that unrepresentable,
  // and an explicit `format` that contradicts it is a mistake, not an override.
  const wanted = formatForExt(dest);
  if (!wanted) {
    throw new Error(`can't optimise ${dest}: expected a .webp, .jpg or .png destination`);
  }
  if (format && format !== wanted) {
    throw new Error(`format "${format}" contradicts the destination ${dest} (expected "${wanted}")`);
  }
  const { default: sharp } = await import('sharp');
  let img = sharp(bytes);
  // Both dimensions given: crop to exactly that box, so the file matches the
  // width/height the page declares. One alone: scale and keep the ratio.
  if (maxWidth && maxHeight) {
    img = img.resize({ width: maxWidth, height: maxHeight, fit: 'cover', withoutEnlargement: true });
  } else if (maxWidth || maxHeight) {
    img = img.resize({ width: maxWidth, height: maxHeight, withoutEnlargement: true });
  }
  if (wanted === 'webp') img = img.webp({ quality: 80 });
  else if (wanted === 'jpeg') img = img.jpeg({ quality: 82, mozjpeg: true });
  else img = img.png();
  await writeFile(dest, await img.toBuffer());
}

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

// Warn when a committed site-media file doesn't match the maxWidth/maxHeight/
// format now recorded for it. The download loop is deliberately idempotent, so
// changing those fields for an existing asset has no effect until the file is
// deleted — this turns that silent no-op into a line in the CI log.
async function warnIfStale(dest, { maxWidth, maxHeight, format }) {
  if (!maxWidth && !maxHeight && !format) return;
  try {
    const { default: sharp } = await import('sharp');
    const m = await sharp(dest).metadata();
    const wrong = [];
    // Compare against the extension, not the declared format — a file whose
    // bytes disagree with its own name is exactly what we want to hear about.
    const wantedFormat = format || formatForExt(dest);
    if (wantedFormat && m.format !== wantedFormat) {
      wrong.push(`format ${m.format} != ${wantedFormat}`);
    }
    if (maxWidth && m.width > maxWidth) wrong.push(`width ${m.width} > ${maxWidth}`);
    if (maxWidth && maxHeight && (m.width !== maxWidth || m.height !== maxHeight)) {
      wrong.push(`size ${m.width}x${m.height} != ${maxWidth}x${maxHeight}`);
    }
    if (wrong.length) {
      console.warn(`stale: ${dest} (${wrong.join(', ')}) — delete the file to re-derive it`);
    }
  } catch {
    // Metadata is a nicety; never let it fail the run.
  }
}

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
      if (await fileExists(dest)) {
        // Idempotent — but say so loudly when the committed file no longer
        // matches the spec beside it. Editing maxWidth/maxHeight/format for an
        // asset that already exists otherwise looks like it did nothing.
        await warnIfStale(dest, asset);
        continue;
      }
      if (!isAllowedHost(remote)) {
        console.warn(`skip site media: host not on allow-list -> ${remote}`);
        failed++;
        continue;
      }
      try {
        const res = await fetch(remote);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await writeAsset(dest, Buffer.from(await res.arrayBuffer()), asset);
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
// A missing hero shouldn't block a deploy, so this still exits 0 — but a
// failure buried in a green log is easy to miss, so raise it as a GitHub
// Actions error annotation too. That surfaces it on the run page (and in the
// commit's checks) without failing the job.
if (failed > 0) {
  console.log(
    `::error title=Image localisation::${failed} image(s) failed to localise — see the log above`
  );
}
process.exit(0);
