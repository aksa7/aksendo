# NOTES — aksendo.com

## Show artwork (v5 Part C)

Drop square(ish) show images into **`design/source/shows/`**. Naming is the venue slug:

| Venue | Expected filename | Status |
|---|---|---|
| Corner Café | `corner-cafe.jpg` | **missing** |
| Dancing Street | `dancing-street.jpg` | **missing** |
| Bulbul Berlin | `bulbul-berlin.jpg` | **missing** |
| Zu Hause | `zu-hause.jpg` | **missing** |
| ADE Network Hub | `ade-network-hub.jpg` | **missing** |

Rules:
- Filename = venue name, lowercased, accents stripped, spaces/`&`/punctuation → hyphens. Prefer `.jpg` (also accepts `.jpeg` / `.png` / `.webp`).
- Optional: set `"artwork": "corner-cafe.jpg"` in `shows.json` to pin a non-slug name. If the field is `null`, the build auto-picks `{slug}.jpg` when the file exists.
- A show with no file on disk renders a normal row — **no gap, no placeholder box**.
- Pipeline emits `public/img/gen/show-{stem}-{64,128,256}.{avif,webp,jpeg}` on `npm run images`.
- Desktop: thumbs use the same develop-from-dither treatment as the hero. Mobile (<820px): plain image. Click/tap a row with art Flip-expands the thumb.

## Everything still open (v4 §5 + v5)

| Item | Blocks / current behaviour |
|---|---|
| Show artwork ×5 | See checklist above — all missing. Rows work without them. |
| Release cover art, 3 × 1500×1500 | Music ships **monochrome typographic placeholders** (distinct pattern per release). Drop real art into `design/source/` as `cover-<id>.jpg` and extend `scripts/build-images.mjs`. |
| Spotify track URLs — Pico De Amor, Berlin To ADE | Those two cards show **SoundCloud only**. `links.spotify` is `null` in `releases.json`; add the real track URLs there. |
| Resident Advisor URL | `ra: null` in `links.json` → **renders as nothing** (footer + JSON-LD `sameAs`). Add when the RA page is approved. |
| Set times, all five shows | Rows **omit time**. `time: null` in `shows.json`. |
| Ticket URLs | Rows show `—`. `tickets: null` in `shows.json`. |
| Dancing Street (19 Sep) — city & venue | Row reads `TBC`. Fill `city` in `shows.json`. |
| Regenerated press kit PDF | `/press` + the download link point at `/aksendo-press-kit-2026.pdf`, **not yet placed in `public/`** — and the current kit still carries the age and the gmail, so it must be regenerated before it's published. Until then the download 404s by design (better than serving stale info). |

Nothing above blocks the build; each degrades to an absence, never a broken control.

## Client actions
- **Send show artwork** named to the checklist above → `design/source/shows/`.
- **Regenerate the press-kit PDF**: remove the age; change the `+ LINKTR.EE/AKSENDO` lines to `aksendo.com`; then place it at `public/aksendo-press-kit-2026.pdf`.
- **Point the Instagram bio link at `aksendo.com`** (not Linktree) once live — the site is now the hub (booking + dates).
- **Resident Advisor genres**: RA lists House / Tech House / **Disco**; the site + kit say no Disco (Indie Dance / Afro / Melodic). Edit RA to match.
- **Audio loop**: not needed — the sound feature was cut in v4.

## Infrastructure (your Cloudflare / DNS access)
- Resend account + verified sending domain `aksendo.com`; set the key: `wrangler secret put RESEND_API_KEY`. Until set, `/api/booking` returns a graceful 503 and the form tells the user to email directly.
- (Optional but recommended) KV namespace bound as `RL` for IP rate-limiting; without it the limiter is skipped (honeypot + min-time still apply).
- Email Routing: `bookings@aksendo.com` (+ aliases `booking@` and `info@`) → your delivery inbox.
- DNS: apex `aksendo.com` → the Worker; `www` → apex (the Worker already 301s www→apex).
- Cloudflare Web Analytics: add the beacon token — currently **not embedded** (no third-party on load). Add the snippet to `scripts/gen-html.mjs` head with your token when ready.
- **Booking form end-to-end (send + auto-reply) is unverified** because it needs the Resend key + verified domain above. Code path is complete and validated; verify after provisioning.

## Engineering decisions & known behaviours
- **Developing photograph (v5):** hero + show-row artwork thumbs on desktop (≥820, WebGL2, not weak). Mobile stays plain `<img>`. Show thumbs use per-host small canvases (cheap at 60px). Self-downgrade guard still applies to the hero layer.
- **Native scroll only (v5 A2).** Smooth-scroll library removed after lag reports. Velocity for reactive type / develop is a rolling `scrollY` delta on rAF. `scroll-behavior: smooth` kept for anchor jumps.
- **City/time readout (v5 A1):** one `position:fixed` top-left instance; never trails the cursor. Footer clock is always **KAUNAS** (home base), independent of scroll city.
- **WebGL context strategy:** one canvas per develop host (hero + each visible show thumb). Fine at current show count; revisit if a tour list grows huge.
- **Self-downgrade guard (intended, not a bug):** develop layer disposes if `hardwareConcurrency<=4 || deviceMemory<=4 || !WebGL2`, or if the mean of the first 90 frames >20ms. On dispose the plain `<img>` stands. rAF stops after 400ms idle (a static page draws zero frames); it also stops on tab-hide.
- **SplitText not used.** v2 §B2 asked for SplitText on the entry's tracking close; a plain `letter-spacing` tween achieves the identical effect with zero extra library bytes, so SplitText was dropped. GSAP Flip is used (release expand + show artwork expand). ScrollTrigger is used (marginalia).
- **B7 forbidden-kit exceptions used:** none.
- **Mixes facade needs per-video IDs.** The click-to-load facade (v4 default *a*) is wired, but no YouTube video IDs were supplied — so a click currently opens the YouTube channel (effectively behaviour *b*). Add video IDs to a data file and flip `channelToEmbed()` in `embeds.js` to inject the iframe in place.
- **Email field added to the booking form.** The brief listed name/organisation/date/city/message, but an auto-reply to the sender needs their address — so a required Email field was added. Flagging as a deliberate addition.
- **Fonts:** three self-hosted woff2 (Archivo roman + Archivo italic + JetBrains Mono 400), subset to Latin + Latin-Ext-A, axes trimmed (Archivo wght 700–900 / wdth 100–125). The brief's "two files" was one; Archivo's italics are a separate face, hence three. Zero-CLS metric-matched fallbacks in `base.css`.

## Image inventory
| Source (`design/source/`) | Used as | Generated (`public/img/gen/`) | Status |
|---|---|---|---|
| IMG_4044.jpg (3264×2448) | Hero, OG, mix-3 thumb | hero-{640,960,1600,2560}.\*, og.jpg | real, full-res (v5 A3) |
| portrait-dj-river_660x1275.jpg | Press portrait, mix-1 thumb | portrait-{480,660}.\*, mix-1-\* | real |
| live-decksandstories_1241x931.jpg | Press live, mix-2 thumb | live-{640,1000,1241}.\*, mix-2-\* | real |
| shows/{venue-slug}.jpg | Show row thumbs | show-{slug}-{64,128,256}.\* | **none yet** — see checklist |
| — (generated) | Release covers ×3 | cover-{id}-{400,800,1200}.\* | **placeholder** (abstract monochrome) |
| — (generated) | Grain overlay | grain.webp | ok |
| — (generated) | Blue-noise dither | bluenoise.png (void-and-cluster) | ok |

## Verified this build
- Builds clean (`npm run build`), no console errors. CSS 4.06KB gz, initial JS ~3.2KB gz; heavy libs code-split, desktop-only.
- Complete with **JavaScript disabled** (5 shows, 3 releases, 7 inline margin notes, booking mailto, no age) — reviewed as a design.
- Complete under **prefers-reduced-motion** (clean hero, no entry, inline marginalia) — reviewed as a design.
- Mobile 375px: hero fills, MUSIC clean, sticky ticker swaps notes; no animation libraries downloaded.
- Desktop 1440: entry → developing hero, marginalia scrub in the gutters, reactive-width headings.
- Grep gates pass: no `gmail / 23-year / 247,252 / 250,000 / <audio> / jaksamitauskas` in `dist/`; `bookings@aksendo.com` is the only address.
- `grep -ri lenis src/` → empty (v5 A2).

## Still to verify before "done"
- Lighthouse mobile ≥92 / desktop ≥88 (run against `wrangler dev` or a deploy).
- Real-device 55fps scroll check on the developing hero.
- Cross-browser: iOS Safari (100svh + smooth scroll), Firefox.
- 200% zoom / 320px.
