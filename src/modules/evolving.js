// evolving.js — one-shot type-in for the bio "improving every day" line.
export function initEvolvingLine() {
  const el = document.querySelector('[data-evolving]');
  if (!el) return;
  const full = el.dataset.evolving || el.textContent || '';
  if (!full) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    el.textContent = full;
    el.classList.add('is-shown');
    return;
  }

  el.textContent = '';
  el.setAttribute('aria-label', full);

  let started = false;
  const run = () => {
    if (started) return;
    started = true;
    el.classList.add('is-shown');
    let i = 0;
    const step = () => {
      i += 1;
      el.textContent = full.slice(0, i);
      if (i < full.length) {
        const delay = full[i - 1] === ' ' ? 28 : 18 + Math.random() * 22;
        setTimeout(step, delay);
      }
    };
    step();
  };

  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { run(); io.disconnect(); }
  }, { threshold: 0.55 });
  io.observe(el);
}
