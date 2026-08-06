// Stamp rel="sponsored nofollow noopener" on every outbound Amazon link in
// Markdown.
//
// Why this exists: Google requires affiliate links to be marked, and an
// unmarked one is a risk to the whole domain's ranking, not just the page it
// sits on. Markdown link syntax can't express `rel`, so an article writing
// [thing](https://amzn.to/x) ships an unmarked affiliate link no matter how
// careful the author was. Hand-written pages (src/pages/*.astro) set `rel`
// themselves; this closes the same gap for the article collection.
//
// It also warns — without failing the build — about an Amazon link carrying no
// affiliate tag, because a tagless link is indistinguishable from a working
// one and simply earns nothing.

const AFFILIATE_HOSTS = [
  /(^|\.)amazon\.[a-z]{2,3}(\.[a-z]{2})?$/i, // amazon.co.uk, amazon.com, amazon.de…
  /(^|\.)amzn\.(to|eu)$/i,                   // SiteStripe short links
  /(^|\.)a\.co$/i,                           // Amazon's other shortener
];

const REQUIRED_REL = ['sponsored', 'nofollow', 'noopener'];

const isAffiliateHost = (href) => {
  try {
    return AFFILIATE_HOSTS.some((re) => re.test(new URL(href).hostname));
  } catch {
    return false; // relative or malformed — not ours to touch
  }
};

// hast stores `rel` as an array, but be tolerant of a string.
const relList = (rel) =>
  Array.isArray(rel) ? [...rel] : typeof rel === 'string' ? rel.split(/\s+/).filter(Boolean) : [];

export default function rehypeAffiliateLinks({ tag = null } = {}) {
  return (tree, file) => {
    const untagged = [];

    const visit = (node) => {
      if (node.type === 'element' && node.tagName === 'a') {
        const href = node.properties?.href;
        if (typeof href === 'string' && isAffiliateHost(href)) {
          const rel = relList(node.properties.rel);
          for (const r of REQUIRED_REL) if (!rel.includes(r)) rel.push(r);
          node.properties.rel = rel;
          if (tag && !href.includes(`tag=${tag}`) && !/(^|\.)amzn\.(to|eu)$/i.test(new URL(href).hostname)) {
            untagged.push(href);
          }
        }
      }
      for (const child of node.children || []) visit(child);
    };

    visit(tree);

    if (untagged.length) {
      const where = file?.history?.[0] ?? file?.path ?? 'markdown';
      for (const href of untagged) {
        console.warn(`[affiliate] no tag=${tag} on ${href} — in ${where}`);
      }
    }
  };
}
