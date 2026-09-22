// main.js — progressive enhancement entry point.
// Baseline (this file only) is tiny and runs everywhere. Heavy motion libraries
// (GSAP, OGL) are dynamically imported only on capable desktops.
import { reducedMotion, isDesktop, weakDevice, hasWebGL2 } from './modules/capabilities.js';
import { setHeroDevelop } from './modules/bus.js';
import { initForm } from './modules/form.js';
import { initMixes } from './modules/embeds.js';
import { initClockFallback } from './modules/clock.js';
import { initEvolvingLine } from './modules/evolving.js';

const html = document.documentElement;
// Head boot may already have swapped no-js → js; keep idempotent.
html.classList.remove('no-js');
if (!html.classList.contains('js')) html.classList.add('js');

// year
document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = String(new Date().getFullYear())));

// universal light enhancements
initForm();
initMixes();
initClockFallback();
initEvolvingLine();
import('./modules/signal.js').then((m) => m.initSignal());
import('./modules/topbar-tone.js').then((m) => m.initTopbarTone());

const reduced = reducedMotion();
if (reduced) html.classList.add('reduced');

// Entry runs for all motion-ok clients (desktop + mobile). Overlay was already
// shown/skipped by the synchronous <head> script — this only animates or settles.
// Hero dither progress is driven by entry → bus.heroDevelop (not a post-entry jump).
let entryDone = !html.classList.contains('show-intro');
let heroRef = null;

if (entryDone || reduced) setHeroDevelop(1);

if (!reduced) {
  import('./modules/entry.js').then((m) => {
    m.runEntry({
      onReveal: () => {
        entryDone = true;
        setHeroDevelop(1);
        heroRef?.kick?.();
      }
    });
  });
} else {
  entryDone = true;
  // Ensure overlay gone if head somehow left show-intro under reduced
  html.classList.remove('show-intro');
  html.classList.add('skip-intro');
  document.getElementById('entry-overlay')?.remove();
}

// ---- motion gate ----
if (!reduced && isDesktop()) {
  bootDesktop();
} else if (!reduced && !isDesktop()) {
  import('./modules/ticker.js').then((m) => m.initTicker());
}

async function bootDesktop() {
  const [{ initScroll }, { initReactiveType }, { initGrain }] = await Promise.all([
    import('./modules/scroll.js'),
    import('./modules/type.js'),
    import('./modules/grain.js')
  ]);

  initScroll();
  initReactiveType();
  initGrain();

  const { initMarginaliaDesktop } = await import('./modules/marginalia.js');
  initMarginaliaDesktop();
  import('./modules/flip.js').then((m) => m.initFlip());

  if (hasWebGL2() && !weakDevice()) {
    const { initDevelopHero, initDevelopShowArt } = await import('./modules/develop.js');
    heroRef = initDevelopHero();
    initDevelopShowArt();
    frameProbe(heroRef);
    // Sync to current entry progress (may be mid-sequence or already done)
    heroRef?.kick?.();
  }
}

function frameProbe(hero) {
  if (!hero || !hero.reveal) return;
  let n = 0, sum = 0, last = performance.now();
  function step(t) {
    const dt = t - last; last = t;
    if (dt > 0 && dt < 200) { sum += dt; n++; }
    if (n < 90) { requestAnimationFrame(step); return; }
    const mean = sum / n;
    if (mean > 20) { hero.dispose?.(); }
  }
  requestAnimationFrame(step);
}
