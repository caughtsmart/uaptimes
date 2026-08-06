#!/usr/bin/env node
// -----------------------------------------------------------------------------
// UAP Times — Elizondo / UAP Gerb "controlled disclosure" animation
//
// Writes public/images/elizondo-controlled-disclosure-row-animation.svg: a
// self-contained animated SVG (CSS animations only — no JS, no external fonts
// or assets, so it works served as a plain <img>) drawn in the site's "case
// file" visual language, matching build-phoenix-lights-animation.mjs.
//
// It carries both halves of the article's argument in one figure:
//   Panel A — the row's actual chronology, 28 June to 27 August 2026, with a
//             running count of records produced by either side. It stays at
//             zero as the playhead sweeps, which is the point.
//   Panel B — why the allegation can't currently be tested. Five mutually
//             exclusive observations, every one routed to the same verdict.
//
// Run by hand — `node scripts/build-elizondo-disclosure-animation.mjs` — not in
// CI. The generated SVG is committed; this file exists so the geometry and the
// animation timings stay editable rather than being frozen markup.
// -----------------------------------------------------------------------------
import fs from 'node:fs';

const n = (v, d = 1) => Number(v.toFixed(d));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const C = {
  page:   '#f7f5ee',
  frame:  '#b7ad96',
  rule:   '#d8d2c2',
  ink:    '#201e18',
  dim:    '#6a6250',
  red:    '#b12a1d',
  blue:   '#2e6cab',
  amber:  '#b07d16',
  paleR:  '#f4e4e1',
  paleB:  '#e6edf6',
};

const MONO = "'Courier New',Courier,monospace";
const W = 1120, H = 1480;
const CLOCK = 30;                              // seconds; one clock drives all

// ---------------------------------------------------------------- panel A
// Seven moves in the row, in order. `kind` is what each one actually is:
//   claim  — an assertion made on air, so far unevidenced
//   record — a thing that verifiably happened and can be re-watched
//   open   — the position as it stands
//   ahead  — a date that hasn't arrived, and settles something when it does
const EVENTS = [
  {
    mo: 6, d: 28, kind: 'claim', tag: '28 JUN',
    head: 'Coulthart, on a NewsNation Q&A',
    sub: 'Says Elizondo held a counterintelligence role inside the legacy retrieval effort.',
  },
  {
    mo: 6, d: 29, kind: 'record', tag: '29 JUN',
    head: 'Elizondo answers, the next day',
    sub: 'Denies being part of a legacy programme; says "neither confirm nor deny" is routine.',
  },
  {
    mo: 7, d: 5, kind: 'record', tag: 'EARLY JUL',
    head: '"I was surprised"',
    sub: 'Coulthart says he was misreported — and that Elizondo never directly denied it.',
  },
  {
    mo: 7, d: 24, kind: 'claim', tag: 'LATE JUL',
    head: 'Reality Check, with UAP Gerb',
    sub: 'AATIP recast as cover; an NSC role alleged. Roswell to the Podesta emails, no papers.',
  },
  {
    mo: 7, d: 29, kind: 'record', tag: '29 JUL',
    head: 'The rest-stop video',
    sub: '"1,000% not accurate." Confirms one fact: he is moving to Washington.',
  },
  {
    mo: 8, d: 6, kind: 'open', tag: '6 AUG',
    head: 'Where it actually stands',
    sub: 'No appointment announced, nothing produced. Five weeks of people answering each other.',
  },
  {
    mo: 8, d: 27, kind: 'ahead', tag: '27 AUG',
    head: 'Reckoning is published',
    sub: 'A fixed date — and the first thing here that can be checked rather than argued.',
  },
];

const KIND = {
  claim:  { c: C.red,   label: 'ASSERTED · UNVERIFIED' },
  record: { c: C.blue,  label: 'ON THE RECORD' },
  open:   { c: C.dim,   label: 'UNRESOLVED' },
  ahead:  { c: C.amber, label: 'TESTABLE, NOT YET DUE' },
};

// --- the 60-day spine ---
const T0 = 104, T1 = 1016;
const DAY0 = Date.UTC(2026, 5, 28);            // 28 June 2026
const SPAN = 60;                               // days, to 27 August
const at = (mo, d) => n(T0 + ((Date.UTC(2026, mo - 1, d) - DAY0) / 86400000 / SPAN) * (T1 - T0));

const spineY = 252;

// Panel A owns 2%–46% of the clock; events light in sequence across it.
const aStart = 2, aEnd = 46;
const cueSec = (i) => n(((aStart + (i * (aEnd - aStart)) / EVENTS.length) / 100) * CLOCK, 2);

const spineDots = EVENTS.map((e, i) => {
  const x = at(e.mo, e.d);
  const k = KIND[e.kind];
  return `<g class="anim ev" style="animation-delay:${cueSec(i)}s">
    <circle cx="${x}" cy="${spineY}" r="12" fill="none" stroke="${k.c}" stroke-width="1.2" opacity=".4"/>
    <circle cx="${x}" cy="${spineY}" r="6.5" fill="${k.c}"/>
  </g>`;
}).join('\n  ');

const spineTicks = [[6, 28, '28 JUN'], [7, 8, '8 JUL'], [7, 18, '18 JUL'], [7, 28, '28 JUL'], [8, 7, '7 AUG'], [8, 17, '17 AUG'], [8, 27, '27 AUG']]
  .map(([mo, d, lab]) => {
    const x = at(mo, d);
    return `<line x1="${x}" y1="${spineY + 14}" x2="${x}" y2="${spineY + 23}" stroke="${C.frame}" stroke-width="1.4"/>`
      + `<text x="${x}" y="${spineY + 44}" text-anchor="middle" font-family="${MONO}" font-size="15" fill="${C.dim}">${lab}</text>`;
  }).join('');

// --- the dossier rows ---
const ROW_H = 54;
const rowsTop = 322;
const rowY = (i) => rowsTop + i * ROW_H;

const dossier = EVENTS.map((e, i) => {
  const y = rowY(i);
  const k = KIND[e.kind];
  return `<g class="anim ev" style="animation-delay:${cueSec(i)}s">
    <rect x="48" y="${y}" width="1024" height="${ROW_H - 8}" fill="${i % 2 ? '#f1eee4' : 'none'}"/>
    <rect x="48" y="${y}" width="4" height="${ROW_H - 8}" fill="${k.c}"/>
    <text x="66" y="${y + 21}" font-family="${MONO}" font-size="15" letter-spacing="1.6" fill="${k.c}" font-weight="bold">${e.tag}</text>
    <text x="66" y="${y + 40}" font-family="${MONO}" font-size="12.5" letter-spacing="1.2" fill="${C.dim}">${k.label}</text>
    <text x="266" y="${y + 22}" font-size="19.5" font-weight="bold" fill="${C.ink}">${esc(e.head)}</text>
    <text x="266" y="${y + 42}" font-size="16.5" fill="${C.dim}">${esc(e.sub)}</text>
  </g>`;
}).join('\n  ');

const countY = rowY(EVENTS.length) + 12;

// ---------------------------------------------------------------- panel B
// The unfalsifiability tree. Five observations, one verdict.
const PB = 838;
const BOX = { x: 74, w: 452, h: 68 };
const ROWS = [
  { head: 'He denies it, flatly, on camera', sub: 'Which is exactly what a managed asset would do.' },
  { head: 'He takes the White House job',    sub: 'The placement worked, precisely as described.' },
  { head: 'He takes no job at all',          sub: 'The plan was adjusted once it had been exposed.' },
  { head: 'Real disclosure follows',         sub: 'The minimum they were ever going to concede.' },
  { head: 'No disclosure follows',           sub: 'The containment held. It generally does.' },
];
const bRowY = (i) => PB + 58 + i * 80;
const STAMP = { cx: 858, w: 300, h: 128 };
STAMP.cy = bRowY(2) + BOX.h / 2;

// Panel B owns 50%–98%; each branch gets an equal slice.
const bStart = 50, bEnd = 98;
const slice = (bEnd - bStart) / ROWS.length;   // 9.6% of the clock each

const ARROW_X = STAMP.cx - STAMP.w / 2 - 14;

const branches = ROWS.map((r, i) => {
  const y = bRowY(i) + BOX.h / 2;
  const x0 = BOX.x + BOX.w;
  const mid = (x0 + ARROW_X) / 2;
  return {
    i, y,
    d: `M${x0} ${y} C${n(mid)} ${y}, ${n(mid)} ${STAMP.cy}, ${ARROW_X} ${STAMP.cy}`,
    delaySec: n(((bStart + i * slice) / 100) * CLOCK, 2),
  };
});

const boxes = ROWS.map((r, i) => {
  const y = bRowY(i);
  const b = branches[i];
  return `<g class="anim br" style="animation-delay:${b.delaySec}s">
    <rect x="${BOX.x}" y="${y}" width="${BOX.w}" height="${BOX.h}" fill="${C.paleB}"/>
    <path d="${b.d}" fill="none" stroke="${C.red}" stroke-width="2" opacity=".8"/>
  </g>
  <g>
    <rect x="${BOX.x}" y="${y}" width="${BOX.w}" height="${BOX.h}" fill="none" stroke="${C.frame}" stroke-width="1.3"/>
    <rect x="${BOX.x}" y="${y}" width="4" height="${BOX.h}" fill="${C.blue}"/>
    <text x="${BOX.x + 20}" y="${y + 29}" font-size="20" font-weight="bold" fill="${C.ink}">${esc(r.head)}</text>
    <text x="${BOX.x + 20}" y="${y + 52}" font-size="16.5" fill="${C.dim}">${esc(r.sub)}</text>
  </g>`;
}).join('\n  ');

// The marker that runs each branch in turn, then the arrowhead it feeds.
const dots = branches.map((b) => {
  const travel = (slice / 100) * CLOCK * 0.8;
  return `<circle class="anim dot" style="animation-delay:${b.delaySec}s" r="5.5" fill="${C.red}">
    <animateMotion dur="${CLOCK}s" repeatCount="indefinite" calcMode="linear" keyPoints="0;0;1;1" keyTimes="0;${n(b.delaySec / CLOCK, 4)};${n((b.delaySec + travel) / CLOCK, 4)};1" path="${b.d}"/>
  </circle>`;
}).join('\n  ');

// A stamp thump for each branch that arrives.
const thumps = ROWS.map((_, i) => {
  const t = bStart + i * slice;
  return `    ${n(t + slice * 0.35, 2)}% { transform: scale(1.05); }
    ${n(t + slice * 0.72, 2)}% { transform: scale(1); }`;
}).join('\n');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Georgia, 'Times New Roman', serif" role="img" aria-labelledby="ttl dsc">
<title id="ttl">The controlled-disclosure row: five weeks of argument, and a claim built so it cannot lose</title>
<desc id="dsc">A two-panel diagram. The upper panel is a chronology of the row between Luis Elizondo and the anonymous researcher UAP Gerb, running from 28 June 2026, when the journalist Ross Coulthart said on a NewsNation question-and-answer that Elizondo had held a counterintelligence role inside the legacy crash-retrieval programme, through Elizondo's denial the next day, Coulthart's early-July clarification that he had been misreported, the late-July Reality Check interview with UAP Gerb in which an appointment to the National Security Council was alleged, Elizondo's video reply of 29 July recorded at a highway rest stop, the position as it stands on 6 August, and the publication of Elizondo's book Reckoning on 27 August. Each entry is marked as either an unverified assertion, a matter of record, unresolved, or a test still to come. A running count below records six broadcasts, videos and replies, and no named sources, dated records or documents produced by either side. The lower panel shows five mutually exclusive things that could happen next — Elizondo denies the allegation, takes a White House job, takes no job, real disclosure follows, or no disclosure follows — with an arrow curving from every one of them into a single stamped verdict reading THEORY CONFIRMED, NO EXIT.</desc>
<style>
  /* One 30-second clock drives both panels, so the chronology playhead and the
     branch that is lit can never drift out of step with each other. */
  .anim { animation-duration: ${CLOCK}s; animation-timing-function: linear; animation-iteration-count: infinite; animation-fill-mode: both; }

  .head  { animation-name: head; }
  .ev    { animation-name: reveal; }
  .cueA  { animation-name: cueA; }
  .cueB  { animation-name: cueB; }
  .br    { animation-name: branch; }
  .dot   { animation-name: dotfade; }
  .stamp { animation-name: stamp; transform-box: view-box; transform-origin: ${STAMP.cx}px ${STAMP.cy}px; }
  .zero  { animation-name: zero; }

  @keyframes head {
    0%       { transform: translateX(${T0}px); }
    ${aEnd}% { transform: translateX(${T1}px); }
    100%     { transform: translateX(${T1}px); }
  }
  /* Entries light as the playhead reaches them and stay lit, so the panel
     builds up rather than flickering past. */
  @keyframes reveal {
    0%             { opacity: .13; }
    1.2%           { opacity: 1; }
    ${aEnd}%, 100% { opacity: 1; }
  }
  @keyframes cueA { 0%, ${aEnd}% { opacity: 1; } ${bStart}%, 100% { opacity: .3; } }
  @keyframes cueB { 0%, ${aEnd}% { opacity: .3; } ${bStart}%, 100% { opacity: 1; } }

  /* Each branch holds its highlight once it has fired, so by the end of a cycle
     all five are drawn into the same verdict at once. */
  @keyframes branch {
    0%                    { opacity: 0; }
    ${n(slice * 0.5, 2)}% { opacity: 1; }
    100%                  { opacity: 1; }
  }
  @keyframes dotfade {
    0%                     { opacity: 0; }
    0.6%                   { opacity: 1; }
    ${n(slice * 0.8, 2)}%  { opacity: 1; }
    ${n(slice * 0.95, 2)}%, 100% { opacity: 0; }
  }
  @keyframes stamp {
    0%, ${bStart}% { transform: scale(1); }
${thumps}
    100% { transform: scale(1); }
  }
  @keyframes zero { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }

  /* Anyone who has asked their system for less motion gets the same diagram,
     fully drawn and held still. */
  @media (prefers-reduced-motion: reduce) {
    .anim { animation: none !important; }
    .ev, .br, .cueA, .cueB, .zero { opacity: 1; }
    .dot  { opacity: 0; }
    .head { transform: translateX(${T1}px); }
  }
</style>

<rect width="${W}" height="${H}" fill="${C.page}"/>
<rect x="6" y="6" width="${W - 12}" height="${H - 12}" fill="none" stroke="${C.frame}" stroke-width="1.5"/>
<rect x="12" y="12" width="${W - 24}" height="${H - 24}" fill="none" stroke="${C.rule}" stroke-width="1"/>

<text x="48" y="58" font-family="${MONO}" font-size="17" letter-spacing="4" fill="${C.red}" font-weight="bold">CASE FILE // THE CONTROLLED-DISCLOSURE ROW — SUMMER 2026</text>
<text x="44" y="104" font-size="42" font-weight="bold" fill="${C.ink}">Five weeks, no documents</text>
<text x="48" y="138" font-family="${MONO}" font-size="17" fill="${C.dim}">Who said what, and when — and why none of it can currently be tested.</text>
<line x1="44" y1="162" x2="1076" y2="162" stroke="${C.frame}" stroke-width="1.5"/>

<!-- ============================ panel A: the chronology ============================ -->
<g class="anim cueA">
  <text x="48" y="196" font-family="${MONO}" font-size="16" letter-spacing="2.5" fill="${C.red}" font-weight="bold">01 — THE ROW, IN ORDER</text>

  <line x1="${T0}" y1="${spineY}" x2="${T1}" y2="${spineY}" stroke="${C.frame}" stroke-width="1.5"/>
  ${spineTicks}
  ${spineDots}
  <g class="head anim">
    <line x1="0" y1="${spineY - 26}" x2="0" y2="${spineY + 12}" stroke="${C.ink}" stroke-width="1.4" opacity=".6"/>
    <polygon points="0,${spineY - 26} -6,${spineY - 36} 6,${spineY - 36}" fill="${C.ink}"/>
  </g>

  ${dossier}

  <rect x="48" y="${countY}" width="1024" height="72" fill="${C.paleR}" stroke="${C.red}" stroke-width="1.4"/>
  <text x="70" y="${countY + 28}" font-family="${MONO}" font-size="15.5" letter-spacing="2.5" fill="${C.red}" font-weight="bold">RUNNING COUNT &#183; 28 JUN TO 6 AUG 2026</text>
  <text x="70" y="${countY + 55}" font-size="19.5" fill="${C.ink}">Broadcasts, videos and replies: <tspan font-weight="bold">six</tspan>. Named sources, dated records or documents produced by either side: <tspan class="anim zero" font-weight="bold" fill="${C.red}">none</tspan>.</text>
</g>

<!-- ============================ panel B: the tree ============================ -->
<g class="anim cueB">
  <text x="48" y="${PB - 22}" font-family="${MONO}" font-size="16" letter-spacing="2.5" fill="${C.red}" font-weight="bold">02 — EVERY OUTCOME IS ALREADY ACCOUNTED FOR</text>
  <text x="${BOX.x}" y="${PB + 32}" font-family="${MONO}" font-size="15" letter-spacing="2" fill="${C.dim}">IF THIS HAPPENS NEXT&#8230;</text>
  <text x="${STAMP.cx}" y="${PB + 32}" text-anchor="middle" font-family="${MONO}" font-size="15" letter-spacing="2" fill="${C.dim}">&#8230;THE READING DOES NOT CHANGE</text>

  ${boxes}
  <polygon points="${ARROW_X + 2},${STAMP.cy} ${ARROW_X - 12},${STAMP.cy - 7} ${ARROW_X - 12},${STAMP.cy + 7}" fill="${C.red}"/>
  ${dots}

  <g class="stamp anim">
    <g transform="rotate(-4 ${STAMP.cx} ${STAMP.cy})">
      <rect x="${STAMP.cx - STAMP.w / 2}" y="${STAMP.cy - STAMP.h / 2}" width="${STAMP.w}" height="${STAMP.h}" fill="none" stroke="${C.red}" stroke-width="4" opacity=".9"/>
      <rect x="${STAMP.cx - STAMP.w / 2 + 9}" y="${STAMP.cy - STAMP.h / 2 + 9}" width="${STAMP.w - 18}" height="${STAMP.h - 18}" fill="none" stroke="${C.red}" stroke-width="1.4" opacity=".55"/>
      <text x="${STAMP.cx}" y="${STAMP.cy - 14}" text-anchor="middle" font-family="${MONO}" font-size="29" letter-spacing="3" font-weight="bold" fill="${C.red}">THEORY</text>
      <text x="${STAMP.cx}" y="${STAMP.cy + 22}" text-anchor="middle" font-family="${MONO}" font-size="29" letter-spacing="3" font-weight="bold" fill="${C.red}">CONFIRMED</text>
      <text x="${STAMP.cx}" y="${STAMP.cy + 48}" text-anchor="middle" font-family="${MONO}" font-size="14" letter-spacing="3" fill="${C.red}" opacity=".7">NO EXIT</text>
    </g>
  </g>
</g>

<line x1="44" y1="${bRowY(4) + BOX.h + 34}" x2="1076" y2="${bRowY(4) + BOX.h + 34}" stroke="${C.frame}" stroke-width="1.5"/>
<text x="48" y="${bRowY(4) + BOX.h + 72}" font-size="21" font-weight="bold" fill="${C.ink}">A claim that survives every possible observation isn&#8217;t strong. It is untestable.</text>
<text x="48" y="${bRowY(4) + BOX.h + 102}" font-size="19.5" fill="${C.dim}">That is a statement about how the argument has been built, not about whether the underlying story is true.</text>
<text x="48" y="${bRowY(4) + BOX.h + 128}" font-size="19.5" fill="${C.dim}">It may well be true. But it cannot currently be checked, and an argument that cannot be checked is not yet knowledge.</text>
<text x="1072" y="${H - 24}" text-anchor="end" font-family="${MONO}" font-size="15" letter-spacing="2" fill="${C.frame}">UAP TIMES — DIAGRAM OF AN ARGUMENT, NOT OF AN EVENT</text>
</svg>
`;

fs.writeFileSync(new URL('../public/images/elizondo-controlled-disclosure-row-animation.svg', import.meta.url), svg);
console.log('written', svg.length, 'bytes');
