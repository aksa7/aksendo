// type.js — subtle reactive width on Archivo display type only.
// Bernoru (brand) has no wdth axis — skipped. Amplitude kept tiny (v5 feedback).
import { bus } from './bus.js';

export function initReactiveType() {
  // Only Archivo elements that still expose wdth — not Bernoru brand faces.
  const els = [...document.querySelectorAll('.show__venue')];
  if (!els.length) return;

  const REST = 112, FAST = 108; // was 125→100 — barely perceptible now
  let current = REST;
  let visible = new Set();

  const io = new IntersectionObserver((entries) => {
    for (const en of entries) en.isIntersecting ? visible.add(en.target) : visible.delete(en.target);
  }, { rootMargin: '0px' });
  els.forEach((el) => io.observe(el));

  function frame() {
    const target = REST - (REST - FAST) * Math.min(bus.velocity, 1);
    current += (target - current) * 0.08;
    const v = current.toFixed(1);
    visible.forEach((el) => {
      el.style.fontVariationSettings = `"wght" 800, "wdth" ${v}`;
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
