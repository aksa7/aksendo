// entry.js — one orchestrated moment: wordmark tracking closes, hero develops,
// page rests. Once per session. Skippable by any scroll/click/key.
import { gsap } from 'gsap';

const KEY = 'aksendo:entry-seen';

export function runEntry({ onReveal } = {}) {
  const entry = document.querySelector('.entry');
  if (!entry) { onReveal?.(); return; }

  let seen = false;
  try { seen = sessionStorage.getItem(KEY) === '1'; } catch {}
  if (seen) { entry.hidden = true; onReveal?.(); return; }

  entry.hidden = false;
  const word = entry.querySelector('.entry__word');
  let done = false;

  const finish = () => {
    if (done) return; done = true;
    try { sessionStorage.setItem(KEY, '1'); } catch {}
    gsap.killTweensOf(word);
    gsap.to(entry, {
      opacity: 0, duration: 0.5, ease: 'power2.out',
      onComplete: () => { entry.hidden = true; entry.style.opacity = ''; }
    });
    onReveal?.();
    removeSkips();
  };

  const skip = () => finish();
  const removeSkips = () => {
    window.removeEventListener('wheel', skip);
    window.removeEventListener('touchstart', skip);
    window.removeEventListener('keydown', skip);
    window.removeEventListener('pointerdown', skip);
  };
  window.addEventListener('wheel', skip, { passive: true, once: true });
  window.addEventListener('touchstart', skip, { passive: true, once: true });
  window.addEventListener('keydown', skip, { once: true });
  window.addEventListener('pointerdown', skip, { once: true });

  const tl = gsap.timeline({ defaults: { ease: 'cubic-bezier(0.16,1,0.3,1)' } });
  tl.fromTo(word,
    { letterSpacing: '0.5em', opacity: 0, filter: 'none' },
    { letterSpacing: '-0.04em', opacity: 1, duration: 0.9, ease: 'power4.out' }
  )
  .to(word, { yPercent: -6, duration: 0.35 }, '-=0.15')
  .add(() => finish(), '+=0.15');

  // hard cap: never trap the user
  gsap.delayedCall(1.5, finish);
}
