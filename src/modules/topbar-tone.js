// topbar-tone.js — mobile only: BOOKINGS reads black on light sections,
// white on dark. Replaces mix-blend-mode:difference which turns mid-grey
// on photographic greys and disappears.
export function initTopbarTone() {
  if (window.matchMedia('(min-width: 820px)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // still need readable contrast even with reduced motion
  }

  const topbar = document.querySelector('[data-topbar]');
  if (!topbar) return;

  const map = [
    ['.hero', 'dark'],
    ['#shows', 'light'],
    ['#music', 'light'],
    ['#signal', 'light'],
    ['.signal__board', 'dark'],
    ['#mixes', 'light'],
    ['#bio', 'light'],
    ['#contact', 'light'],
    ['.site-foot', 'light']
  ];

  for (const [sel, tone] of map) {
    document.querySelectorAll(sel).forEach((el) => {
      el.setAttribute('data-nav-tone', tone);
    });
  }

  const probeX = () => Math.min(window.innerWidth - 24, window.innerWidth * 0.92);
  const probeY = () => 22;

  let raf = 0;
  const apply = () => {
    raf = 0;
    let tone = 'dark';
    try {
      const stack = document.elementsFromPoint(probeX(), probeY());
      for (const node of stack) {
        if (!(node instanceof Element)) continue;
        if (node.closest?.('[data-topbar]')) continue;
        const hit = node.closest?.('[data-nav-tone]');
        if (hit) {
          tone = hit.getAttribute('data-nav-tone') || 'dark';
          break;
        }
      }
    } catch { /* */ }
    if (topbar.dataset.tone !== tone) topbar.dataset.tone = tone;
  };

  const schedule = () => {
    if (raf) return;
    raf = requestAnimationFrame(apply);
  };

  apply();
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) apply(); });
}
