// flip.js — one shared-element interaction family:
// 1) Release expand (cover + title)
// 2) Show-row artwork expand (thumb → larger art beside detail) — v5 Part C
import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';

gsap.registerPlugin(Flip);

export function initFlip() {
  initReleaseFlip();
  initShowArtFlip();
}

function initReleaseFlip() {
  const releases = [...document.querySelectorAll('.release')];
  releases.forEach((el) => {
    const title = el.querySelector('.release__title');
    if (!title) return;
    title.setAttribute('role', 'button');
    title.setAttribute('tabindex', '0');
    title.setAttribute('aria-expanded', 'false');
    const toggle = () => {
      const state = Flip.getState(el, { props: 'gridTemplateColumns' });
      const open = el.classList.toggle('is-expanded');
      title.setAttribute('aria-expanded', String(open));
      el.style.gridTemplateColumns = open ? '220px 1fr' : '';
      Flip.from(state, { duration: 0.5, ease: 'power3.inOut', absolute: false });
    };
    title.addEventListener('click', toggle);
    title.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });
}

function initShowArtFlip() {
  const rows = [...document.querySelectorAll('.show--art')];
  rows.forEach((el) => {
    const art = el.querySelector('.show__art');
    if (!art) return;
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-expanded', 'false');

    const toggle = (e) => {
      // Don't steal ticket link clicks
      if (e.target.closest?.('a')) return;
      const targets = [el, art];
      const state = Flip.getState(targets);
      const open = el.classList.toggle('is-expanded');
      el.setAttribute('aria-expanded', String(open));
      Flip.from(state, { duration: 0.55, ease: 'power3.inOut', absolute: false });
    };

    el.addEventListener('click', toggle);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(e); }
    });
  });
}
