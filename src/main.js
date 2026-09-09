// main.js — progressive enhancement entry point.
// Baseline (this file only) is tiny and runs everywhere. Heavy motion libraries
// (GSAP, OGL) are dynamically imported only on capable desktops.
import { reducedMotion, isDesktop, weakDevice, hasWebGL2 } from './modules/capabilities.js';
import { initForm } from './modules/form.js';
import { initMixes } from './modules/embeds.js';
import { initClockFallback } from './modules/clock.js';
import { initEvolvingLine } from './modules/evolving.js';

const html = document.documentElement;
html.classList.remove('no-js');

// year
document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = String(new Date().getFullYear())));

// universal light enhancements
initForm();
initMixes();
initClockFallback();
initEvolvingLine();

const reduced = reducedMotion();
if (reduced) html.classList.add('reduced');

// ---- motion gate ----
if (!reduced && isDesktop()) {
  bootDesktop();
} else if (!reduced && !isDesktop()) {
  // mobile: ticker only, no libraries
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

  // marginalia (desktop scrub) + flip
  const { initMarginaliaDesktop } = await import('./modules/marginalia.js');
  initMarginaliaDesktop();
  import('./modules/flip.js').then((m) => m.initFlip());

  // cursor clock removed — was colliding with branding / confusing as "Amsterdam" label

  // developing hero + show artwork + entry, guarded by hardware
  let hero = null;
  if (hasWebGL2() && !weakDevice()) {
    const { initDevelopHero, initDevelopShowArt } = await import('./modules/develop.js');
    hero = initDevelopHero();
    initDevelopShowArt();
    frameProbe(hero);           // live self-downgrade
  }

  const { runEntry } = await import('./modules/entry.js');
  runEntry({ onReveal: () => hero?.reveal?.() });
  if (!hero) {/* plain hero photo stands */}
}

// Sample ~90 frames after the WebGL layer activates; if the page can't hold
// frame time, dispose the developing layer and let the plain photo stand.
function frameProbe(hero) {
  if (!hero || !hero.reveal) return;
  let n = 0, sum = 0, last = performance.now();
  function step(t) {
    const dt = t - last; last = t;
    if (dt > 0 && dt < 200) { sum += dt; n++; }
    if (n < 90) { requestAnimationFrame(step); return; }
    const mean = sum / n;
    if (mean > 20) { hero.dispose?.(); /* known behaviour, see NOTES */ }
  }
  requestAnimationFrame(step);
}
