# PLAN — aksendo.com (v4 FINAL)

> **v4 delta (authority v4 > v3 > v2 > brief > plan).** Applied on build:
> - **Data layer added:** `src/data/site.json` (booking address, title, meta) + `src/data/links.json` (artist + label URLs) are the single source for footer, contact, JSON-LD `sameAs`, `/press`. No URL in markup. Release/label URLs live in `releases.json`. Label SoundCloud URLs render only on their own release card (a credential), never as the artist's SoundCloud (`soundcloud.com/aksendo`).
> - **Booking settled:** `bookings@aksendo.com` (with s), from `site.json`, used for hero mailto, contact, JSON-LD `contactPoint`, Resend `from:`/`reply-to`, `/press`, OG desc. No longer 🔴.
> - **Audio feature CUT:** no `<audio>`, no toggle, no `public/audio/`, no sessionStorage key. §6 B5 below is void; `sound.js` module dropped; build-order sound step removed. Music is link-out only.
> - **Mixes = facade (default a):** static thumb → click injects YouTube iframe, plays in place; nothing loads/plays unasked. (b) pure link-out is a one-line switch — flagged in NOTES.
> - **Linktree demoted:** kept in `links.json`, rendered last/small or omitted from footer. IG bio should point to aksendo.com once live (client action in NOTES).
> - **`null` links render as nothing** — never a dead/disabled control. `ra: null` until approved.
> - **v3 not received in this session:** building on v2 + v4. v4 restates build order; v2 carries the mobile motion set + developing doctrine + forbidden list. Flagged in NOTES.

---

# PLAN — aksendo.com (v2 base)

Static artist site for **aksendo** (Justas Aksamitauskas), DJ / producer, Kaunas LT.
Vite (vanilla) · vanilla ES modules · plain CSS · Cloudflare Workers static assets + `/api/booking`.

Pass-1 plan, revised by **BRIEF v2**. Build does not begin until approved.
Pins from v1 that still stand: **monochrome only · shows before music · no stat cards · no per-section fade-ups · reduced-motion built first · left-aligned single column · five sections.**
`[choice]` = a decision on an open axis · `[flag]` = tracked in `NOTES.md` · `[v2]` = added/changed by Brief v2.

The thesis (Brief v2 B0): **complexity in material, simplicity in structure.** The layout does not get more elaborate than v1. Every byte of the upgrade goes into how surfaces *behave* — how photographs arrive, how type reacts, how the page is grained. If an addition needs a new section, new UI, or a second colour, it is the wrong addition.

---

## 0. Content — sourced, corrected [v2 Part A]

All copy/imagery from the supplied press kit PDF (`design/source/`), with the v2 corrections applied.
**The PDF is a source for photography and tone, NOT for age or stream count — both are wrong in it.**

**Bio (4 paragraphs, age removed) [v2 A1]:**
1. "Aksendo is a house DJ and producer from Kaunas, Lithuania. He does not walk into a room with one fixed formula. His sets move through house, tech house, indie dance, Afro house and melodic territory, shaped by the place, the hour and the people in front of him."
2. "A sunset on the Albanian coast, a yacht cutting through Croatia or a Friday night in Kaunas all ask for a different kind of energy. Feeling that shift and giving the room space is where he feels most at home."
3. "When he leans into tech house or indie dance, his approach becomes especially hands-on. He likes to build the groove live by looping, layering, extending transitions and improvising in the moment, so the set keeps evolving instead of simply running track by track."
4. "Lightness runs through everything he plays. His own productions begin the same way his strongest memories do, with a place, a road or a feeling he cannot quite leave behind."

**No age** appears anywhere: prose, marginalia, JSON-LD, `alt`, meta description. Grepped in the DoD.

**Pull quote (single, page-wide):** *lightness runs through everything he plays* (Archivo 800 italic break).

**Genres — one canonical list [v2 A5]:** `HOUSE · TECH HOUSE · INDIE DANCE · AFRO HOUSE · MELODIC`. No Disco. (RA profile disagrees — see NOTES, client action.)

**Available for:** FESTIVALS · CLUBS · OPEN AIRS · BEACH BARS

**Streams [v2 A2]:** Pico De Amor ≈ **330,000** streams. Stored in `releases.json` as structured data with `as_of`, rendered via `Intl.NumberFormat`. The press-kit phrase "close to 250,000 … overall" appears **nowhere**. Attributed to the *track*, not a career total. If `as_of` > 6 months old, render the label without the number.
```json
{ "id":"pico-de-amor", "streams": { "value":330000, "platform":"spotify", "as_of":"2026-09" } }
```

**Bookings email — confirmed [v2 A3]:** `bookings@aksendo.com` everywhere (hero mailto, contact mailto, JSON-LD `contactPoint`, Resend `from:` on auto-reply). `jaksamitauskas@gmail.com` appears **nowhere in the repo** — not markup, comment, or committed config. Delivery routing is infrastructure, set outside the repo. Grepped in the DoD.

**Assets on hand (real, from PDF — `design/source/`):** hero hat/coast 1134×782 (low-res [flag]); DJ portrait river 660×1275; live club DECKS&STORIES 1241×931; zebra motif 403×580.
**Missing → placeholders (NOTES):** full-res hero, dedicated 2nd portrait, 3× 1500² covers, exact platform URLs (only `linktr.ee/aksendo` known), RA URL, set times, ticket URLs, Dancing Street city/venue, **audio loop for the sound toggle [v2 B5]**, **profesorius.com reference screenshots [v2 B8]**.

---

## 1. Design tokens — final (`src/styles/tokens.css`)

```css
:root{
  --ink:#000; --paper:#FFF; --paper-warm:#F4F3F1; --grey-60:#6E6E6E; --grey-20:#D8D8D8;

  --font-display:"Archivo","Archivo Fallback","Arial Narrow",system-ui,sans-serif;
  --font-mono:"JetBrains Mono","JetBrains Mono Fallback",ui-monospace,Menlo,monospace;
  --font-body:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;

  --t-wordmark:clamp(4rem,18vw,16rem); --t-display:clamp(2.5rem,7vw,5.5rem);
  --t-lead:clamp(1.25rem,2.2vw,1.75rem); --t-body:1.0625rem; --t-meta:.75rem; --t-meta-sm:.6875rem;

  --track-wordmark:-.04em; --track-meta:.12em;
  --measure:62ch; --lh-body:1.55; --lh-tight:1.02;

  /* variable-font width axis, driven by scroll velocity [v2 B2] */
  --wdth-rest:125; --wdth-fast:100; --wdth-relax:600ms;

  --gutter:1fr; --gutter-pad:clamp(1.25rem,5vw,4rem); --maxw:1600px;

  --s-1:.25rem;--s-2:.5rem;--s-3:.75rem;--s-4:1rem;--s-6:1.5rem;--s-8:2rem;
  --s-12:3rem;--s-16:4rem;--s-24:6rem;--s-32:8rem;--s-48:12rem;

  --ease-entry:cubic-bezier(.16,1,.3,1); --dur-entry:900ms;
  --dur-hover:110ms; --lenis-lerp:.08; --scrub:.6;

  /* material layers [v2 B1/B3] */
  --grain-opacity:.055;     /* 0.04–0.07 */
  --grain-fps:10;           /* NOT 60 */
  --develop-warp-rest:3px;  /* domain-warp amplitude at rest */
  --develop-warp-max:12px;  /* at max scroll velocity */

  --focus-ring:2px;
  color-scheme:light;       /* one committed look; no dark theme, by intent */
}
```

---

## 2. Type — roles + reactive width [v2 B2]

| Family | Weight / axes | Role |
|---|---|---|
| **Archivo** var | `wght`900 upright, **`wdth` driven 100↔125** | Wordmark, footer mark |
| **Archivo** var | `wght`900 **italic**, `wdth` driven | Section heads (`/ SHOWS` etc., leading slash rule) |
| **Archivo** var | `wght`800 italic | The one pull quote |
| **Archivo** var | `wght`700–800 | Venue / release titles / big `BOOKINGS@…` mailto |
| **JetBrains Mono** | 400, .12em, uppercase | Data only: dates, cities, country codes, genres, marginalia, cursor readout, labels |
| system stack | 400 | Body prose (bio, release sentences, form) — 62ch, 1.55, ragged right |

**Reactive width [v2 B2]:** wordmark + section heads get `font-variation-settings:"wdth"` driven from **Lenis scroll velocity** — compress toward `wdth:100` while scrolling fast, relax to `wdth:125` at rest over ~600ms. Costs zero extra bytes (axis already in the subset). Velocity is **lerped**, written only to elements currently in viewport, never raw-per-frame. Desktop + motion-allowed only; mobile/reduced-motion ship the static `wdth:125` instance.

**SplitText [v2 B2]:** used for **one** thing — the entry sequence's character-level tracking close. Not for staggering headings in (that's a forbidden tell, B7). Free in the current GSAP release.

Fonts self-hosted woff2, subset Latin+Latin-Ext-A (ą č ę ė į š ų ū ž + caps). `archivo-var.woff2` (wght+ital+wdth), `jetbrainsmono-latin.woff2` (400). `font-display:swap`; fallbacks `size-adjust`/`ascent-override`/`descent-override` → zero CLS. No CDN font request.

---

## 3. Layout grid  (unchanged from v1)

Desktop ≥1100px: `grid-template-columns: var(--gutter) min(72ch,100%) var(--gutter)`; main left-aligned; wordmark/heads may full-bleed. 820–1100: single column, gutters collapse, marginalia off. <820: single column, marginalia → sticky bottom ticker. Gutters are `position:sticky` holding absolutely-positioned marginalia.

---

## 4. Section wireframes  (structure unchanged from v1 — see below)

`[MONO]` JetBrains Mono · `«italic»` Archivo italic head · `██` filled-black state.

### 4.1 ENTRY (once/session, sessionStorage, skippable <1.4s)
```
black → A K S E N D O (Archivo 900, tracked WIDE) → tracking closes -0.04em over 900ms (SplitText, ease-entry)
→ hero photo DEVELOPS up from bottom (dither→resolved) → inverts to paper → rests on Hero
skip: any scroll/click/keydown → jump to rest.  reduced-motion / no-JS: overlay never shown, Hero is first paint.
```

### 4.2 HERO  (`<header>`, full-bleed developing photo, one viewport)
```
DESKTOP                                   MOBILE (≤819)
[developing photo hat/coast, full bleed]  BOOKINGS↗  [MONO]  ← persistent top-right
                        BOOKINGS ↗        [clean photo bleed]
 AKSENDO                                  AKSENDO
 [MONO] DJ / PRODUCER — KAUNAS, LITHUANIA [MONO] DJ/PROD…
 [MONO] NEXT ▸ 18 SEP · CORNER CAFÉ       ┌18 SEP CORNER CAFÉ VILNIUS →┐  ← within 1st viewport,
        · VILNIUS → #shows                └────────────────────────────┘    no scroll, no anim dependency
```
Next show + BOOKINGS reachable on load, mobile, no scroll, independent of any animation.

### 4.3 SHOWS  (`<section>`, BEFORE music)
```
/ SHOWS «italic»
[MONO date]  Venue (display 800)  [tickets↗]      hover → invert black-on-white ≤110ms
────────────────────────────────────────────      row/release click → GSAP Flip expand in place [v2 B6]
██ TONIGHT ██  filled-black block if today (Europe/Vilnius)
18 SEP LT  CORNER CAFÉ        VILNIUS   —
19 SEP LT  DANCING STREET[TBC] TBC ·D&S
15 OCT DE  BULBUL            BERLIN ·D&S
┌ ADE 2026 · AMSTERDAM ─────────────────┐
│ 22 OCT ZU HAUSE          AMSTERDAM     │
│ 22 OCT ADE NETWORK HUB   AMSTERDAM     │
└────────────────────────────────────────┘
past → ▸ PLAYED (collapsed <details>), cut at end-of-day Europe/Vilnius
empty upcoming → "NEXT DATES ANNOUNCED SOON — BOOKINGS@AKSENDO.COM"
—— SELECTED APPEARANCES (dense mono block) — DECKS&STORIES · ATRADIMAI FESTIVAL · CORNER CAFÉ VILNIUS · … · OSLO & RHODES
```

### 4.4 MUSIC  (releases.json — link out, NO Spotify iframe; developing cover art)
```
/ MUSIC «italic»
[dev cover] PICO DE AMOR    [MONO] AFRO HOUSE · CONNECTED
            Built for open air moments and already heard on dance floors, incl. Zamna Tulum.
            [MONO] SPOTIFY↗ SOUNDCLOUD↗ YOUTUBE↗
[dev cover] BERLIN TO ADE   MELODIC TECH HOUSE · THE ANCHOR / OM&Y
[dev cover] TEMPORARY MIRACLE  AFRO HOUSE
330,000 appears ONLY in marginalia, from releases.json — never a stat card.
click cover/title → Flip expand in place [v2 B6]
```

### 4.5 MIXES  (click-to-load facades — no live iframes on load)
```
/ MIXES «italic»   [thumb ▶ YouTube] [thumb ▶ SoundCloud] [thumb ▶ YouTube]
click → inject real iframe (SoundCloud color=%23000000). Thumbs develop like other photos.
```

### 4.6 BIOGRAPHY  (narrow measure; marginalia work hardest)
```
/ BIOGRAPHY «italic»
[L] KAUNAS, LITHUANIA →   ¶1 Aksendo is a house DJ and producer from Kaunas…
                          ¶2 A sunset on the Albanian coast…
[R] LOOPING… LIVE →       ¶3 When he leans into tech house…
                          « lightness runs through everything he plays »  ← the one pull quote
                          ¶4 Lightness runs through everything…
```

### 4.7 CONTACT  (`<footer>`)
```
/ CONTACT «italic»
BOOKINGS@AKSENDO.COM   ← Archivo 800, largest after wordmark, mailto:
[MONO] DOWNLOAD PRESS KIT (PDF) ↓
[MONO] INSTAGRAM↗ SPOTIFY↗ SOUNDCLOUD↗ YOUTUBE↗ LINKTREE↗
── booking form: name·organisation·date·city·message [+honeypot hidden] → POST /api/booking
success → replaced in place · error → message kept.  (no newsletter — deliberate)
touch / reduced-motion: cursor-clock readout renders here as a static line [v2 B4]
```

---

## 5. Marginalia timeline map [v2 A1/A2/A4 applied]

One GSAP timeline per item, one ScrollTrigger each, `scrub:0.6`, `translateX(±40px)`+opacity. `getBoundingClientRect` cached; no layout reads in scrub cb; `will-change` on enter / stripped on leave. Gutters `aria-hidden` when animated; inline `<aside>` when not.

| # | Side | Text [MONO] | Anchor |
|---|---|---|---|
| 1 | R | `330,000 STREAMS · PICO DE AMOR` | hero→shows transition (value from releases.json) |
| 2 | R | `KAUNAS, LITHUANIA` | bio ¶1 |
| 3 | L | `HEARD AT ZAMNA TULUM` | Pico De Amor card |
| 4 | R | `WRITTEN ON THE ROAD, BERLIN → AMSTERDAM` | Berlin To ADE card |
| 5 | L | `CYPRUS — THE FIRST ONE` | Temporary Miracle card |
| 6 | R | `LOOPING, LAYERING, EXTENDING — LIVE` | bio ¶3 |
| 7 | L | `ALBANIA · CROATIA · OSLO · RHODES · BERLIN` | selected appearances |

L/R re-keyed at build so sides strictly alternate in real DOM order (hero,shows,music,mixes,bio,contact) — table fixes text↔anchor; ping-pong guaranteed by build. Reduced-motion → static `<aside>`. <820px → single sticky ticker, IO crossfade, no GSAP/Lenis.

---

## 6. Motion & material doctrine  [v2 Part B — REPLACES v1 §6]

Structure stays quiet; the life is in the surfaces. Rules 1–6 from v1 still hold (never hijack scroll; one orchestrated moment = entry; gutters scroll-linked both directions; transform/opacity only; reduced-motion disables everything and is built first; <820px ships no animation libs). On top:

**B1 — DEVELOPING images (the wow).** Every photo *develops like a darkroom print*: off-screen it is a high-contrast **blue-noise** dither field (not Bayer — Bayer reads as a filter grid); entering the viewport it resolves (threshold softens, mid-tones fill, grain settles); leaving, it decays back. **Scroll velocity controls development speed** — flick past → ghostly; move slowly → full focus.
- **OGL** (~10KB gz), **not Three.js**. One fullscreen quad per image.
- **[choice] Single WebGL context**: one `position:fixed` canvas behind content, drawing each visible image's quad at its element's current rect. Rationale: browsers cap ~16 contexts; one rAF; cheapest. Alternative (shared renderer → per-element canvases) benchmarked during build; result → NOTES.
- Shader uniforms per image: `uProgress`(0 dither→1 resolved, from a scrubbed ScrollTrigger), `uVelocity`(normalised), `uTime`, `uTexture`, `uResolution`. 64×64 blue-noise tile as a texture. Simplex domain-warp on sample coords, amplitude ≤3px rest / ≤12px max velocity.
- **rAF pauses when nothing moves**: no `uProgress` delta and velocity 0 for 400ms → stop the loop. A static page draws **zero** frames.
- **Always degrades**: the `<img>` is always in the DOM and correct; canvas is an overlay. No-JS / old GPU / reduced-motion / low-end → clean B&W photograph (which is the press kit anyway).

**B2 — Reactive width type.** (see §2) wordmark + heads breathe with scroll velocity via `wdth`. SplitText only for the entry.

**B3 — Grain.** One `position:fixed pointer-events:none` overlay above photography, below type. 128×128 WebP noise (<4KB) tiled, stepped between 8 fixed offsets at **8–12fps** (not 60 — celluloid, not TV static), opacity ~0.04–0.07. Reduced-motion → texture stays, animation stops.

**B4 — Cursor readout (desktop only).** Thin mono line trailing the cursor ~120ms lag showing **local time in the next show's city**: `AMSTERDAM  03:14:22`, updating every second; city changes as the shows section scrolls. Touch / reduced-motion → static line in footer. Explicitly **not** a scaling blob, magnetic dot, difference-blend invert, or trailing-dot chain.

**B5 — Sound. CUT by v4.** No audio anywhere on the site. Music is link-out only (release cards → Spotify/SoundCloud; mixes → YouTube facade). No `<audio>`, toggle, `public/audio/`, or sessionStorage key.

**B6 — Shared-element expand.** **GSAP Flip** for exactly one interaction: clicking a show row or release expands it in place, cover+title flipping list→expanded. No page-level curtains, no colour sweeps.

**B7 — Forbidden default kit.** None of: blob/magnetic/difference cursor · infinite word marquee · horizontal-scroll section · solid-colour curtain transitions · parallax-on-every-image · % counter/spinner preloader · 3D tilt hover · letter-by-letter stagger on every heading · bouncing scroll-cue arrow · scroll-pinning sticky sections. Using any once requires a written justification in NOTES.

---

## 7. Stack, libraries, licensing

- **Vite** vanilla, ES modules, **no TS**. Plain CSS custom props. No framework/Tailwind/SCSS.
- **Lenis** (smooth scroll, lerp .08) · **GSAP 3.13** + **ScrollTrigger** + **SplitText** + **Flip** · **OGL** (developing layer). All GSAP incl. plugins **100% free for commercial use** [verified — Webflow acquisition; source in NOTES]. OGL MIT.
- No Tone.js / Three.js / Web Audio. Sound is a plain `<audio>`.
- Deploy **Cloudflare Workers**: static assets binding + `worker/index.js` (`/api/booking`). `aksendo.com` apex → Worker; `www`→apex 301.
- Analytics **Cloudflare Web Analytics** only, deferred. No cookie banner.
- **Modules** (`src/modules/`): `scroll.js` (Lenis + velocity bus) · `develop.js` (OGL single-context developing layer) · `marginalia.js` (GSAP timelines / IO ticker) · `type.js` (wdth velocity drive) · `grain.js` · `cursor.js` (clock readout) · `sound.js` · `embeds.js` (facades) · `flip.js` (Flip expand) · `form.js` · `clock.js` (Europe/Vilnius partitioning + "tonight" + per-city tz for cursor) · `entry.js` · `capabilities.js` (downgrade guard).
- **Data:** `src/data/shows.json`, `src/data/releases.json` (incl. `streams`) — only files to edit for a gig/release. JSON-LD `MusicGroup`+`Event[]`, `sitemap.xml` generated at **build time** from these.

---

## 8. Performance budget  [v2 Part C — REPLACES v1 §8], split by device

### Mobile (<820px) — no WebGL, no GSAP, no Lenis, no audio, no blue-noise
| Metric | Target |
|---|---|
| LCP | ≤ 1.8s |
| CLS | < 0.03 |
| INP | < 150ms |
| JS gz | ≤ 60KB |
| Lighthouse Perf | ≥ 95 |

Mobile ships: clean photos, **static** grain texture, marginalia ticker, instant tap states. Designed as its own quiet thing and **checked first** — it's what most bookers see; must not feel like a stripped fallback.

### Desktop (≥820px, motion allowed)
| Metric | Target |
|---|---|
| LCP | ≤ 2.2s |
| CLS | < 0.03 |
| INP | < 200ms |
| JS gz | ≤ 200KB total, ≤ 40KB blocks first paint |
| Sustained scroll fps | ≥ 55 on a 2020 integrated-graphics laptop |
| Lighthouse Perf | ≥ 88 |

**Strict load order:** HTML+critical CSS → hero image → app JS → **first paint & full usability** → *then* dynamic `import()` Lenis, GSAP, OGL, noise texture. Nothing in Part B delays reading the next date or clicking the booking address.

**Self-downgrade guard [v2 Part C]:** at activation
```js
const weak = navigator.hardwareConcurrency<=4 || navigator.deviceMemory<=4 || !gl; // gl = WebGL2
```
plus live check: sample first 90 frames after WebGL activates; mean frame time >20ms → dispose renderer, remove canvas, plain `<img>` stands. Logged in NOTES as known behaviour.

Worker cache: hashed assets `immutable,max-age=31536000`; HTML `no-cache`.

---

## 9. Accessibility / SEO / correctness  (unchanged from v1 + v2 grep gates)

Landmarks `header/main/nav/section[aria-labelledby]/footer`; skip link → `#main`. Focus 2px black outline + white offset ring, never `outline:none`. Contrast ≥7:1 (true black on white); body prose never `--grey-60`. Meaningful `alt` (no age in alt); decorative motif `alt=""`. `lang="en"`, LT diacritics subset. Tested 200% zoom, 320/768/1440/2560.
`<title>` `AKSENDO — DJ / Producer, Kaunas`; meta desc <155ch, no age. OG+Twitter 1200×630 (wordmark over hero). JSON-LD `MusicGroup`(+`sameAs`, `contactPoint` bookings@, RA when known) + one `Event` per upcoming show. `sitemap.xml`, `robots.txt`, canonical. `/press` route → PDF + hi-res photos (**PDF must be regenerated to drop age before publishing — NOTES A1**).

---

## 10. Build order (Pass 2, commit each stage)

1. Scaffold + tokens/base + fonts + data JSON + **full no-JS / reduced-motion site**, all sections, usable. — commit
2. **Mobile pass to Lighthouse ≥95 first** (clean photos, static grain, ticker). — commit
3. Worker: assets + cache + `/api/booking` (Resend, honeypot, min-time, IP rate-limit; `from: bookings@`). — commit
4. SEO / JSON-LD / OG / sitemap / `/press`. — commit
5. Lenis + velocity bus + reactive-width type. — commit
6. Entry sequence (SplitText). — commit
7. Marginalia (desktop scrub) + mobile ticker. — commit
8. **Developing layer** (OGL single context, blue-noise, domain-warp, rAF-pause) + downgrade guard. — commit
9. Grain + cursor clock readout + sound toggle + Flip expand. — commit
10. Perf pass: desktop ≥55fps (no frame >20ms), WebGL disposes on resize/tab-hide/downgrade; re-verify all §8 targets; screenshot + critique each stage. — commit
11. `NOTES.md` finalised.

---

## 11. Self-critique — why this isn't "any DJ site" / "any cool-agency site"

v1's three fixes stand (music = margin note not stat card; no per-section fade-ups; shows first as a dense table not cards). Brief v2 adds the real risk — that the upgrade turns into the generic "impressive agency" kit. Guards:

1. **The spectacle is in material, not layout.** No new section, no second colour, no new UI earns its way in. The developing-image idea is tied to *this* artist — the press kit's print identity and the bio's language about memory ("a place, a road, a feeling he cannot quite leave behind") — not to a library demo. That specificity is the whole bet.
2. **B7 forbidden-kit is enforced, not decorative.** SplitText restricted to the entry; Flip to one click; cursor is a *touring-time readout*, not a blob. Each is a stated fact about the artist, not a flourish.
3. **The plain version is a design, not a fallback.** Mobile and no-JS are built and judged first and on their own merits; the WebGL layer only ever adds to a page that is already complete and beautiful.
4. **Reference gap named, not guessed [v2 B8].** profesorius.com is unseen; I will not reverse-engineer "make it like that but nicer." Client to supply screenshots of the moments he likes → `design/references/`; then a concrete 3-take / 2-avoid written to NOTES before those cues touch the build.

---

## Open questions (full list in NOTES.md)
Resolved by v2: booking address ✅, genres (site) ✅, Cyprus year ✅, age ✅, streams source ✅.
Still open: full-res hero · 2nd portrait · 3× 1500² covers · exact platform + RA URLs · set times · ticket URLs · Dancing Street city/venue · **audio loop + clearance** · **profesorius.com screenshots** · Resend/domain/Email-Routing/DNS setup · RA "Disco" mismatch (client edits RA).
