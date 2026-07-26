import { getCollection } from 'astro:content';
import craft from '../data/craft-types.json';
import sightings from '../data/sightings.json';

// Build-time search index — a single JSON file the client fetches on first
// search. Covers articles (incl. body text), craft types, sightings and the
// key standalone pages, so one box searches the whole site.
export async function GET() {
  const items = [];

  const articles = (await getCollection('articles', ({ data }) => !data.draft))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  for (const a of articles) {
    const body = (a.body || '')
      .replace(/```[\s\S]*?```/g, ' ')       // drop code blocks
      .replace(/[#>*`_~\[\]()!-]/g, ' ')      // strip markdown punctuation
      .replace(/https?:\/\/\S+/g, ' ')        // drop bare URLs
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1400);
    items.push({
      type: 'Article',
      title: a.data.title,
      desc: a.data.description,
      url: `/articles/${a.id}/`,
      meta: a.data.topic,
      tags: a.data.tags || [],
      body,
    });
  }

  for (const c of craft) {
    items.push({
      type: 'Craft type',
      title: c.name,
      desc: c.desc,
      url: `/field-guide#type-${c.id}`,
      meta: c.code,
      tags: [c.aka, ...(c.traits || [])].filter(Boolean),
    });
  }

  for (const s of sightings) {
    items.push({
      type: 'Sighting',
      title: s.name,
      desc: s.blurb,
      url: `/map#case-${s.id}`,
      meta: `${s.place} · ${s.date}`,
      tags: [s.place, s.date],
    });
  }

  items.push(
    { type: 'Page', title: 'Sightings Map', desc: 'An interactive map of notable UAP sightings.', url: '/map', tags: ['map', 'sightings'] },
    { type: 'Page', title: 'Field Guide', desc: 'The common UAP craft shapes, drawn as schematics.', url: '/field-guide', tags: ['shapes', 'craft', 'types'] },
    { type: 'Page', title: 'About UAP Times', desc: 'What UAP Times is, and the editorial standard we hold ourselves to.', url: '/about', tags: ['about', 'editorial'] },
  );

  return new Response(JSON.stringify(items), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
