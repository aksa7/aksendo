// scroll.js — native scroll + velocity bus + GSAP ScrollTrigger.
// Smooth-scroll library removed (v5 A2): it read as lag. ScrubTrigger reads native scroll.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { setScroll } from './bus.js';

gsap.registerPlugin(ScrollTrigger);

export function initScroll() {
  let prevY = window.scrollY || window.pageYOffset || 0;
  let prevT = performance.now();

  // Rolling scrollY delta → velocity (same bus consumers as before: type, develop).
  function sample(now) {
    const y = window.scrollY || window.pageYOffset || 0;
    const dt = Math.max(now - prevT, 1);
    // Scale to ~px-per-frame units for the velocity bus normalisation.
    const velocity = ((y - prevY) / dt) * 16.67;
    prevY = y;
    prevT = now;
    setScroll({ scroll: y, velocity });
    requestAnimationFrame(sample);
  }
  requestAnimationFrame(sample);

  // Native scroll drives ScrollTrigger; refresh on resize only.
  ScrollTrigger.config({ ignoreMobileResize: true });
  window.addEventListener('resize', () => ScrollTrigger.refresh(), { passive: true });

  // Anchor jumps use CSS scroll-behavior: smooth — no JS hijack.
  return { gsap, ScrollTrigger };
}
