// marginalia.js — printer's-margin notes.
// Desktop: lift each note into a sticky gutter, scrub it in/out with its anchor.
// Mobile: a single bottom ticker that swaps at section boundaries.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const ANCHORS = {
  streams: '#release-pico-de-amor',
  appearances: '.appearances',
  zamna: '#release-pico-de-amor',
  road: '#release-berlin-to-ade',
  cyprus: '#release-temporary-miracle',
  kaunas: '[data-bio="1"]',
  live: '[data-bio="3"]'
};

export function initMarginaliaDesktop() {
  const main = document.getElementById('main');
  const notes = [...document.querySelectorAll('.margin')];
  if (!main || !notes.length) return;

  // enough side room only on wide viewports; below 1100 leave notes inline in flow
  if (window.innerWidth < 1100) return;

  document.body.classList.add('motion');
  main.style.position = 'relative';

  const gutters = document.createElement('div');
  gutters.className = 'gutters';
  gutters.setAttribute('aria-hidden', 'true');
  main.appendChild(gutters);

  // alternate sides strictly in DOM order (ping-pong), overriding data-side ties
  let flip = true;
  const placed = notes.map((note) => {
    const id = note.dataset.margin;
    const anchorSel = ANCHORS[id];
    const anchor = anchorSel && document.querySelector(anchorSel);
    if (!anchor) { note.remove(); return null; }
    const side = (flip = !flip) ? 'L' : 'R';
    note.setAttribute('aria-hidden', 'true');
    gutters.appendChild(note);
    return { note, anchor, side };
  }).filter(Boolean);

  const GAP = 28, EDGE = 20;
  function layout() {
    const mainTop = main.getBoundingClientRect().top + window.scrollY;
    const vw = window.innerWidth;
    placed.forEach(({ note, anchor, side }) => {
      const r = anchor.getBoundingClientRect();
      const top = r.top + window.scrollY - mainTop + Math.min(r.height / 2, 90);
      note.style.top = `${top}px`;
      if (side === 'L') {
        const avail = r.left - EDGE - GAP;
        note.style.right = `${vw - r.left + GAP}px`;
        note.style.left = 'auto';
        note.style.textAlign = 'right';
        note.style.width = `${Math.min(Math.max(avail, 60), 240)}px`;
        note.hidden = avail < 90;
      } else {
        const avail = vw - r.right - EDGE - GAP;
        note.style.left = `${r.right + GAP}px`;
        note.style.right = 'auto';
        note.style.textAlign = 'left';
        note.style.width = `${Math.min(Math.max(avail, 60), 240)}px`;
        note.hidden = avail < 90;
      }
    });
    ScrollTrigger.refresh();
  }

  placed.forEach(({ note, anchor, side }) => {
    // v5 E — louder edge-slide (was ±40)
    const from = side === 'L' ? -88 : 88;
    gsap.set(note, { x: from, autoAlpha: 0 });
    const tl = gsap.timeline({
      scrollTrigger: { trigger: anchor, start: 'top 88%', end: 'bottom 28%', scrub: 0.45 }
    });
    tl.to(note, { x: 0, autoAlpha: 1, duration: 0.28, ease: 'power2.out' })
      .to(note, { x: 0, autoAlpha: 1, duration: 0.44 })
      .to(note, { x: from, autoAlpha: 0, duration: 0.28, ease: 'power2.in' });
  });

  // fonts can shift metrics; lay out after load + on resize
  layout();
  window.addEventListener('load', layout);
  if (document.fonts?.ready) document.fonts.ready.then(layout);
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 150); });
}

// (mobile ticker lives in ticker.js — no GSAP dependency there)
