// -----------------------------------------------------------------------------
// UAP Times — Live Sightings Wire crawler
//
// Pulls the latest UAP/UFO chatter from a handful of OPEN, FREE, no-auth
// sources, normalises it into short paragraphs, flags the interesting-looking
// ones with a simple keyword rulebook, and writes src/data/live-sightings.json.
//
// It is deliberately best-effort: every source is wrapped so that one going
// down (rate-limited, offline, format change) never takes the whole run — and
// never wipes the page. If a run collects nothing, the previous JSON is kept.
//
// Runs every 3 hours from .github/workflows/fetch-sightings.yml (GitHub runners have
// open internet, unlike the article-authoring sandbox). No API keys, no
// secrets, nothing to pay for.
// -----------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OUT = path.resolve('./src/data/live-sightings.json');
const MAX_ITEMS = 90;                 // how many entries the page keeps
const UA = 'UAPTimesWireBot/1.0 (+https://uaptimes.com)';

// Optional LLM enrichment (dedupe near-identical stories + a one-line analyst
// read on the notable ones). Runs only when ANTHROPIC_API_KEY is present, and
// is fully best-effort — any failure falls back to the rules-based output, so
// the wire never breaks. Model is a single knob: Opus 5 by default; swap to
// e.g. "claude-haiku-4-5" here to change the model / cost.
const LLM_MODEL = 'claude-haiku-4-5';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

// ---- What counts as "interesting" -------------------------------------------
// Each keyword that appears adds to a signal score. Higher-signal terms (a
// pilot, military radar, a government body) weigh more than a bare "light in
// the sky". Above THRESHOLD an item is flagged Notable on the page.
const SIGNALS = [
  [/\b(navy|air ?force|military|norad|noaa|faa|pentagon|dod|nasa)\b/i, 3, 'military/agency'],
  [/\b(pilot|aircrew|air ?traffic|cockpit|airline|airport)\b/i, 3, 'aviation'],
  [/\b(radar|infrared|flir|gimbal|sensor|telemetry|transponder)\b/i, 3, 'instrumented'],
  [/\b(congress|senate|hearing|whistleblow|disclosure|classified|grusch|aaro)\b/i, 3, 'government'],
  [/\b(multiple witnesses|dozens|hundreds|crowd|simultaneous)\b/i, 2, 'mass sighting'],
  [/\b(video|footage|photograph|photo|caught on camera|captured)\b/i, 1, 'has media'],
  [/\b(triangle|tic ?tac|orb|disc|craft|formation|fleet)\b/i, 1, 'craft shape'],
  [/\b(landing|landed|abduct|entity|being|occupant|creature)\b/i, 2, 'close encounter'],
];
const THRESHOLD = 3;

// Only keep items that are actually on-topic — kills off-topic news bleed.
const TOPICAL = /\b(uap|ufo|ufos|unidentified|flying object|anomalous|sighting|orb|tic ?tac)\b/i;

// ---- tiny helpers -----------------------------------------------------------
const stripTags = (s = '') =>
  s.replace(/<[^>]*>/g, ' ')
   .replace(/&nbsp;/g, ' ')
   .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
   .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
   .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
   .replace(/\s+/g, ' ')
   .trim();

const clip = (s, n = 300) => {
  s = (s || '').trim();
  if (s.length <= n) return s;
  return s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
};

const idFor = (url, title) =>
  crypto.createHash('sha1').update((url || '') + '|' + (title || '')).digest('hex').slice(0, 12);

// grab all <tag>…</tag> blocks
const blocks = (xml, tag) => {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  const out = [];
  let m;
  while ((m = re.exec(xml))) out.push(m[1]);
  return out;
};
const field = (xml, tag) => {
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(xml);
  if (!m) return '';
  return stripTags(m[1].replace(/<!\[CDATA\[|\]\]>/g, ''));
};
const attr = (xml, tag, name) => {
  const m = new RegExp(`<${tag}[^>]*\\b${name}="([^"]*)"`, 'i').exec(xml);
  return m ? m[1] : '';
};

async function get(url, { json = false } = {}) {
  const res = await fetch(url, {
    headers: { 'user-agent': UA, accept: json ? 'application/json' : 'application/rss+xml, application/xml, text/xml, */*' },
    // don't let a slow source hang the whole job
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return json ? res.json() : res.text();
}

// ---- sources ----------------------------------------------------------------

// Google News RSS — aggregates mainstream + local press. No key, no auth.
async function fromGoogleNews() {
  const q = encodeURIComponent('("UAP" OR "UFO" OR "unidentified flying object") (sighting OR spotted OR filmed) when:3d');
  const xml = await get(`https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`);
  return blocks(xml, 'item').map((it) => {
    const title = field(it, 'title');
    // Google prefixes the source onto the title after " - "
    const src = field(it, 'source') || (title.split(' - ').pop() || 'News');
    const cleanTitle = title.replace(new RegExp(`\\s*-\\s*${src}\\s*$`), '');
    return {
      title: cleanTitle,
      summary: clip(field(it, 'description') || cleanTitle),
      url: field(it, 'link'),
      date: field(it, 'pubDate'),
      source: src,
      sourceType: 'news',
    };
  });
}

// Bluesky — fully open public API, no auth needed. Real-time firehose search.
async function fromBluesky() {
  const out = [];
  for (const term of ['UFO sighting', 'UAP sighting']) {
    const data = await get(
      `https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(term)}&limit=25&sort=latest`,
      { json: true },
    );
    for (const p of data.posts || []) {
      const rkey = (p.uri || '').split('/').pop();
      const handle = p.author?.handle;
      out.push({
        title: clip(p.record?.text || '', 120),
        summary: clip(p.record?.text || ''),
        url: handle && rkey ? `https://bsky.app/profile/${handle}/post/${rkey}` : undefined,
        date: p.indexedAt || p.record?.createdAt,
        source: `Bluesky · @${handle || 'unknown'}`,
        sourceType: 'social',
      });
    }
  }
  return out;
}

// Reddit — public per-subreddit RSS. Best-effort: Reddit sometimes rate-limits
// cloud IPs, so a 429/403 here just means "no reddit this hour", not a failure.
async function fromReddit() {
  const out = [];
  for (const sub of ['UFOs', 'UFOB', 'aliens', 'HighStrangeness']) {
    try {
      const xml = await get(`https://www.reddit.com/r/${sub}/new/.rss?limit=25`);
      for (const e of blocks(xml, 'entry')) {
        out.push({
          title: field(e, 'title'),
          summary: clip(field(e, 'content')),
          url: attr(e, 'link', 'href'),
          date: field(e, 'updated') || field(e, 'published'),
          source: `Reddit · r/${sub}`,
          sourceType: 'social',
        });
      }
    } catch (err) {
      console.warn(`    r/${sub}: skipped (${err.message})`);
    }
  }
  return out;
}

// Mastodon — the public hashtag timeline API is open, no auth. We poll a few
// large instances so we're not reliant on any single server being up.
async function fromMastodon() {
  const out = [];
  const instances = ['mastodon.social', 'mstdn.social'];
  const tags = ['ufo', 'uap', 'ufosighting', 'ufos'];
  for (const host of instances) {
    for (const tag of tags) {
      try {
        const data = await get(
          `https://${host}/api/v1/timelines/tag/${tag}?limit=15`,
          { json: true },
        );
        for (const s of data || []) {
          out.push({
            title: clip(stripTags(s.content || ''), 120),
            summary: clip(stripTags(s.content || '')),
            url: s.url || s.uri,
            date: s.created_at,
            source: `Mastodon · @${s.account?.username || 'unknown'}`,
            sourceType: 'social',
          });
        }
      } catch (err) {
        console.warn(`    ${host}#${tag}: skipped (${err.message})`);
      }
    }
  }
  return out;
}

// ---- scoring & assembly -----------------------------------------------------
function score(item) {
  const hay = `${item.title} ${item.summary}`;
  let n = 0;
  const signals = [];
  for (const [re, weight, label] of SIGNALS) {
    if (re.test(hay)) { n += weight; signals.push(label); }
  }
  return { n, signals };
}

function normDate(d) {
  const t = Date.parse(d || '');
  return Number.isNaN(t) ? 0 : t;
}

// ---- LLM enrichment (optional, best-effort) ---------------------------------
// Asks Claude to (1) cluster near-identical stories so we can collapse repeats,
// and (2) write a one-line analyst read + credibility (1–5) for the notable
// ones. Returns { items } with duplicates removed and `read` notes attached,
// or the input untouched on any failure.
const ENRICH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    duplicates: {
      // Groups of ids reporting the SAME event. The first id in each group is
      // the one to keep; the rest are collapsed away.
      type: 'array',
      items: { type: 'array', items: { type: 'string' } },
    },
    reads: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          credibility: { type: 'integer', enum: [1, 2, 3, 4, 5] },
          note: { type: 'string' },
        },
        required: ['id', 'credibility', 'note'],
      },
    },
  },
  required: ['duplicates', 'reads'],
};

async function enrich(items) {
  if (!ANTHROPIC_KEY) {
    console.log('  LLM: skipped (no ANTHROPIC_API_KEY set)');
    return items;
  }

  // Only send what the model needs to reason about.
  const brief = items.map((it) => ({
    id: it.id,
    title: it.title,
    summary: it.summary,
    source: it.source,
    notable: it.notable,
  }));

  const system =
    'You are the UAP Times intake desk. You triage raw, unverified UFO/UAP ' +
    'sighting reports pulled from open press and social feeds. Be sceptical and ' +
    'concise. Two jobs: (1) find groups of items describing the SAME real-world ' +
    'event so duplicates can be collapsed — put the single best-sourced item ' +
    "first in each group; (2) for every item marked notable, write a plain " +
    'one-sentence analyst read (what makes it interesting or what undercuts it) ' +
    'and a credibility score 1–5 (1 = well-sourced/hard evidence, 5 = take with ' +
    'salt). Never invent ids; only use ids present in the input.';

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      signal: AbortSignal.timeout(90000),
      body: JSON.stringify({
        model: LLM_MODEL,
        max_tokens: 4096,
        thinking: { type: 'disabled' },
        output_config: { effort: 'low', format: { type: 'json_schema', schema: ENRICH_SCHEMA } },
        system,
        messages: [{ role: 'user', content: JSON.stringify(brief) }],
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.stop_reason === 'refusal') throw new Error('model refused');

    const textBlock = (data.content || []).find((b) => b.type === 'text');
    if (!textBlock) throw new Error('no text block');
    const parsed = JSON.parse(textBlock.text);

    const known = new Set(items.map((it) => it.id));

    // Collapse duplicates: keep the first known id in each group, drop the rest.
    const drop = new Set();
    for (const group of parsed.duplicates || []) {
      const present = group.filter((id) => known.has(id));
      for (const id of present.slice(1)) drop.add(id);
    }

    // Attach analyst reads.
    const reads = new Map();
    for (const r of parsed.reads || []) {
      if (known.has(r.id)) reads.set(r.id, r);
    }

    const out = items
      .filter((it) => !drop.has(it.id))
      .map((it) => {
        const r = reads.get(it.id);
        return r ? { ...it, read: r.note, credibility: r.credibility } : it;
      });

    console.log(`  LLM: collapsed ${drop.size} duplicate(s), ${reads.size} analyst read(s)`);
    return out;
  } catch (err) {
    console.warn(`  LLM: skipped (${err.message})`);
    return items;
  }
}

async function run() {
  const sources = [
    ['Google News', fromGoogleNews],
    ['Bluesky', fromBluesky],
    ['Mastodon', fromMastodon],
    ['Reddit', fromReddit],
  ];

  let raw = [];
  for (const [name, fn] of sources) {
    try {
      const got = await fn();
      console.log(`  ${name}: ${got.length} items`);
      raw = raw.concat(got);
    } catch (err) {
      console.warn(`  ${name}: skipped (${err.message})`);
    }
  }

  // topical filter + dedupe (by url, then by normalised title)
  const seen = new Set();
  const items = [];
  for (const it of raw) {
    if (!it.url && !it.title) continue;
    const hay = `${it.title} ${it.summary}`;
    if (!TOPICAL.test(hay)) continue;
    const key = (it.url || '').split('?')[0] || it.title.toLowerCase().replace(/\W+/g, '').slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);

    const { n, signals } = score(it);
    // Borrow military message-precedence labels for the transmission styling:
    // FLASH (drop everything) → PRIORITY → ROUTINE.
    const precedence = n >= 6 ? 'FLASH' : n >= THRESHOLD ? 'PRIORITY' : 'ROUTINE';
    items.push({
      id: idFor(it.url, it.title),
      title: it.title,
      summary: it.summary,
      url: it.url,
      date: it.date ? new Date(normDate(it.date)).toISOString() : null,
      source: it.source,
      sourceType: it.sourceType,
      notable: n >= THRESHOLD,
      precedence,
      signals,
    });
  }

  items.sort((a, b) => normDate(b.date) - normDate(a.date));
  let trimmed = items.slice(0, MAX_ITEMS);

  if (!trimmed.length) {
    console.warn('No items collected — keeping the existing file untouched.');
    return;
  }

  // Optional LLM pass: dedupe + analyst reads. Best-effort; unchanged on failure.
  trimmed = await enrich(trimmed);

  const payload = {
    updated: new Date().toISOString(),
    count: trimmed.length,
    notable: trimmed.filter((i) => i.notable).length,
    enriched: trimmed.some((i) => i.read),
    items: trimmed,
  };
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n');
  console.log(`Wrote ${trimmed.length} items (${payload.notable} notable) → ${path.relative(process.cwd(), OUT)}`);
}

run().catch((err) => {
  // Never fail the workflow over the wire — just log and leave the file be.
  console.error('Wire crawl failed:', err);
  process.exit(0);
});
