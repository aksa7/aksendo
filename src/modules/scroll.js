// scroll.js — Lenis smooth scroll wired to GSAP ScrollTrigger + the velocity bus.
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { setScroll } from './bus.js';

gsap.registerPlugin(ScrollTrigger);

let lenis;

export function initScroll() {
  lenis = new Lenis({ lerp: 0.08, wheelMultiplier: 1, smoothWheel: true });

  lenis.on('scroll', (e) => {
    setScroll({ scroll: e.scroll, velocity: e.velocity });
    ScrollTrigger.update();
  });

  // drive Lenis from GSAP's ticker so everything shares one rAF
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // anchor links go through Lenis
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const t = document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      lenis.scrollTo(t, { offset: 0 });
    });
  });

  return { lenis, gsap, ScrollTrigger };
}

export function getLenis() { return lenis; }
