// signal.js — FRAMEHAUS scanline fit + slow puzzle + slow manifesto typewriter.
export function initSignal() {
  const section = document.querySelector('#signal');
  const stack = section?.querySelector('.signal__stack');
  const mid = stack?.querySelector('[data-signal-mid]');
  const typeEl = section?.querySelector('[data-signal-type]');
  if (!section || !stack || !mid) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const fit = () => {
    const board = section.querySelector('.signal__board');
    const avail = Math.min(
      (board?.clientWidth || window.innerWidth) * 0.94,
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
  };

  const runFit = () => requestAnimationFrame(() => requestAnimationFrame(fit));
  runFit();
  window.addEventListener('resize', runFit, { passive: true });
  if (document.fonts?.ready) document.fonts.ready.then(runFit);

  const typeManifesto = () => {
    if (!typeEl) return;
    const full = typeEl.getAttribute('data-signal-type') || '';
    if (!full) return;
    if (reduced) {
      typeEl.textContent = full;
      return;
    }
    typeEl.textContent = '';
    typeEl.classList.add('is-typing');
    let i = 0;
    const step = () => {
      i += 1;
      typeEl.textContent = full.slice(0, i);
      if (i < full.length) {
        const ch = full[i - 1];
        const delay = ch === ' ' ? 72 : 42 + Math.random() * 28;
        setTimeout(step, delay);
      }
      // keep blinking caret after the line is done
    };
    setTimeout(step, 1600);
  };

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    section.classList.add('is-inview');
    typeManifesto();
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
