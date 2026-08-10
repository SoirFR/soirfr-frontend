/**
 * SoirFR page generator.
 *
 * Produces one static page per place, each of which IS index.html with the
 * search preset applied and the results list pre-rendered into the drawer so
 * search engines can read it. The live app takes over on load.
 *
 * Output: dist/
 * Run:    node build.js
 */

const fs = require('fs');
const path = require('path');

const SB_URL = 'https://ebinsidruxvbzukobshf.supabase.co';
const SB_KEY = 'sb_publishable_QSnlPXEopb6x8m8N3K396Q_YPazJ0IM';
const SITE = 'https://www.soirfr.com';
const SRC = __dirname;
const OUT = path.join(SRC, 'dist');
const WINDOW_DAYS = 60;
const SLICE_DAYS = 10;    // keeps every request well under the row cap
const ROW_CAP = 1000;     // Supabase's silent per-response limit
const MAX_RENDERED = 150; // page weight; the map still carries everything

// Static assets copied through untouched.
const ASSETS = ['favicon.ico', 'favicon.png', 'favicon.svg', 'apple-touch-icon.png',
                'preview.jpg', 'soirfr-village.jpg', 'robots.txt', 'submit.html', 'admin.html'];

/* ── the pages ──────────────────────────────────────────────────────────── */

const PAGES = [
  { slug: 'chalon-sur-saone', lat: 46.7806, lng: 4.8536, km: 15,
    label: 'Chalon-sur-Saône', where: 'à Chalon-sur-Saône',
    h1: 'Que faire à Chalon-sur-Saône', h1sub: 'et autour',
    title: 'Que faire à Chalon-sur-Saône et autour ce week-end ?' },

  { slug: 'beaune', lat: 47.0251, lng: 4.8398, km: 20,
    label: 'Beaune', where: 'à Beaune',
    h1: 'Que faire à Beaune', h1sub: 'et sur la Côte de Beaune',
    title: 'Que faire à Beaune et sur la Côte de Beaune ce week-end ?',
    en: { label: 'Beaune', where: 'in Beaune', h1: "What's on in Beaune", h1sub: 'and the Côte de Beaune',
          title: "What's on in Beaune and the Côte de Beaune this weekend?" } },

  { slug: 'le-creusot', lat: 46.8030, lng: 4.4160, km: 20,
    label: 'Le Creusot', where: 'au Creusot',
    h1: 'Que faire au Creusot', h1sub: 'et autour',
    title: 'Que faire au Creusot et autour ce week-end ?' },

  { slug: 'tournus', lat: 46.5660, lng: 4.9100, km: 10,
    label: 'Tournus', where: 'à Tournus',
    h1: 'Que faire à Tournus', h1sub: 'et autour',
    title: 'Que faire à Tournus et autour ce week-end ?',
    en: { label: 'Tournus', where: 'in Tournus', h1: "What's on in Tournus", h1sub: 'and around',
          title: "What's on in Tournus and around this weekend?" } },

  { slug: 'cluny', lat: 46.4340, lng: 4.6590, km: 15,
    label: 'Cluny', where: 'à Cluny',
    h1: 'Que faire à Cluny', h1sub: 'et autour',
    title: 'Que faire à Cluny et autour ce week-end ?',
    en: { label: 'Cluny', where: 'in Cluny', h1: "What's on in Cluny", h1sub: 'and around',
          title: "What's on in Cluny and around this weekend?" } },

  { slug: 'cote-chalonnaise', lat: 46.8330, lng: 4.7170, km: 15,
    label: 'Côte Chalonnaise', where: 'en Côte Chalonnaise',
    h1: 'Que faire en Côte Chalonnaise', h1sub: 'Givry, Mercurey, Rully, Buxy',
    title: 'Que faire en Côte Chalonnaise ce week-end ?',
    en: { label: 'Côte Chalonnaise', where: 'in the Côte Chalonnaise', h1: "What's on in the Côte Chalonnaise",
          h1sub: 'Givry, Mercurey, Rully, Buxy',
          title: "What's on in the Côte Chalonnaise this weekend?" } },

  { slug: 'saone-et-loire', lat: 46.6500, lng: 4.6000, km: 70, dept: '71',
    label: 'Saône-et-Loire', where: 'en Saône-et-Loire',
    h1: 'Que faire en Saône-et-Loire', h1sub: 'manifestations et sorties',
    title: 'Que faire en Saône-et-Loire ce week-end ?' },

  { slug: 'cote-d-or', lat: 47.3000, lng: 4.7500, km: 70, dept: '21',
    label: "Côte-d'Or", where: "en Côte-d'Or",
    h1: "Que faire en Côte-d'Or", h1sub: 'manifestations et sorties',
    title: "Que faire en Côte-d'Or ce week-end ?",
    en: { label: "Côte d'Or", where: "in the Côte d'Or", h1: "What's on in the Côte d'Or",
          h1sub: 'Burgundy wine country',
          title: "What's on in the Côte d'Or, Burgundy, this weekend?" } }
];

/* ── helpers ────────────────────────────────────────────────────────────── */

const MONTHS = {
  fr: ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December']
};
const MON_ABBR = {
  fr: ['jan','fév','mar','avr','mai','juin','juil','aoû','sep','oct','nov','déc'],
  en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
};

const CAT_LABEL = {
  fr: { musique:'Musique', cinema:'Cinéma', theatre:'Spectacles', expo:'Expos',
        gastronomie:'Gastronomie', degustation:'Dégustations', brocante:'Brocantes',
        marche:'Marchés', enfants:'Enfants', sport:'Sport', nature:'Nature',
        'portes-ouvertes':'Portes ouvertes', fete:'Fêtes', patrimoine:'Patrimoine',
        ateliers:'Ateliers', autre:'Autre' },
  en: { musique:'Music', cinema:'Cinema', theatre:'Theatre', expo:'Exhibitions',
        gastronomie:'Food', degustation:'Tastings', brocante:'Flea markets',
        marche:'Markets', enfants:'Kids', sport:'Sport', nature:'Outdoors',
        'portes-ouvertes':'Open days', fete:'Village fêtes', patrimoine:'Heritage',
        ateliers:'Workshops', autre:'Other' }
};

// Event titles stay in French on purpose: a visitor needs the real name to ask
// for the place. Only the page's own words are translated.
const UI = {
  fr: { free:'Gratuit', fallbackCat:'Sortie',
        dates: (n, last) => `${n} dates, jusqu'au ${last}`,
        desc: (n, label, km) => `${n} sorties et manifestations à ${label} et dans un rayon de ${km} km : brocantes, marchés, concerts, expositions, fêtes de village. Sur une carte, mis à jour chaque matin.`,
        // A real sentence, not a pile of keywords. It carries the words people
        // actually type (aujourd'hui, ce soir, demain, the year) and is useful.
        footer: (n, label, km, year) => `Que faire à ${label} aujourd’hui, ce soir, demain ou ce week-end : ${n} sorties et manifestations dans un rayon de ${km} km, mises à jour chaque matin. Brocantes, vide-greniers, marchés, concerts, expositions, fêtes de village et visites de patrimoine en ${year}. Pour une date précise, utilisez le filtre « Quand ? ».` },
  en: { free:'Free', fallbackCat:'Event',
        dates: (n, last) => `${n} dates, until ${last}`,
        desc: (n, label, km) => `${n} things to do in and around ${label}, within ${km} km: markets, flea markets, concerts, exhibitions, village fêtes and heritage visits. On one map, updated every morning.`,
        footer: (n, label, km, year) => `What’s on in ${label} today, tonight, tomorrow and this weekend: ${n} things to do within ${km} km, updated every morning. Markets, flea markets, concerts, exhibitions, village fêtes and heritage visits in ${year}. Ideal for a day out or a weekend. For a specific date, use the “When?” filter.` }
};

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const iso = d => d.toISOString().slice(0, 10);

function longDate(s, lang) {
  const d = new Date(s);
  return lang === 'en'
    ? `${MONTHS.en[d.getUTCMonth()]} ${d.getUTCDate()}`
    : `${d.getUTCDate()} ${MONTHS.fr[d.getUTCMonth()]}`;
}

/**
 * A scraper that fails silently is invisible. Everything throws loudly.
 * SOIRFR_FIXTURE lets the generator run offline against captured data, which
 * is how it gets tested somewhere without egress to Supabase.
 */
async function fetchEvents(page, from, to) {
  if (process.env.SOIRFR_FIXTURE) {
    const fx = JSON.parse(fs.readFileSync(process.env.SOIRFR_FIXTURE, 'utf8'));
    if (!fx[page.slug]) throw new Error(`fixture has no data for /${page.slug}`);
    return fx[page.slug];
  }
  // Supabase caps a single response at 1000 rows and says nothing about it.
  // A department query blows past that, so walk the window in slices and merge.
  const byId = new Map();
  const start = new Date(from), end = new Date(to);
  for (let t = start.getTime(); t < end.getTime(); t += SLICE_DAYS * 86400000) {
    const a = iso(new Date(t));
    const b = iso(new Date(Math.min(t + SLICE_DAYS * 86400000, end.getTime())));
    const res = await fetch(`${SB_URL}/rest/v1/rpc/events_near_point`, {
      method: 'POST',
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`,
                 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: page.lat, lng: page.lng, radius_km: page.km,
                             cat: null, date_from: a, date_to: b, max_results: 5000 })
    });
    if (!res.ok) {
      throw new Error(`Supabase ${res.status} for /${page.slug} ${a}..${b}: ${await res.text()}`);
    }
    const rows = await res.json();
    if (!Array.isArray(rows)) throw new Error(`Unexpected payload for /${page.slug} ${a}..${b}`);
    // Still capped inside one slice? Say so rather than ship a short page.
    if (rows.length >= ROW_CAP) {
      throw new Error(`/${page.slug} hit the ${ROW_CAP}-row cap in ${a}..${b}. Reduce SLICE_DAYS.`);
    }
    for (const r of rows) byId.set(r.id, r);
  }
  const all = [...byId.values()];
  return page.dept
    ? all.filter(r => String(r.postcode || '').startsWith(page.dept))
    : all;
}

/**
 * Collapse repeats. A weekly market or a château open every day arrives as
 * dozens of rows; on a page they read as spam. One entry, one date range.
 */
function collapse(rows) {
  const groups = new Map();
  for (const r of rows) {
    const key = `${(r.title || '').toLowerCase().trim()}|${(r.city || '').toLowerCase().trim()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const out = [];
  for (const list of groups.values()) {
    list.sort((a, b) => String(a.starts_at).localeCompare(String(b.starts_at)));
    const first = list[0];
    out.push({ ...first, _repeats: list.length, _last: list[list.length - 1].starts_at });
  }
  out.sort((a, b) => {
    const c = String(a.starts_at).localeCompare(String(b.starts_at));
    return c !== 0 ? c : (parseFloat(a.distance_km) || 0) - (parseFloat(b.distance_km) || 0);
  });
  return out;
}

/**
 * Sections, so the page answers the question it was found for. Someone
 * arriving from "que faire ce week-end" should not have to read a
 * two-month chronological list to find Saturday.
 */
const SECTIONS = {
  fr: ['Aujourd’hui', 'Cette semaine', 'Ce week-end', 'Plus tard'],
  en: ['Today', 'This week', 'This weekend', 'Later']
};

function sectionBounds(now) {
  const day = now.getUTCDay();                 // 0 Sun … 6 Sat
  const today = iso(now);
  // The coming Saturday and Sunday. On Sat or Sun, that is this one.
  const toSat = day === 0 ? -1 : 6 - day;
  const sat = new Date(now.getTime() + toSat * 86400000);
  const sun = new Date(sat.getTime() + 86400000);
  return { today, sat: iso(sat), sun: iso(sun) };
}

function sectionOf(ev, b) {
  const d = String(ev.starts_at).slice(0, 10);
  if (d <= b.today) return 0;
  if (d === b.sat || d === b.sun) return 2;
  if (d < b.sat) return 1;
  return 3;
}

function sectionHeader(label, n, lang) {
  return `<div class="dl-item" style="display:block;padding:14px 16px 8px;background:var(--cream);border-top:1px solid var(--border);cursor:default">
<h2 style="margin:0;font-family:var(--fc);font-weight:700;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink)">${esc(label)} <span style="color:var(--dust);font-weight:400">${n}</span></h2>
</div>`;
}

/** Rows matching the drawer markup the app itself renders. */
function renderRows(evs, lang) {
  const ui = UI[lang];
  return evs.map(ev => {
    const d = new Date(ev.starts_at);
    const cc = `var(--cat-${ev.category || 'default'}, var(--cat-default))`;
    const free = ev.is_free || ev.price_min === 0;
    const bits = [];
    if (ev._repeats > 1) bits.push(ui.dates(ev._repeats, longDate(ev._last, lang)));
    if (ev.city) bits.push(esc(ev.city));
    if (ev.distance_km != null) bits.push(`${ev.distance_km} km`);
    const thumb = ev.image_url
      ? `<img src="${esc(ev.image_url)}" alt="" loading="lazy">`
      : `<div class="dl-thumb-ph" style="color:${cc}">•</div>`;
    return `<div class="dl-item">
<div class="dl-date-block"><div class="dl-day">${d.getUTCDate()}</div><div class="dl-mon">${MON_ABBR[lang][d.getUTCMonth()]}</div></div>
<div class="dl-thumb">${thumb}</div>
<div class="dl-body">
<div class="dl-cat" style="color:${cc}">${esc(CAT_LABEL[lang][ev.category] || ui.fallbackCat)}</div>
<div class="dl-title">${esc(ev.title)}</div>
<div class="dl-meta">${bits.join(' · ')}</div>
</div>
${free ? `<div class="dl-free"><span class="dl-free-tag">${ui.free}</span></div>` : ''}
</div>`;
  }).join('\n');
}

/** schema.org Event list, which is what earns the date-and-place rich result. */
function jsonLd(page, evs) {
  const items = evs.slice(0, 60).map((ev, i) => ({
    '@type': 'ListItem', position: i + 1,
    item: {
      '@type': 'Event', name: ev.title,
      startDate: ev.starts_at, endDate: ev.ends_at || undefined,
      eventStatus: 'https://schema.org/EventScheduled',
      location: { '@type': 'Place', name: ev.city || page.label,
                  address: { '@type': 'PostalAddress',
                             addressLocality: ev.city || page.label,
                             postalCode: ev.postcode || undefined,
                             addressCountry: 'FR' } },
      image: ev.image_url || undefined,
      url: ev.source_url || `${SITE}/${page.slug}`,
      offers: (ev.is_free || ev.price_min === 0)
        ? { '@type': 'Offer', price: '0', priceCurrency: 'EUR' } : undefined
    }
  }));
  return JSON.stringify({ '@context': 'https://schema.org', '@type': 'ItemList',
                          name: page.title, numberOfItems: items.length,
                          itemListElement: items });
}

/** Refuse to guess. If an anchor moved, fail rather than ship a broken page. */
function replaceOnce(html, needle, replacement, what) {
  const i = html.indexOf(needle);
  if (i === -1) throw new Error(`build.js: could not find ${what} in index.html. Anchor: ${needle.slice(0, 60)}`);
  if (html.indexOf(needle, i + 1) !== -1) throw new Error(`build.js: ${what} appears more than once`);
  return html.slice(0, i) + replacement + html.slice(i + needle.length);
}

function buildPage(tpl, page, evs, lang) {
  const cfg = lang === 'en' ? page.en : page;
  const url = lang === 'en' ? `${SITE}/en/${page.slug}` : `${SITE}/${page.slug}`;
  const desc = UI[lang].desc(evs.length, cfg.label, page.km);
  let h = tpl;

  if (lang === 'en') h = replaceOnce(h, '<html lang="fr">', '<html lang="en">', 'the html lang attribute');

  // hreflang, so Google knows the two versions are the same page in two languages
  if (page.en) {
    h = replaceOnce(h, '<link rel="canonical"',
      `<link rel="alternate" hreflang="fr" href="${SITE}/${page.slug}">\n` +
      `<link rel="alternate" hreflang="en" href="${SITE}/en/${page.slug}">\n` +
      `<link rel="alternate" hreflang="x-default" href="${SITE}/${page.slug}">\n` +
      `<link rel="canonical"`, 'the canonical link (for hreflang)');
  }

  h = replaceOnce(h,
    '<title>SoirFR — Agenda Local. Culture & Événements.</title>',
    `<title>${esc(cfg.title)} | SoirFR</title>`, 'the title tag');

  h = replaceOnce(h, '<link rel="canonical" href="https://www.soirfr.com/">',
    `<link rel="canonical" href="${url}">`, 'the canonical link');

  h = replaceOnce(h, '<meta property="og:url" content="https://www.soirfr.com/">',
    `<meta property="og:url" content="${url}">`, 'the og:url tag');

  h = replaceOnce(h, '<meta property="og:title" content="SoirFR — Agenda Local">',
    `<meta property="og:title" content="${esc(cfg.title)}">`, 'the og:title tag');

  h = h.replace(/<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${esc(desc)}">`);
  h = h.replace(/<meta property="og:description" content="[^"]*">/,
    `<meta property="og:description" content="${esc(desc)}">`);

  // Headline reuses the tagline slot and its exact styling. Keeping her brand
  // line and appending the place reads better than a long "Que faire à…",
  // which wrapped badly at this letter-spacing. The phrase still appears in
  // the title tag, the section headings and the paragraph under the list.
  // The place is set in ink against the rouge, the same split as the Soir/FR
  // wordmark above it. "Que faire à" keeps its full size and colour, because
  // that phrase is what the page is found for.
  const makeTag = (where, l) => {
    const w = where.split(' ');
    const n = w[1] === 'the' ? 2 : 1;
    const place = `<span style="color:var(--ink);font-weight:900">${esc(w.slice(n).join(' '))}</span>`;
    return l === 'en'
      ? `Things To Do ${esc(w.slice(0, n).join(' '))} ${place}<br>Culture &amp; Events`
      : `Que Faire ${esc(w.slice(0, n).join(' '))} ${place}<br>Culture &amp; Événements`;
  };
  // Both language versions, so toggling never loses the place name.
  const tags = {
    fr: makeTag(page.where, 'fr'),
    en: makeTag(page.en ? page.en.where : `in ${page.label}`, 'en')
  };
  const tagHtml = tags[lang];

  h = replaceOnce(h,
    '<div class="s-logo-tag" id="s-tag">Agenda Local<br>Culture &amp; Événements</div>',
    `<h1 class="s-logo-tag" id="s-tag" style="margin:12px 0 0">${tagHtml}</h1>`,
    'the sidebar tagline');

  // The list itself: what a visitor sees instantly and what Google reads.
  // Very large pages get trimmed: past ~150 rows it is weight, not ranking.
  const shown = evs.slice(0, MAX_RENDERED);
  const more = evs.length - shown.length;
  const moreNote = more > 0
    ? `\n<div class="dl-item" style="justify-content:center;padding:14px;font-family:var(--fc);font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--dust)">${lang === 'en' ? `+ ${more} more on the map` : `+ ${more} autres sur la carte`}</div>`
    : '';

  // Group into Today / This week / This weekend / Later, in date order.
  const b = sectionBounds(new Date());
  const buckets = [[], [], [], []];
  for (const ev of shown) buckets[sectionOf(ev, b)].push(ev);
  const body = buckets
    .map((rows, i) => rows.length
      ? sectionHeader(SECTIONS[lang][i], rows.length, lang) + '\n' + renderRows(rows, lang)
      : '')
    .filter(Boolean).join('\n');

  const footer = `\n<div class="dl-item" style="display:block;padding:16px;background:var(--cream);border-top:1px solid var(--border);cursor:default">
<p style="margin:0;font-family:var(--fb);font-weight:300;font-size:13.5px;line-height:1.55;color:#3a352b">${esc(UI[lang].footer(evs.length, cfg.label, page.km, new Date().getUTCFullYear()))}</p>
</div>`;

  h = replaceOnce(h, '<div id="drawer-list"></div>',
    `<div id="drawer-list">\n${body}${moreNote}${footer}\n</div>`, 'the drawer list');

  // Boot straight to this place instead of asking for the visitor's location.
  // Language buttons become real links to the other version where one exists.
  // That keeps the place in the headline (fresh page, right heading), lands
  // the visitor on the proper address, and gives Google genuine links between
  // the pair rather than hreflang tags alone.
  if (page.en) {
    const frHref = `/${page.slug}`, enHref = `/en/${page.slug}`;
    // Desktop and mobile carry the same pair at different indentation.
    const re = /<button class="lang-b on" onclick="setLang\('fr'\)">FR<\/button>(\s*)<button class="lang-b" onclick="setLang\('en'\)">EN<\/button>/g;
    const hits = (h.match(re) || []).length;
    if (hits < 2) throw new Error(`build.js: expected 2 FR/EN button pairs in index.html, found ${hits}`);
    h = h.replace(re, (_m, gap) => lang === 'en'
      ? `<a class="lang-b" href="${frHref}">FR</a>${gap}<a class="lang-b on" href="${enHref}">EN</a>`
      : `<a class="lang-b on" href="${frHref}">FR</a>${gap}<a class="lang-b" href="${enHref}">EN</a>`);
  }

  // setLang() rewrites the tagline from the translation table and would wipe
  // the place name. Give it the localised heading to use instead.
  h = replaceOnce(h, "if(tagEl)tagEl.innerHTML=t('tag').split('\\n').join('<br>');",
    "if(tagEl)tagEl.innerHTML=(window.__SOIRFR_TAGS&&window.__SOIRFR_TAGS[l])||t('tag').split('\\n').join('<br>');",
    'the setLang tagline line');

  h = replaceOnce(h, 'async function init(){',
    `window.__SOIRFR_PRESET=${JSON.stringify({ lat: page.lat, lng: page.lng, label: cfg.label, km: page.km, lang, tag: tagHtml })};\n` +
    `window.__SOIRFR_TAGS=${JSON.stringify(tags)};\nasync function init(){`,
    'the init function');

  // The preset branch replaces geolocation entirely: no browser permission
  // prompt, no "find my location", the map opens centred on this place.
  // setLang() rewrites #s-tag from the translation table, so the headline is
  // written back after it runs, or the English pages lose their heading.
  h = replaceOnce(h, '  if(navigator.geolocation){',
    `  if(window.__SOIRFR_PRESET){
    const p=window.__SOIRFR_PRESET;
    if(p.lang==='en') setLang('en');
    const tg=document.getElementById('s-tag'); if(tg&&p.tag)tg.innerHTML=p.tag;
    const si=document.getElementById('addr-input'); if(si)si.value=p.label;
    const sb2=document.getElementById('addr-input-sidebar'); if(sb2)sb2.value=p.label;
    homeLat=p.lat; homeLng=p.lng;
    setRadiusUI(p.km);
    doSearch(p.lat,p.lng,p.label);
  }else if(navigator.geolocation){`, 'the geolocation branch');

  h = replaceOnce(h, '</head>',
    `<script type="application/ld+json">${jsonLd(page, shown)}</script>\n</head>`,
    'the closing head tag');

  return h;
}

function sitemap(pages, stamp) {
  const urls = [
    { loc: `${SITE}/`, freq: 'daily', pri: '1.0' },
    ...pages.map(p => ({ loc: `${SITE}/${p.slug}`, freq: 'daily', pri: '0.9' })),
    ...pages.filter(p => p.en).map(p => ({ loc: `${SITE}/en/${p.slug}`, freq: 'daily', pri: '0.8' })),
    { loc: `${SITE}/submit.html`, freq: 'monthly', pri: '0.6' }
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${stamp}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.pri}</priority>
  </url>`).join('\n')}
</urlset>
`;
}

/* ── run ────────────────────────────────────────────────────────────────── */

(async () => {
  const now = new Date();
  const from = iso(now);
  const to = iso(new Date(now.getTime() + WINDOW_DAYS * 86400000));
  const tpl = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  fs.copyFileSync(path.join(SRC, 'index.html'), path.join(OUT, 'index.html'));
  for (const a of ASSETS) {
    const p = path.join(SRC, a);
    if (fs.existsSync(p)) fs.copyFileSync(p, path.join(OUT, a));
    else console.warn(`  ! asset missing, skipped: ${a}`);
  }

  console.log(`SoirFR build, ${from} to ${to}\n`);
  const todo = process.env.SOIRFR_ONLY ? PAGES.filter(p=>p.slug===process.env.SOIRFR_ONLY) : PAGES;
  for (const page of todo) {
    const raw = await fetchEvents(page, from, to);
    const evs = collapse(raw);
    for (const lang of page.en ? ['fr', 'en'] : ['fr']) {
      const dir = lang === 'en' ? path.join(OUT, 'en', page.slug) : path.join(OUT, page.slug);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'index.html'), buildPage(tpl, page, evs, lang));
    }
    const langs = page.en ? 'fr + en' : 'fr';
    console.log(`  /${page.slug.padEnd(18)} ${String(raw.length).padStart(4)} rows -> ${String(evs.length).padStart(4)} after collapsing   [${langs}]`);
  }

  const nUrls = 2 + PAGES.length + PAGES.filter(p => p.en).length;
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), sitemap(PAGES, from));
  console.log(`\n  sitemap.xml  ${nUrls} urls`);
  console.log('\nDone.');
})().catch(e => { console.error('\nBUILD FAILED:', e.message); process.exit(1); });
