#!/usr/bin/env node
// -----------------------------------------------------------------------------
// UAP Times — Phoenix Lights animation
//
// Writes public/images/phoenix-lights-1997-animation.svg: a self-contained
// animated SVG (CSS animations only — no JS, no external fonts or assets, so it
// works served as a plain <img>) drawn in the site's "case file" visual
// language. It carries the whole argument of the article in one figure: the
// 20:15 V crossing the sky and blotting out the stars behind it, the two-hour
// gap, and the 22:00 flares hanging, sinking and being cut off one by one by
// the Sierra Estrella ridge.
//
// Run by hand — `node scripts/build-phoenix-lights-animation.mjs` — not in CI.
// The generated SVG is committed; this file exists so the geometry and the
// animation timings stay editable rather than being 29KB of frozen markup.
// -----------------------------------------------------------------------------
import fs from 'node:fs';

// Deterministic PRNG so re-running the generator gives an identical file.
let seed = 19970313;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const r = (a, b) => a + rnd() * (b - a);
const n = (v, d = 1) => Number(v.toFixed(d));

const C = {
  page:   '#f7f5ee',
  frame:  '#b7ad96',
  rule:   '#d8d2c2',
  ink:    '#201e18',
  dim:    '#6a6250',
  red:    '#b12a1d',
  blue:   '#2e6cab',
  amber:  '#e8a33d',
};

// ---------------------------------------------------------------- panel A
const A = { x: 44, y: 226, w: 1032, h: 290 };
const AB = A.y + A.h;                       // 516

// star field, kept clear of the ground silhouette
let starsA = '';
for (let i = 0; i < 70; i++) {
  const x = n(r(A.x + 6, A.x + A.w - 6));
  const y = n(r(A.y + 8, A.y + 218));
  const rad = n(r(0.7, 1.9), 2);
  const o = n(r(0.35, 0.95), 2);
  const cls = rnd() > 0.72 ? ' class="tw" style="animation-delay:' + n(r(0, 6), 1) + 's"' : '';
  starsA += `<circle cx="${x}" cy="${y}" r="${rad}" fill="#e8e6dc" opacity="${o}"${cls}/>`;
}

// desert horizon: two overlapping ridges
const hill = (baseY, amp, step, fill) => {
  let d = `M${A.x} ${AB} L${A.x} ${baseY}`;
  for (let x = A.x; x <= A.x + A.w; x += step) {
    d += ` L${n(x)} ${n(baseY + Math.sin(x / 63) * amp + r(-amp * 0.5, amp * 0.5))}`;
  }
  return `<path d="${d} L${A.x + A.w} ${AB} Z" fill="${fill}"/>`;
};
const hillsA = hill(AB - 42, 7, 34, '#080b11') + hill(AB - 26, 5, 28, '#04060a');

// saguaro cactus silhouette
const saguaro = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#04060a">`
  + `<rect x="-4" y="-46" width="8" height="46" rx="4"/>`
  + `<path d="M-4 -30 H-13 a5 5 0 0 0 -5 5 V-14 h5 V-24 a2 2 0 0 1 2 -2 H-4 Z"/>`
  + `<path d="M4 -36 H12 a5 5 0 0 1 5 5 V-18 h-5 V-30 a2 2 0 0 0 -2 -2 H4 Z"/></g>`;

// a person, seen from behind, head tipped back
const watcher = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#04060a">`
  + `<circle cx="0" cy="-15" r="3.4"/>`
  + `<path d="M-4 -11 q4 -2 8 0 l2 11 h-12 Z"/></g>`;

const groundA = hillsA
  + saguaro(196, AB - 24, 1.15) + saguaro(232, AB - 20, 0.75) + saguaro(878, AB - 22, 1)
  + watcher(430, AB - 18, 1.25) + watcher(452, AB - 16, 1.05) + watcher(700, AB - 20, 1.15);

// the V: a chevron band thick enough to blot out the stars behind it
const vFront = '-286,-54 0,12 286,-54';
const vPoly  = '-286,-54 0,12 286,-54 286,-84 0,-22 -286,-84';
const vLights = [-286, -190, -95, 0, 95, 190, 286].map((t) => {
  // interpolate along the front edge of the chevron
  const y = t <= 0 ? -54 + ((t + 286) / 286) * 66 : 12 - (t / 286) * 66;
  return { x: t, y: n(y) };
});

// ---------------------------------------------------------------- panel B
const B = { x: 44, y: 652, w: 1032, h: 290 };
const BB = B.y + B.h;                       // 942

let starsB = '';
for (let i = 0; i < 46; i++) {
  const x = n(r(B.x + 6, B.x + B.w - 6));
  const y = n(r(B.y + 8, B.y + 130));
  starsB += `<circle cx="${x}" cy="${y}" r="${n(r(0.7, 1.7), 2)}" fill="#e8e6dc" opacity="${n(r(0.25, 0.8), 2)}"/>`;
}

// Sierra Estrella ridge — crest falls away to the right, so the flares are
// occulted left to right as they sink. That is the whole point of the panel.
const ridgeTop = (x) => {
  const t = (x - B.x) / B.w;
  return B.y + 138 + t * 74 + Math.sin(x / 47) * 9 + Math.sin(x / 113) * 13;
};
let ridge = `M${B.x} ${BB} L${B.x} ${n(ridgeTop(B.x))}`;
for (let x = B.x; x <= B.x + B.w; x += 18) ridge += ` L${n(x)} ${n(ridgeTop(x) + r(-4, 4))}`;
ridge += ` L${B.x + B.w} ${BB} Z`;

// nearer ridge, darker, to give the range some depth
let ridge2 = `M${B.x} ${BB} L${B.x} ${n(ridgeTop(B.x) + 44)}`;
for (let x = B.x; x <= B.x + B.w; x += 22) ridge2 += ` L${n(x)} ${n(ridgeTop(x) + 48 + r(-5, 5))}`;
ridge2 += ` L${B.x + B.w} ${BB} Z`;

// city rooftops along the bottom of the frame
let city = '';
let cx = B.x;
while (cx < B.x + B.w) {
  const w = n(r(16, 46)), h = n(r(8, 26));
  city += `<rect x="${n(cx)}" y="${n(BB - h)}" width="${w}" height="${h}" fill="#03050a"/>`;
  if (rnd() > 0.45) city += `<rect x="${n(cx + 4)}" y="${n(BB - h + 4)}" width="3" height="3" fill="#e8a33d" opacity="${n(r(0.4, 0.9), 2)}"/>`;
  cx += w + r(2, 10);
}

// the flare row: seven lights, near enough level, dropped as one salvo
const flares = [];
for (let i = 0; i < 7; i++) {
  flares.push({ x: n(240 + i * 108 + r(-8, 8)), y: n(B.y + 96 + r(-9, 9)), d: n(i * 0.34, 2) });
}

// ---------------------------------------------------------------- timeline
// 19:45 -> 22:45 mapped across x 100..1020
const T0 = 100, T1 = 1020, MINS = 180, PX = (T1 - T0) / MINS;
const at = (h, m) => n(T0 + ((h - 19) * 60 + m - 45) * PX);
const tlY = 1078;

const ticks = [[20, 0], [20, 30], [21, 0], [21, 30], [22, 0], [22, 30]]
  .map(([h, m]) => {
    const x = at(h, m);
    return `<line x1="${x}" y1="${tlY}" x2="${x}" y2="${tlY + 8}" stroke="${C.frame}" stroke-width="1.5"/>`
      + `<text x="${x}" y="${tlY + 28}" text-anchor="middle" font-family="'Courier New',Courier,monospace" font-size="17" fill="${C.dim}">${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}</text>`;
  }).join('');

const e1a = at(20, 15), e1b = at(20, 45);
const e2a = at(22, 0),  e2b = at(22, 30);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1120 1200" width="1120" height="1200" font-family="Georgia, 'Times New Roman', serif" role="img" aria-labelledby="ttl dsc">
<title id="ttl">The Phoenix Lights: two events on one clock</title>
<desc id="dsc">An animated diagram of the night of 13 March 1997. In the upper panel a vast silent V of lights drifts across a desert sky, blotting out the stars behind it as it passes over watching figures on the ground — the event reported from Paulden at about 20:16 and from Tucson by about 20:45. In the lower panel, roughly two hours later, a row of seven bright amber flares ignites in sequence over Phoenix, hangs under parachutes, then sinks and is hidden one by one behind the Sierra Estrella mountain ridge. A clock along the bottom shows the two events separated by a gap of about two hours.</desc>
<defs>
  <linearGradient id="skyA" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#0b0e16"/><stop offset="1" stop-color="#191f2c"/>
  </linearGradient>
  <linearGradient id="skyB" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#0b0e16"/><stop offset="0.62" stop-color="#1a1c26"/><stop offset="1" stop-color="#3a2a1c"/>
  </linearGradient>
  <radialGradient id="glowW"><stop offset="0" stop-color="#fff3d2" stop-opacity=".85"/><stop offset="1" stop-color="#fff3d2" stop-opacity="0"/></radialGradient>
  <radialGradient id="glowA"><stop offset="0" stop-color="#ffcb6b" stop-opacity=".9"/><stop offset=".45" stop-color="#e8a33d" stop-opacity=".35"/><stop offset="1" stop-color="#e8a33d" stop-opacity="0"/></radialGradient>
  <clipPath id="clipA"><rect x="${A.x}" y="${A.y}" width="${A.w}" height="${A.h}"/></clipPath>
  <clipPath id="clipB"><rect x="${B.x}" y="${B.y}" width="${B.w}" height="${B.h}"/></clipPath>
</defs>
<style>
  /* One 24-second clock drives everything, so the panels, the flares and the
     playhead can never drift out of step with each other. */
  .anim { animation-duration: 24s; animation-timing-function: linear; animation-iteration-count: infinite; animation-fill-mode: both; }

  .vpass  { animation-name: vpass; }
  .dimA   { animation-name: dimA; }
  .dimB   { animation-name: dimB; }
  .row    { animation-name: sink; }
  .fl     { animation-name: burn; }
  .head   { animation-name: head; }
  .tw     { animation: tw 5s ease-in-out infinite alternate; }
  .cueA   { animation-name: cueA; }
  .cueB   { animation-name: cueB; }

  @keyframes vpass {
    0%   { transform: translateX(-460px); opacity: 0; }
    2.5% { opacity: 1; }
    42%  { opacity: 1; }
    46%  { transform: translateX(1180px); opacity: 0; }
    100% { transform: translateX(1180px); opacity: 0; }
  }
  @keyframes dimA { 0%, 46% { opacity: 0; } 50%, 100% { opacity: .68; } }
  @keyframes dimB { 0%, 48% { opacity: .68; } 52%, 96% { opacity: 0; } 100% { opacity: .68; } }

  /* the salvo drifts down together; the ridge does the winking-out */
  @keyframes sink {
    0%, 66%  { transform: translate(0, 0); }
    95%      { transform: translate(24px, 158px); }
    100%     { transform: translate(24px, 158px); }
  }
  @keyframes burn {
    0%, 51%  { opacity: 0; }
    54%      { opacity: 1; }
    93%      { opacity: 1; }
    97%, 100%{ opacity: 0; }
  }
  @keyframes head {
    0%   { transform: translateX(${T0}px); }
    2.5% { transform: translateX(${e1a}px); }
    46%  { transform: translateX(${e1b}px); }
    52%  { transform: translateX(${e2a}px); }
    96%  { transform: translateX(${e2b}px); }
    100% { transform: translateX(${T1}px); }
  }
  @keyframes cueA { 0%, 46% { opacity: 1; } 50%, 100% { opacity: .3; } }
  @keyframes cueB { 0%, 48% { opacity: .3; } 52%, 96% { opacity: 1; } 100% { opacity: .3; } }
  @keyframes tw { from { opacity: .25; } to { opacity: 1; } }

  /* Anyone who has asked their system for less motion gets the same diagram,
     held still at the moment each event is at its most legible. */
  @media (prefers-reduced-motion: reduce) {
    .anim, .tw { animation: none !important; }
    .vpass { transform: translateX(360px); opacity: 1; }
    .fl    { opacity: 1; }
    .row   { transform: translate(10px, 62px); }
    .dimA, .dimB { opacity: 0; }
    .head  { transform: translateX(${e1b}px); }
    .cueA, .cueB { opacity: 1; }
  }
</style>

<rect width="1120" height="1200" fill="${C.page}"/>
<rect x="6" y="6" width="1108" height="1188" fill="none" stroke="${C.frame}" stroke-width="1.5"/>
<rect x="12" y="12" width="1096" height="1176" fill="none" stroke="${C.rule}" stroke-width="1"/>

<text x="48" y="58" font-family="'Courier New',Courier,monospace" font-size="17" letter-spacing="4" fill="${C.red}" font-weight="bold">CASE FILE // PHOENIX, ARIZONA — 13 MARCH 1997</text>
<text x="44" y="104" font-size="42" font-weight="bold" fill="${C.ink}">One night, two events</text>
<text x="48" y="138" font-family="'Courier New',Courier,monospace" font-size="17" fill="${C.dim}">Two hours apart, two different things in the sky. Only one of them is solved.</text>
<line x1="44" y1="162" x2="1076" y2="162" stroke="${C.frame}" stroke-width="1.5"/>

<!-- ============================ panel A: the 20:15 V ============================ -->
<g class="anim cueA">
  <text x="48" y="206" font-family="'Courier New',Courier,monospace" font-size="16" letter-spacing="2.5" fill="${C.red}" font-weight="bold">01 — c.20:15–20:45 &#183; THE V THAT CROSSED THE STATE</text>
</g>
<rect x="${A.x}" y="${A.y}" width="${A.w}" height="${A.h}" fill="url(#skyA)"/>
<g clip-path="url(#clipA)">
  ${starsA}
  <g transform="translate(0 ${A.y + 118})">
    <g class="anim vpass">
      <ellipse cx="0" cy="-36" rx="330" ry="58" fill="url(#glowW)" opacity=".07"/>
      <polygon points="${vPoly}" fill="#080b11"/>
      <polyline points="${vFront}" fill="none" stroke="#39435c" stroke-width="1.4" opacity=".85"/>
      <polyline points="-286,-84 0,-22 286,-84" fill="none" stroke="#2a3348" stroke-width="1.2" opacity=".7"/>
      ${vLights.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="17" fill="url(#glowW)"/>`).join('')}
      ${vLights.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="4.2" fill="#fff6de"/>`).join('')}
    </g>
  </g>
  ${groundA}
</g>
<text x="${A.x + 18}" y="${A.y + 32}" font-family="'Courier New',Courier,monospace" font-size="17" letter-spacing="2" fill="#8e97a8">LOOKING UP FROM THE VALLEY &#183; NO SOUND REPORTED</text>
<rect class="anim dimA" x="${A.x}" y="${A.y}" width="${A.w}" height="${A.h}" fill="${C.page}"/>
<rect x="${A.x}" y="${A.y}" width="${A.w}" height="${A.h}" fill="none" stroke="${C.frame}" stroke-width="1.5"/>
<text x="48" y="${AB + 34}" font-size="21" font-weight="bold" fill="${C.ink}">Silent, structured, and seen from the Nevada line to Tucson.</text>
<text x="48" y="${AB + 60}" font-size="19.5" fill="${C.dim}">Witnesses reported one shape occulting the stars — not separate aircraft. Roughly 200 miles in about half an hour.</text>
<line x1="44" y1="${AB + 82}" x2="1076" y2="${AB + 82}" stroke="${C.rule}" stroke-width="1"/>

<!-- ============================ panel B: the 22:00 flares ============================ -->
<g class="anim cueB">
  <text x="48" y="636" font-family="'Courier New',Courier,monospace" font-size="16" letter-spacing="2.5" fill="${C.red}" font-weight="bold">02 — c.22:00–22:30 &#183; THE LIGHTS THAT HUNG OVER THE CITY</text>
</g>
<rect x="${B.x}" y="${B.y}" width="${B.w}" height="${B.h}" fill="url(#skyB)"/>
<g clip-path="url(#clipB)">
  ${starsB}
  <g class="anim row">
    ${flares.map((f) => `<g class="anim fl" style="animation-delay:${f.d}s"><path d="M${f.x - 13} ${f.y - 15} a13 13 0 0 1 26 0" fill="none" stroke="#c9bda6" stroke-width="1.6" opacity=".38"/><line x1="${f.x - 11}" y1="${f.y - 15}" x2="${f.x}" y2="${f.y - 3}" stroke="#c9bda6" stroke-width="1" opacity=".28"/><line x1="${f.x + 11}" y1="${f.y - 15}" x2="${f.x}" y2="${f.y - 3}" stroke="#c9bda6" stroke-width="1" opacity=".28"/><circle cx="${f.x}" cy="${f.y}" r="34" fill="url(#glowA)"/><circle cx="${f.x}" cy="${f.y}" r="6.5" fill="#fff1c9"/></g>`).join('')}
  </g>
  <path d="${ridge}" fill="#0a0c12"/>
  <path d="${ridge2}" fill="#05070b"/>
  ${city}
</g>
<text x="${B.x + 18}" y="${B.y + 32}" font-family="'Courier New',Courier,monospace" font-size="17" letter-spacing="2" fill="#8e97a8">LOOKING SOUTH-WEST FROM PHOENIX &#183; THE SIERRA ESTRELLA ON THE HORIZON</text>
<rect class="anim dimB" x="${B.x}" y="${B.y}" width="${B.w}" height="${B.h}" fill="${C.page}"/>
<rect x="${B.x}" y="${B.y}" width="${B.w}" height="${B.h}" fill="none" stroke="${C.frame}" stroke-width="1.5"/>
<text x="48" y="${BB + 34}" font-size="21" font-weight="bold" fill="${C.ink}">A row of lights that hangs, sinks, and goes out one by one.</text>
<text x="48" y="${BB + 60}" font-size="19.5" fill="${C.dim}">Illumination flares on parachutes over the Barry Goldwater Range, setting behind the Sierra Estrella ridge as seen from Phoenix.</text>
<line x1="44" y1="${BB + 82}" x2="1076" y2="${BB + 82}" stroke="${C.frame}" stroke-width="1.5"/>

<!-- ============================ the clock ============================ -->
<line x1="${T0}" y1="${tlY}" x2="${T1}" y2="${tlY}" stroke="${C.frame}" stroke-width="1.5"/>
${ticks}
<rect x="${e1a}" y="${tlY - 16}" width="${n(e1b - e1a)}" height="10" fill="${C.blue}"/>
<rect x="${e2a}" y="${tlY - 16}" width="${n(e2b - e2a)}" height="10" fill="${C.red}"/>
<text x="${e1a}" y="${tlY - 26}" font-family="'Courier New',Courier,monospace" font-size="17" letter-spacing="1.5" fill="${C.blue}" font-weight="bold">EVENT ONE</text>
<text x="${e2a}" y="${tlY - 26}" font-family="'Courier New',Courier,monospace" font-size="17" letter-spacing="1.5" fill="${C.red}" font-weight="bold">EVENT TWO</text>
<line x1="${n(e1b + 8)}" y1="${tlY - 11}" x2="${n(e2a - 8)}" y2="${tlY - 11}" stroke="${C.frame}" stroke-width="1.5" stroke-dasharray="5 6"/>
<text x="${n((e1b + e2a) / 2)}" y="${tlY - 26}" text-anchor="middle" font-family="'Courier New',Courier,monospace" font-size="17" fill="${C.dim}">two hours apart</text>
<g class="anim head">
  <line x1="0" y1="${tlY - 30}" x2="0" y2="${tlY + 10}" stroke="${C.ink}" stroke-width="1.5"/>
  <polygon points="0,${tlY + 10} -6,${tlY + 20} 6,${tlY + 20}" fill="${C.ink}"/>
</g>
<text x="48" y="${tlY + 62}" font-size="19.5" fill="${C.dim}">Almost every argument about the Phoenix Lights collapses these two into one object. They are not one object.</text>
<text x="1072" y="1176" text-anchor="end" font-family="'Courier New',Courier,monospace" font-size="15" letter-spacing="2" fill="${C.frame}">UAP TIMES — RECONSTRUCTION, NOT FOOTAGE</text>
</svg>
`;

fs.writeFileSync(new URL('../public/images/phoenix-lights-1997-animation.svg', import.meta.url), svg);
console.log('written', svg.length, 'bytes');
