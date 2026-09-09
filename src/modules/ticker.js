// ticker.js — mobile marginalia: one sticky bottom line, swapped at section
// boundaries with a CSS crossfade. No animation library. IntersectionObserver only.
export function initTicker() {
  const ticker = document.querySelector('[data-ticker]');
  const notes = [...document.querySelectorAll('.margin')];
  if (!ticker || !notes.length) return;

  const bySection = { shows: 'streams', music: 'zamna', mixes: 'road', bio: 'kaunas', contact: 'appearances' };
  const textOf = (id) => {
    const n = notes.find((x) => x.dataset.margin === id);
    return n ? n.innerHTML : '';
  };

  const item = document.createElement('div');
  item.className = 'ticker__item';
  ticker.appendChild(item);
  ticker.classList.add('is-on');
  document.body.classList.add('has-ticker');

  let current = '';
  const set = (id) => {
    const html = textOf(id);
    if (!html || html === current) return;
    current = html;
    item.style.opacity = '0';
    setTimeout(() => { item.innerHTML = html; item.style.opacity = '1'; }, 200);
  };

  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting && bySection[en.target.id]) set(bySection[en.target.id]);
  }, { rootMargin: '-40% 0px -40% 0px' });
  ['shows', 'music', 'mixes', 'bio', 'contact'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) io.observe(el);
  });
  set('streams');
}
