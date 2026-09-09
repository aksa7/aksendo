// type.js — reactive variable width: headings compress with scroll velocity,
// relax back to wide at rest. Lerped, applied only to elements in view.
import { bus } from './bus.js';

export function initReactiveType() {
  const els = [...document.querySelectorAll('[data-wordmark], .section-head, .contact__book, .pull')];
  if (!els.length) return;

  const REST = 125, FAST = 100;
  let current = REST;
  let visible = new Set();

  const io = new IntersectionObserver((entries) => {
    for (const en of entries) en.isIntersecting ? visible.add(en.target) : visible.delete(en.target);
  }, { rootMargin: '0px' });
  els.forEach((el) => io.observe(el));

  function frame() {
    const target = REST - (REST - FAST) * bus.velocity;
    current += (target - current) * 0.12;
    const v = current.toFixed(1);
    visible.forEach((el) => {
      const light = el.classList.contains('pull') || el.classList.contains('contact__book');
      el.style.fontVariationSettings = `"wght" ${light ? 800 : 900}, "wdth" ${v}`;
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
