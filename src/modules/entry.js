// entry.js — Signal/scanline intro: puzzle + manifesto, then the site turns on.
// No FLIP. Skip (scroll / click / key) jumps instantly to the resting page.
import { setHeroDevelop } from './bus.js';
import { fitSignalStack, typeManifesto, puzzleEndMs } from './signal.js';

const KEY = 'aksendo:entry-seen';
const TIME_SCALE = 1;

const HOLD_MS = Math.round(480 * TIME_SCALE);
const FADE_MS = Math.round(900 * TIME_SCALE);
const TYPE_START_MS = Math.round(1400 * TIME_SCALE);
const EASE_FADE = 'cubic-bezier(0.4, 0, 0.2, 1)';
const EASE_DEVELOP = 'cubic-bezier(0.55, 0, 0.85, 0.35)';

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function tweenProgress({ duration, easing, onUpdate }) {
  const probe = document.createElement('div');
  Object.assign(probe.style, {
    position: 'fixed', left: '0', top: '0', width: '1px', height: '1px',
    opacity: '0', pointerEvents: 'none', zIndex: '-1'
  });
  document.documentElement.appendChild(probe);
  const anim = probe.animate(
    [{ opacity: 0 }, { opacity: 1 }],
    { duration, easing, fill: 'forwards' }
  );
  let raf = 0;
  let stopped = false;
  const pump = () => {
    if (stopped) return;
    onUpdate(Number(getComputedStyle(probe).opacity) || 0);
    if (anim.playState === 'finished') {
      onUpdate(1);
      cleanup();
      return;
    }
    raf = requestAnimationFrame(pump);
  };
  const cleanup = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    try { anim.cancel(); } catch { /* */ }
    probe.remove();
  };
  raf = requestAnimationFrame(pump);
  return {
    finished: anim.finished.then(() => { onUpdate(1); cleanup(); }).catch(() => cleanup()),
    cancel: cleanup
  };
}

export function runEntry({ onReveal } = {}) {
  const html = document.documentElement;
  const entry = document.getElementById('entry-overlay');
  const stage = entry?.querySelector('[data-entry-signal]');
  const typeEl = entry?.querySelector('[data-entry-type]');
  const skipHint = entry?.querySelector('.entry__skip');
  const heroWord = document.querySelector('[data-wordmark]');

  if (!html.classList.contains('show-intro') || !entry || !stage) {
    entry?.remove();
    html.classList.remove('show-intro');
    html.classList.add('skip-intro');
    setHeroDevelop(1);
    onReveal?.();
    return;
  }

  let done = false;
  let developTween = null;
  let fadeAnim = null;
  const bandCount = stage.querySelectorAll('.signal__band').length || 7;

  const removeSkips = () => {
    window.removeEventListener('wheel', skipNow, { capture: true });
    window.removeEventListener('touchstart', skipNow, { capture: true });
    window.removeEventListener('keydown', skipNow, { capture: true });
    window.removeEventListener('pointerdown', skipNow, { capture: true });
  };

  function settle(markSeen) {
    html.classList.remove('show-intro');
    html.classList.add('skip-intro');
    if (heroWord) heroWord.style.visibility = '';
    if (entry) {
      entry.style.display = 'none';
      entry.setAttribute('aria-hidden', 'true');
      entry.remove();
    }
    if (markSeen) {
      try { sessionStorage.setItem(KEY, '1'); } catch { /* private mode */ }
    }
  }

  function finish(instant = false) {
    if (done) return;
    done = true;
    removeSkips();
    try { typeEl?._cancelType?.(); } catch { /* */ }
    developTween?.cancel();
    try { fadeAnim?.cancel(); } catch { /* */ }
    setHeroDevelop(1);
    settle(true);
    onReveal?.();
  }

  function skipNow(e) {
    if (e && e.cancelable) e.preventDefault();
    if (e) e.stopPropagation();
    finish(true);
  }

  window.addEventListener('wheel', skipNow, { passive: true, capture: true });
  window.addEventListener('touchstart', skipNow, { passive: true, capture: true });
  window.addEventListener('keydown', skipNow, { capture: true });
  window.addEventListener('pointerdown', skipNow, { capture: true });

  const play = async () => {
    try {
      if (document.fonts?.ready) await document.fonts.ready;
    } catch { /* */ }
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    if (done) return;

    setHeroDevelop(0);
    fitSignalStack(stage);
    window.addEventListener('resize', () => fitSignalStack(stage), { passive: true });

    // Scanline puzzle
    stage.classList.add('is-inview');

    if (skipHint) {
      skipHint.animate(
        [{ opacity: 0.55 }, { opacity: 0 }],
        { duration: 700, delay: 900, easing: 'ease', fill: 'forwards' }
      );
    }

    const puzzleDone = wait(puzzleEndMs(bandCount) * TIME_SCALE);
    const typed = typeManifesto(typeEl, {
      startDelay: TYPE_START_MS,
      reduced: false
    });

    // Site stays black until both the scan and the line are finished
    await Promise.all([puzzleDone, typed]);
    if (done) return;

    await wait(HOLD_MS);
    if (done) return;

    // Soft handoff: fade the black stage while the photo develops underneath
    developTween = tweenProgress({
      duration: FADE_MS,
      easing: EASE_DEVELOP,
      onUpdate: setHeroDevelop
    });

    fadeAnim = entry.animate(
      [
        { opacity: 1 },
        { opacity: 0 }
      ],
      { duration: FADE_MS, easing: EASE_FADE, fill: 'forwards' }
    );

    try {
      await Promise.all([fadeAnim.finished, developTween.finished]);
    } catch { /* cancelled by skip */ }
    if (done) return;
    finish(false);
  };

  play();

  // Hard cap — never trap (puzzle + type + hold + fade + buffer)
  const cap = puzzleEndMs(bandCount) * TIME_SCALE + 4500 * TIME_SCALE + HOLD_MS + FADE_MS;
  setTimeout(() => finish(true), cap);
}
