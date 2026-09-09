// gen-html.mjs — renders index.html + press.html + sitemap.xml + robots.txt from
// the data layer, at build time, so the site is complete with JavaScript disabled.
// shows.json / releases.json / links.json / site.json remain the only edit points.
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'src', 'data');
const SHOW_ART = join(ROOT, 'design', 'source', 'shows');
const j = async (f) => JSON.parse(await readFile(join(DATA, f), 'utf8'));

const site = await j('site.json');
const links = await j('links.json');
const shows = await j('shows.json');
const releases = await j('releases.json');
let mixes = [];
try { mixes = await j('mixes.json'); } catch { mixes = []; }

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const attr = (s = '') => esc(s).replace(/'/g, '&#39;');

/* ---------- dates (Europe/Vilnius) ---------- */
const TZ = site.timezone || 'Europe/Vilnius';
const todayISO = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const dayFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: 'short' });
const monoDate = (iso) => dayFmt.format(new Date(iso + 'T12:00:00')).toUpperCase();
const isPast = (iso) => iso < todayISO;      // end-of-day handled client-side; build baseline
const isToday = (iso) => iso === todayISO;

/* ---------- streams (freshness rule) ---------- */
function streamsLabel(r) {
  if (!r.streams) return null;
  const { value, as_of } = r.streams;
  const [y, m] = as_of.split('-').map(Number);
  const asOf = new Date(y, m - 1, 1);
  const sixAgo = new Date(); sixAgo.setMonth(sixAgo.getMonth() - 6);
  const num = new Intl.NumberFormat('en-US').format(value);
  return asOf < sixAgo ? 'SPOTIFY STREAMS' : `${num} STREAMS`;
}

/* ---------- <picture> helper ---------- */
function pic({ name, widths, sizes, alt, w, h, cls = '', lazy = true, priority = false }) {
  const set = (fmt) => widths.map((wd) => `/img/gen/${name}-${wd}.${fmt} ${wd}w`).join(', ');
  return `<picture>
  <source type="image/avif" srcset="${set('avif')}" sizes="${sizes}">
  <source type="image/webp" srcset="${set('webp')}" sizes="${sizes}">
  <img src="/img/gen/${name}-${widths[widths.length - 1]}.jpeg" srcset="${set('jpeg')}" sizes="${sizes}"
       width="${w}" height="${h}" alt="${attr(alt)}"${cls ? ` class="${cls}"` : ''}
       ${priority ? 'fetchpriority="high" decoding="async"' : `loading="lazy" decoding="async"`}></picture>`;
}

/* ---------- marginalia ---------- */
const picoStreams = streamsLabel(releases.find((r) => r.id === 'pico-de-amor'));
function margin(side, id, html) {
  return `<aside class="margin margin--${side}" data-margin="${id}" data-side="${side}">${html}</aside>`;
}

/* ---------- shows ---------- */
function venueSlug(venue) {
  return String(venue)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Resolve artwork file on disk. `artwork` field wins; else try {slug}.{jpg,jpeg,png,webp}. */
function resolveArtwork(s) {
  if (s.artwork) {
    const p = join(SHOW_ART, s.artwork);
    if (existsSync(p)) {
      const stem = s.artwork.replace(/\.[^.]+$/, '');
      return { file: s.artwork, stem };
    }
    return null;
  }
  const slug = venueSlug(s.venue);
  for (const ext of ['.jpg', '.jpeg', '.png', '.webp']) {
    if (existsSync(join(SHOW_ART, slug + ext))) return { file: slug + ext, stem: slug };
  }
  return null;
}

function showArtPic(stem, venue) {
  const widths = [64, 128, 256];
  const set = (fmt) => widths.map((wd) => `/img/gen/show-${stem}-${wd}.${fmt} ${wd}w`).join(', ');
  return `<picture>
  <source type="image/avif" srcset="${set('avif')}" sizes="64px">
  <source type="image/webp" srcset="${set('webp')}" sizes="64px">
  <img src="/img/gen/show-${stem}-128.jpeg" srcset="${set('jpeg')}" sizes="64px"
       width="128" height="128" alt="${attr(venue + ' show artwork')}" loading="lazy" decoding="async">
</picture>`;
}

function showRow(s, { dotted = false } = {}) {
  const tonight = isToday(s.date);
  const meta = [];
  meta.push(`<span class="mono mono--dim">${esc(s.country)}</span>`);
  if (s.billing) meta.push(`<span class="mono mono--dim">${esc(s.billing)}</span>`);
  const tickets = s.tickets
    ? `<span class="show__tickets mono"><a href="${attr(s.tickets)}" target="_blank" rel="noopener">TICKETS ↗</a></span>`
    : `<span class="show__tickets mono mono--dim">—</span>`;
  const time = s.time ? `<span class="mono mono--dim">${esc(s.time)}</span>` : '';
  const art = resolveArtwork(s);
  const artHtml = art
    ? `<span class="show__art" data-develop>${showArtPic(art.stem, s.venue)}</span>`
    : '';
  const artClass = art ? ' show--art' : '';
  return `<div class="show${artClass}${tonight ? ' show--tonight' : ''}" data-date="${s.date}">
    <span class="show__date">${monoDate(s.date)}${tonight ? '<span class="show__flag">TONIGHT</span>' : ''}</span>
    ${artHtml}
    <span class="show__main">
      <span class="show__venue">${esc(s.venue)}</span>
      <span class="show__meta"><span class="mono mono--dim">${esc(s.city).toUpperCase()}</span>${meta.map((m) => m).join('')}${time}</span>
    </span>
    ${tickets}
  </div>`;
}

function renderShows(list) {
  // group consecutive same-festival entries
  const out = [];
  let i = 0;
  while (i < list.length) {
    const s = list[i];
    if (s.festival) {
      const group = [s];
      let k = i + 1;
      while (k < list.length && list[k].festival === s.festival) { group.push(list[k]); k++; }
      const cities = [...new Set(group.map((g) => g.city.toUpperCase()))].join(' · ');
      const headLabel = s.festival.toUpperCase() === 'PRIVATE'
        ? 'PRIVATE'
        : `${esc(s.festival).toUpperCase()} · ${cities}`;
      out.push(`<div class="festival"><div class="festival__head">${headLabel}</div>${group.map((g) => showRow(g, { dotted: true })).join('')}</div>`);
      i = k;
    } else {
      out.push(showRow(s));
      i++;
    }
  }
  return out.join('');
}

const upcoming = shows.filter((s) => !isPast(s.date)).sort((a, b) => a.date.localeCompare(b.date));
const played = shows.filter((s) => isPast(s.date)).sort((a, b) => b.date.localeCompare(a.date));

const showsHtml = upcoming.length
  ? `<div class="shows__list" id="shows-list">${renderShows(upcoming)}</div>`
  : `<p class="shows__empty">NEXT DATES ANNOUNCED SOON — <a href="mailto:${site.booking}">${site.booking.toUpperCase()}</a></p>`;

const playedHtml = played.length
  ? `<details class="played"><summary>Played (${played.length})</summary><div class="shows__list">${renderShows(played)}</div></details>`
  : '';

const nextShow = upcoming[0];
const nextShowHtml = nextShow
  ? `<a class="hero__next" href="#shows"><span class="mono label">NEXT ▸</span> <span class="mono"><b>${monoDate(nextShow.date)}</b> · ${esc(nextShow.venue).toUpperCase()} · ${esc(nextShow.city).toUpperCase()}</span> <span class="mono arrow">→</span></a>`
  : `<p class="hero__next mono">NEXT DATES ANNOUNCED SOON — <a href="mailto:${site.booking}">${site.booking.toUpperCase()}</a></p>`;

/* ---------- music ---------- */
function releaseCard(r) {
  const tags = [r.genre.toUpperCase(), r.label ? r.label.toUpperCase() : null, r.with ? `WITH ${r.with.toUpperCase()}` : null]
    .filter(Boolean).map((t) => `<span class="mono mono--dim">${esc(t)}</span>`).join('');
  const linkEls = [];
  if (r.links.spotify) linkEls.push(`<a href="${attr(r.links.spotify)}" target="_blank" rel="noopener">SPOTIFY ↗</a>`);
  if (r.links.soundcloud) {
    const labelName = r.label ? r.label.toUpperCase() : 'SOUNDCLOUD';
    linkEls.push(`<a href="${attr(r.links.soundcloud)}" target="_blank" rel="noopener">SOUNDCLOUD ↗</a>`);
    // label upload = credential note
    r._cred = `VIA ${labelName} · SOUNDCLOUD`;
  }
  const cred = r._cred ? `<div class="release__cred mono mono--dim">${esc(r._cred)}</div>` : '';
  const cover = pic({
    name: `cover-${r.id}`, widths: [400, 800, 1200], sizes: '(max-width:640px) 88px, 120px',
    alt: `${r.title} — cover art`, w: 1200, h: 1200, cls: ''
  });
  return `<article class="release" id="release-${r.id}">
    <div class="release__cover">${cover}</div>
    <div class="release__body">
      <h3 class="release__title">${esc(r.title)}</h3>
      <div class="release__tags">${tags}</div>
      <p class="release__note">${esc(r.note)}</p>
      <div class="release__links">${linkEls.join('')}</div>
      ${cred}
    </div>
  </article>`;
}
const musicHtml = releases.map(releaseCard).join('');

/* ---------- mixes (YouTube banners) ---------- */
const ytChannel = links.artist.youtube;
function mixCard(m) {
  const thumb = m.thumbFallback || m.thumb || '';
  const hi = m.thumb || thumb;
  // Title lives BELOW the frame — YouTube thumbs already bake titles into the image.
  return `<article class="mix">
  <a class="mix__frame" href="${attr(m.url)}" target="_blank" rel="noopener" data-mix data-video="${attr(m.id)}" aria-label="${attr(m.title)} — Watch mix on YouTube">
    <span class="mix__media" aria-hidden="true">
      <img src="${attr(hi)}" alt="" width="1280" height="720" loading="lazy" decoding="async"
           onerror="this.onerror=null;this.src='${attr(thumb)}'">
    </span>
    <span class="mix__play" aria-hidden="true"></span>
  </a>
  <div class="mix__meta">
    <h3 class="mix__title"><a href="${attr(m.url)}" target="_blank" rel="noopener">${esc(m.title)}</a></h3>
    <a class="mix__cta" href="${attr(m.url)}" target="_blank" rel="noopener">Watch mix ↗</a>
  </div>
</article>`;
}
const mixesHtml = mixes.length
  ? `<div class="mixes__grid">${mixes.map(mixCard).join('')}</div>
      <div class="mixes__more"><a href="${attr(ytChannel)}" target="_blank" rel="noopener">Watch more mixes ↗</a></div>`
  : `<p class="mixes__empty">Mixes on YouTube — <a href="${attr(ytChannel)}" target="_blank" rel="noopener">Open channel ↗</a></p>`;

/* ---------- appearances (film credits) ---------- */
const appearancesHtml = `<div class="appearances">
  <span class="lead">Selected appearances</span>
  <ul class="appearances__list">
    ${site.selectedAppearances.map((a) => `<li>${esc(a)}</li>`).join('')}
  </ul>
</div>`;

const signalLines = Array.from({ length: 7 }, () => `<span class="signal__line">aksendo</span>`).join('');
const signalHtml = `<section class="signal cv-auto" id="signal" aria-label="aksendo">
  <div class="signal__inner">
    <div class="signal__stack" aria-hidden="true">${signalLines}</div>
    <p class="signal__manifesto">${esc(site.manifesto || 'shaping my sound little by little')}</p>
  </div>
</section>`;

/* ---------- links / footer ---------- */
const footLinks = [];
for (const [k, label] of [['instagram', 'INSTAGRAM'], ['spotify', 'SPOTIFY'], ['soundcloud', 'SOUNDCLOUD'], ['youtube', 'YOUTUBE'], ['ra', 'RESIDENT ADVISOR']]) {
  if (links.artist[k]) footLinks.push(`<a href="${attr(links.artist[k])}" target="_blank" rel="noopener">${label} ↗</a>`);
}
// linktree demoted: last + small (kept, not prominent)
if (links.artist.linktree) footLinks.push(`<a href="${attr(links.artist.linktree)}" target="_blank" rel="noopener" class="mono--dim">LINKTREE ↗</a>`);
const contactLinksHtml = footLinks.join('');

/* ---------- JSON-LD ---------- */
const sameAs = ['instagram', 'spotify', 'soundcloud', 'youtube', 'linktree', 'ra'].map((k) => links.artist[k]).filter(Boolean);
const musicGroup = {
  '@context': 'https://schema.org', '@type': 'MusicGroup', name: 'AKSENDO', url: site.url,
  genre: site.genres.map((g) => g.replace(/\b\w/g, (c) => c) ), sameAs,
  location: { '@type': 'Place', name: 'Kaunas, Lithuania' },
  contactPoint: { '@type': 'ContactPoint', contactType: 'booking', email: site.booking }
};
const events = upcoming.map((s) => ({
  '@context': 'https://schema.org', '@type': 'MusicEvent',
  name: `AKSENDO${s.festival ? ' · ' + s.festival : ''} — ${s.venue}, ${s.city}`,
  startDate: s.date,
  eventStatus: 'https://schema.org/EventScheduled',
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  location: { '@type': 'Place', name: s.venue === s.city ? s.venue : `${s.venue}, ${s.city}`, address: { '@type': 'PostalAddress', addressLocality: s.city, addressCountry: s.country } },
  performer: { '@type': 'MusicGroup', name: 'AKSENDO', url: site.url },
  ...(s.tickets ? { offers: { '@type': 'Offer', url: s.tickets, availability: 'https://schema.org/InStock' } } : {})
}));
const jsonld = [musicGroup, ...events];

/* ---------- head ---------- */
const ogImg = `${site.url}/img/gen/og.jpg`;
function head({ title, desc, canonical, extraLD }) {
  return `<meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${attr(desc)}">
  <link rel="canonical" href="${attr(canonical)}">
  <meta name="theme-color" content="#000000">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="AKSENDO">
  <meta property="og:title" content="${attr(title)}">
  <meta property="og:description" content="${attr(desc)}">
  <meta property="og:url" content="${attr(canonical)}">
  <meta property="og:image" content="${attr(ogImg)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${attr(title)}">
  <meta name="twitter:description" content="${attr(desc)}">
  <meta name="twitter:image" content="${attr(ogImg)}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="preload" as="font" type="font/woff2" href="/fonts/archivo-var.woff2" crossorigin>
  <link rel="preload" as="font" type="font/woff2" href="/fonts/jetbrainsmono-latin.woff2" crossorigin>
  <link rel="preload" as="font" type="font/otf" href="/fonts/bernoru-blackultraexpanded.otf" crossorigin>
  <link rel="preload" as="image" type="image/avif" fetchpriority="high"
        imagesrcset="/img/gen/hero-m-480.avif 480w, /img/gen/hero-m-750.avif 750w, /img/gen/hero-m-1080.avif 1080w, /img/gen/hero-640.avif 640w, /img/gen/hero-960.avif 960w, /img/gen/hero-1600.avif 1600w, /img/gen/hero-2560.avif 2560w"
        imagesizes="100vw">
  <link rel="stylesheet" href="/src/styles/main.css">
  ${extraLD ? `<script type="application/ld+json">${JSON.stringify(extraLD)}</script>` : ''}`;
}

/* ---------- page ---------- */
const genres = site.genres.join(' · ');

const index = `<!doctype html>
<html lang="en" class="no-js">
<head>
  ${head({ title: site.title, desc: site.description, canonical: site.url, extraLD: jsonld })}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>

<div class="entry" hidden aria-hidden="true"><span class="entry__word">AKSENDO</span><span class="entry__skip">Scroll to skip</span></div>

<header class="topbar" data-topbar>
  <nav class="topbar__right" aria-label="Primary">
    <a class="topbar__book" href="mailto:${site.booking}">BOOKINGS</a>
  </nav>
</header>

<div class="grain" aria-hidden="true"></div>

<main id="main">
  <section class="hero" id="top" aria-label="Intro">
    <div class="hero__media" data-develop>
      <picture>
  <source media="(max-width: 819px)" type="image/avif"
          srcset="/img/gen/hero-m-480.avif 480w, /img/gen/hero-m-750.avif 750w, /img/gen/hero-m-1080.avif 1080w, /img/gen/hero-m-1440.avif 1440w"
          sizes="100vw">
  <source media="(max-width: 819px)" type="image/webp"
          srcset="/img/gen/hero-m-480.webp 480w, /img/gen/hero-m-750.webp 750w, /img/gen/hero-m-1080.webp 1080w, /img/gen/hero-m-1440.webp 1440w"
          sizes="100vw">
  <source media="(max-width: 819px)" type="image/jpeg"
          srcset="/img/gen/hero-m-480.jpeg 480w, /img/gen/hero-m-750.jpeg 750w, /img/gen/hero-m-1080.jpeg 1080w, /img/gen/hero-m-1440.jpeg 1440w"
          sizes="100vw">
  <source type="image/avif" srcset="/img/gen/hero-640.avif 640w, /img/gen/hero-960.avif 960w, /img/gen/hero-1600.avif 1600w, /img/gen/hero-2560.avif 2560w" sizes="100vw">
  <source type="image/webp" srcset="/img/gen/hero-640.webp 640w, /img/gen/hero-960.webp 960w, /img/gen/hero-1600.webp 1600w, /img/gen/hero-2560.webp 2560w" sizes="100vw">
  <img src="/img/gen/hero-2560.jpeg" srcset="/img/gen/hero-640.jpeg 640w, /img/gen/hero-960.jpeg 960w, /img/gen/hero-1600.jpeg 1600w, /img/gen/hero-2560.jpeg 2560w" sizes="100vw"
       width="2560" height="1920" alt="Aksendo from behind at the decks, fist raised, Decks & Stories shirt — live press portrait."
       fetchpriority="high" decoding="async">
</picture>
    </div>
    <div class="hero__inner">
      <h1 class="hero__wordmark" data-wordmark>AKSENDO</h1>
      <p class="hero__role"><span class="mono">${esc(site.roleLine)}</span></p>
      ${nextShowHtml}
    </div>
  </section>

  <section class="section cv-auto" id="shows" aria-labelledby="shows-h">
    <div class="wrap grid">
      <h2 class="section-head" id="shows-h">Shows</h2>
      ${showsHtml}
      ${playedHtml}
      ${appearancesHtml}
    </div>
  </section>

  <section class="section section--warm cv-auto" id="music" aria-labelledby="music-h">
    <div class="wrap grid">
      <h2 class="section-head" id="music-h">Music</h2>
      ${picoStreams ? margin('R', 'streams', `<b>${picoStreams}</b> · PICO DE AMOR`) : ''}
      ${musicHtml}
      ${margin('L', 'zamna', 'HEARD AT ZAMNA TULUM')}
      ${margin('R', 'road', 'WRITTEN ON THE ROAD, BERLIN → AMSTERDAM')}
      ${margin('L', 'cyprus', 'CYPRUS — THE FIRST ONE')}
    </div>
  </section>

  ${signalHtml}

  <section class="section cv-auto" id="mixes" aria-labelledby="mixes-h">
    <div class="wrap grid">
      <h2 class="section-head" id="mixes-h">Mixes</h2>
      ${mixesHtml}
    </div>
  </section>

  <section class="section section--warm cv-auto" id="bio" aria-labelledby="bio-h">
    <div class="wrap grid">
      <h2 class="section-head" id="bio-h">Biography</h2>
      <div class="bio__prose">
        <p data-bio="1">${esc(site.bio[0])}</p>
        ${margin('R', 'kaunas', 'KAUNAS, LITHUANIA')}
        <p data-bio="2">${esc(site.bio[1])}</p>
        <p class="pull">${esc(site.pullQuote)}</p>
        <p data-bio="3">${esc(site.bio[2])}</p>
        <p data-bio="4">${esc(site.bio[3])}</p>
        <p class="bio__evolving" data-evolving="${attr(site.evolving || '')}"></p>
      </div>
    </div>
  </section>

  <footer class="section contact cv-auto" id="contact" aria-labelledby="contact-h">
    <div class="wrap grid">
      <h2 class="section-head" id="contact-h">Contact</h2>
      <a class="contact-mail contact__book" href="mailto:${site.booking}"><span class="contact-mail__part">BOOKINGS@</span><span class="contact-mail__part">AKSENDO.COM</span></a>
      <div class="contact__row">
        <a href="${attr(site.pressUrl || site.pressPdf)}" target="_blank" rel="noopener">PRESS ↗</a>
        ${site.pressPdf ? `<a href="${attr(site.pressPdf)}" download>DOWNLOAD PRESS KIT (PDF) ↓</a>` : ''}
      </div>
      <div class="contact__row">${contactLinksHtml}</div>

      <form class="bform" id="booking-form" method="post" action="/api/booking" novalidate>
        <div class="bform__grid">
          <label><span class="lbl">Name</span><input name="name" autocomplete="name" required></label>
          <label><span class="lbl">Email</span><input type="email" name="email" autocomplete="email" required></label>
          <label><span class="lbl">Organisation</span><input name="organisation" autocomplete="organization"></label>
          <label><span class="lbl">Date</span><input name="date" placeholder="e.g. 2026-11-14" inputmode="numeric"></label>
          <label><span class="lbl">City</span><input name="city" autocomplete="address-level2"></label>
          <label><span class="lbl">Message</span><textarea name="message" required></textarea></label>
          <div class="bform__hp" aria-hidden="true"><label>Do not fill<input name="company_url" tabindex="-1" autocomplete="off"></label></div>
          <input type="hidden" name="ts" value="">
          <button class="bform__submit" type="submit">Send enquiry</button>
          <p class="bform__note">Goes straight to ${esc(site.booking)}. No form? Email that address.</p>
          <p class="bform__msg" role="status" aria-live="polite"></p>
        </div>
      </form>
    </div>
  </footer>
</main>

<div class="ticker" data-ticker aria-hidden="true"></div>

<footer class="site-foot">
  <span>© <span data-year>2026</span> AKSENDO · KAUNAS, LITHUANIA</span>
  <span class="footer-clock" data-footer-clock>KAUNAS</span>
  <span>${genres}</span>
</footer>

<script type="module" src="/src/main.js"></script>
</body>
</html>
`;

/* ---------- press page ---------- */
const press = `<!doctype html>
<html lang="en" class="no-js">
<head>
  ${head({ title: 'AKSENDO — Press', desc: 'Press kit, photos and booking for AKSENDO — DJ / producer, Kaunas.', canonical: site.url + '/press' })}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="topbar"><a class="topbar__home" href="/">AKSENDO</a><nav class="topbar__right"><a class="topbar__book" href="mailto:${site.booking}">BOOKINGS</a></nav></header>
<main id="main" class="section"><div class="wrap grid">
  <h1 class="section-head">Press</h1>
  <p class="prose" style="max-width:60ch">One link for promoters: kit, photos and booking. AKSENDO — house DJ and producer from Kaunas, Lithuania.</p>
  <div class="contact__row" style="margin-top:2rem">
    <a href="${site.pressPdf}" download>DOWNLOAD PRESS KIT (PDF) ↓</a>
    <a href="mailto:${site.booking}">${site.booking.toUpperCase()}</a>
  </div>
  <div style="margin-top:3rem;display:grid;gap:1.5rem;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
    ${pic({ name: 'hero', widths: [640, 960, 1134], sizes: '(max-width:700px) 100vw, 33vw', alt: 'Aksendo — coast portrait.', w: 1134, h: 782 })}
    ${pic({ name: 'portrait', widths: [480, 660], sizes: '(max-width:700px) 100vw, 33vw', alt: 'Aksendo DJing at sunset by a river.', w: 660, h: 1275 })}
    ${pic({ name: 'live', widths: [640, 1000, 1241], sizes: '(max-width:700px) 100vw, 33vw', alt: 'Aksendo playing to a crowd, club floor.', w: 1241, h: 931 })}
  </div>
  <div class="contact__row" style="margin-top:3rem">${contactLinksHtml}</div>
  <p style="margin-top:3rem"><a href="/" class="mono">← BACK TO SITE</a></p>
</div></main>
</body>
</html>
`;

await writeFile(join(ROOT, 'index.html'), index);
await writeFile(join(ROOT, 'press.html'), press);

/* ---------- sitemap + robots + favicon ---------- */
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${site.url}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
</urlset>
`;
await writeFile(join(ROOT, 'public', 'sitemap.xml'), sitemap);
await writeFile(join(ROOT, 'public', 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);
await writeFile(join(ROOT, 'public', 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#000"/><text x="50" y="72" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="70" text-anchor="middle" fill="#fff">A</text></svg>`);

console.log(`gen-html: ${upcoming.length} upcoming, ${played.length} played, ${releases.length} releases, ${mixes.length} mixes, ${events.length} events. index.html + press.html written.`);
