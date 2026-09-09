// cursor.js — fixed top-left city/time readout.
// One instance, never follows the pointer. City tracks the next upcoming show
// relative to scroll (show nearest viewport middle), then holds its last value.
// Hidden while the hero is dominant so it doesn't read as branding next to AKSENDO.
import { nextShow, cityTime, partition } from './clock.js';

export function initCursorClock() {
  const el = document.querySelector('[data-cursor-clock]');
  if (!el) return;
  document.body.classList.add('has-cursor-clock');

  let city = (nextShow() || {}).city || 'Vilnius';

  const rows = [...document.querySelectorAll('.show[data-date]')];
  const up = partition().upcoming;
  rows.forEach((r) => {
    const venue = r.querySelector('.show__venue')?.textContent?.trim();
    const match =
      up.find((x) => x.date === r.dataset.date && x.venue === venue) ||
      up.find((x) => x.date === r.dataset.date);
    if (match) r.dataset.city = match.city;
  });

  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting && en.target.dataset.city) city = en.target.dataset.city;
    }
  }, { rootMargin: '-45% 0px -45% 0px' });
  rows.forEach((r) => io.observe(r));

  const tick = () => { el.textContent = `${city.toUpperCase()}  ${cityTime(city)}`; };
  tick();
  setInterval(tick, 1000);

  const hero = document.querySelector('.hero');
  if (hero) {
    const heroIo = new IntersectionObserver((entries) => {
      for (const en of entries) {
        document.body.classList.toggle('is-hero', en.isIntersecting && en.intersectionRatio > 0.35);
      }
    }, { threshold: [0, 0.35, 0.7] });
    heroIo.observe(hero);
    if (hero.getBoundingClientRect().bottom > window.innerHeight * 0.35) {
      document.body.classList.add('is-hero');
    }
  }
}
