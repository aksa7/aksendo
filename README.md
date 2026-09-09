# aksendo.com

Official artist site for **aksendo** — DJ / producer, Kaunas, Lithuania.
Vite (vanilla) · plain CSS · vanilla ES modules · Cloudflare Workers.

## Develop
```bash
npm install
npm run dev        # regenerates images + HTML, then serves
```

## Build & deploy
```bash
npm run build      # images → HTML/SEO → vite build → dist/
npx wrangler deploy
```
Set the email secret once: `wrangler secret put RESEND_API_KEY`.

## The only files you edit for content
- `src/data/shows.json` — add a gig. Past dates auto-move to "Played" (Europe/Vilnius).
- `src/data/releases.json` — releases, links, stream count (`streams.as_of` keeps it honest).
- `src/data/links.json` — platform + label URLs. `null` renders as nothing.
- `src/data/site.json` — booking address, bio, meta, genres.

Everything on the page (shows, JSON-LD `Event`s, sitemap) is generated from these at
build time by `scripts/gen-html.mjs`, so the site is complete with JavaScript disabled.

## Structure
```
src/styles/     tokens.css (design values) · base.css · sections/*.css
src/modules/    scroll, develop (WebGL hero), marginalia, ticker, type, grain,
                cursor, entry, flip, embeds, form, clock, capabilities, bus
scripts/        build-images.mjs (AVIF/WebP/JPEG + covers + OG + noise) · gen-html.mjs
worker/         index.js (asset serving + cache headers + /api/booking)
```

Motion is opt-in by capability: reduced-motion and mobile ship no animation library;
the developing hero disposes itself on weak hardware. See `NOTES.md`.
