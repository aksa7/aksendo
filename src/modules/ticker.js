// ticker.js — mobile marginalia: sticky bottom line.
// Streams only while Music is in view; leaving Music clears that line.
export function initTicker() {
  const ticker = document.querySelector('[data-ticker]');
  const notes = [...document.querySelectorAll('.margin')];
  if (!ticker || !notes.length) return;

  // streams lives under Music only — not Shows
  const bySection = { music: 'streams', mixes: 'road', bio: 'kaunas', contact: 'live' };
  const textOf = (id) => {
    const n = notes.find((x) => x.dataset.margin === id);
    return n ? n.innerHTML : '';
  };

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

  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) {
        // leaving Music → hide streams line
        if (en.target.id === 'music' && current === textOf('streams')) show('');
        continue;
      }
      const id = bySection[en.target.id];
      if (id) show(textOf(id));
      else if (en.target.id === 'shows') show(''); // never streams on Shows
    }
  }, { rootMargin: '-40% 0px -40% 0px' });

  ['shows', 'music', 'mixes', 'bio', 'contact'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) io.observe(el);
  });
  // start hidden until Music (or another mapped section) enters
  show('');
}
