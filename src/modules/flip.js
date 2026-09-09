// flip.js — one shared-element interaction: expand a release in place with Flip.
import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';

gsap.registerPlugin(Flip);

export function initFlip() {
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
