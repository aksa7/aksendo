// ticker.js — mobile marginalia: sticky bottom line.
// Maps the active release (or section) so notes stay track-accurate.
export function initTicker() {
  const ticker = document.querySelector('[data-ticker]');
  const notes = [...document.querySelectorAll('.margin')];
  if (!ticker || !notes.length) return;

  const textOf = (id) => {
    const n = notes.find((x) => x.dataset.margin === id);
    return n ? n.innerHTML : '';
  };

  // Prefer release-level anchors when a track is in view
  const releaseMap = [
    { sel: '#release-pico-de-amor', id: 'streams' },
    { sel: '#release-berlin-to-ade', id: 'road' },
    { sel: '#release-temporary-miracle', id: 'cyprus' }
  ];
  const sectionFallback = { bio: 'kaunas', contact: 'cyprus' };

  const item = document.createElement('div');
  item.className = 'ticker__item';
  ticker.appendChild(item);
  document.body.classList.add('has-ticker');

  let current = '';
  const show = (html) => {
    if (html === current) return;
    current = html;
    if (!html) {
      ticker.classList.remove('is-on');
      item.style.opacity = '0';
      return;
    }
    ticker.classList.add('is-on');
    item.style.opacity = '0';
    setTimeout(() => { item.innerHTML = html; item.style.opacity = '1'; }, 200);
  };

  let activeRelease = '';
  const releaseIo = new IntersectionObserver((entries) => {
    // Pick the most visible release in the band
    let best = null;
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      if (!best || en.intersectionRatio > best.intersectionRatio) best = en;
    }
    if (best) {
      const hit = releaseMap.find((r) => best.target.matches(r.sel));
      if (hit) {
        activeRelease = hit.id;
        show(textOf(hit.id));
        return;
      }
    }
  }, { rootMargin: '-35% 0px -35% 0px', threshold: [0.15, 0.4, 0.7] });

  releaseMap.forEach(({ sel }) => {
    const el = document.querySelector(sel);
    if (el) releaseIo.observe(el);
  });

  const sectionIo = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      if (en.target.id === 'shows' || en.target.id === 'mixes') {
        // Don't keep a music note while scrubbing past music
        if (!activeRelease || en.target.id === 'shows') show('');
        continue;
      }
      if (en.target.id === 'music') continue; // releases handle Music
      const id = sectionFallback[en.target.id];
      if (id) {
        activeRelease = '';
        show(textOf(id));
      }
    }
  }, { rootMargin: '-40% 0px -40% 0px' });

  ['shows', 'music', 'mixes', 'bio', 'contact'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) sectionIo.observe(el);
  });

  show('');
}
