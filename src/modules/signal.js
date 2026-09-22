// signal.js — FRAMEHAUS scanline fit + puzzle + manifesto typewriter.
// Shared helpers also drive the entry overlay intro.

export const SIGNAL_PUZZLE_MS = 2050;
export const SIGNAL_PUZZLE_STAGGER_MS = 210;

export function puzzleEndMs(bandCount = 7) {
  return SIGNAL_PUZZLE_MS + Math.max(0, bandCount - 1) * SIGNAL_PUZZLE_STAGGER_MS;
}

export function fitSignalStack(section) {
  const stack = section?.querySelector('.signal__stack');
  const mid = stack?.querySelector('[data-signal-mid]');
  const board = section?.querySelector('.signal__board');
  if (!stack || !mid) return;

  const avail = Math.min(
    (board?.clientWidth || section.clientWidth || window.innerWidth) * 0.94,
    window.innerWidth * 0.94
  );
  if (avail < 40) return;

  stack.style.setProperty('--signal-size', '100px');
  const at100 = Math.max(mid.scrollWidth, 1);
  let size = (100 * avail * 0.985) / at100;
  size = Math.max(28, Math.min(size, Math.min(avail * 0.5, 240)));
  stack.style.setProperty('--signal-size', `${size.toFixed(2)}px`);

  let guard = 24;
  while (mid.scrollWidth > avail * 0.995 && size > 28 && guard--) {
    size *= 0.978;
    stack.style.setProperty('--signal-size', `${size.toFixed(2)}px`);
  }
}

/** Type the manifesto; returns a Promise that resolves when the line is complete. */
export function typeManifesto(typeEl, { startDelay = 1600, reduced = false } = {}) {
  if (!typeEl) return Promise.resolve();
  const full = typeEl.getAttribute('data-signal-type')
    || typeEl.getAttribute('data-entry-type')
    || '';
  if (!full) return Promise.resolve();

  if (reduced) {
    typeEl.textContent = full;
    typeEl.classList.remove('is-typing');
    return Promise.resolve();
  }

  typeEl.textContent = '';
  typeEl.classList.add('is-typing');

  return new Promise((resolve) => {
    let i = 0;
    let timer = 0;
    const step = () => {
      i += 1;
      typeEl.textContent = full.slice(0, i);
      if (i < full.length) {
        const ch = full[i - 1];
        const delay = ch === ' ' ? 72 : 42 + Math.random() * 28;
        timer = setTimeout(step, delay);
      } else {
        resolve();
      }
    };
    timer = setTimeout(step, startDelay);
    typeEl._cancelType = () => {
      clearTimeout(timer);
      typeEl.textContent = full;
      resolve();
    };
  });
}

export function initSignal() {
  const section = document.querySelector('#signal');
  const stack = section?.querySelector('.signal__stack');
  const mid = stack?.querySelector('[data-signal-mid]');
  const typeEl = section?.querySelector('[data-signal-type]');
  if (!section || !stack || !mid) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const runFit = () => requestAnimationFrame(() => requestAnimationFrame(() => fitSignalStack(section)));
  runFit();
  window.addEventListener('resize', runFit, { passive: true });
  if (document.fonts?.ready) document.fonts.ready.then(runFit);

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    section.classList.add('is-inview');
    typeManifesto(typeEl, { startDelay: 1600, reduced });
  };

  if (reduced) {
    section.classList.add('is-inview');
    if (typeEl) typeEl.textContent = typeEl.getAttribute('data-signal-type') || '';
    return;
  }

  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) {
        start();
        io.disconnect();
      }
    }
  }, { threshold: 0.28 });
  io.observe(section);
}
