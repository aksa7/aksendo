// cursor.js — a thin readout trailing the cursor: local time in the next show's city.
// Desktop / fine-pointer only. City follows the shows section into view.
import { nextShow, cityTime, partition } from './clock.js';

export function initCursorClock() {
  const el = document.querySelector('[data-cursor-clock]');
  if (!el) return;
  document.body.classList.add('has-cursor-clock');

  let city = (nextShow() || {}).city || 'VILNIUS';
  // as the shows scroll, point the clock at the show nearest the viewport middle
  const rows = [...document.querySelectorAll('.show[data-date]')];
  const up = partition().upcoming;
  rows.forEach((r) => {
    const s = up.find((x) => x.date === r.dataset.date);
    if (s) r.dataset.city = s.city;
  });
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting && en.target.dataset.city) city = en.target.dataset.city;
  }, { rootMargin: '-45% 0px -45% 0px' });
  rows.forEach((r) => io.observe(r));

  let tx = -100, ty = -100, mx = -100, my = -100;
  window.addEventListener('pointermove', (e) => { mx = e.clientX + 16; my = e.clientY + 18; }, { passive: true });

  function frame() {
    tx += (mx - tx) * 0.14;
    ty += (my - ty) * 0.14;
    el.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0)`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  const tick = () => { el.textContent = `${city.toUpperCase()}  ${cityTime(city)}`; };
  tick();
  setInterval(tick, 1000);
}
