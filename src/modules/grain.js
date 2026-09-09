// grain.js — step the grain tile between fixed offsets at ~10fps (celluloid, not TV).
export function initGrain() {
  const el = document.querySelector('.grain');
  if (!el) return;
  const offsets = [[0,0],[-8,6],[5,-9],[-4,-6],[9,4],[-10,-3],[3,8],[7,-5]];
  let i = 0, last = 0;
  const STEP = 1000 / 10;
  function tick(t) {
    if (t - last >= STEP) {
      const [x, y] = offsets[i = (i + 1) % offsets.length];
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      last = t;
    }
    raf = requestAnimationFrame(tick);
  }
  let raf = requestAnimationFrame(tick);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else raf = requestAnimationFrame(tick);
  });
}
