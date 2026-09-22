// bus.js — tiny shared state for scroll velocity, read by type/develop/grain.
export const bus = {
  velocity: 0,      // normalised 0..1
  raw: 0,           // signed px/frame-ish
  scroll: 0,
  direction: 1,
  // Hero dither→clear progress (0..1). Driven by entry timeline, not a one-shot jump.
  heroDevelop: 0
};

const MAXV = 60;
const developListeners = new Set();

export function setScroll({ scroll, velocity }) {
  bus.scroll = scroll;
  bus.raw = velocity;
  bus.velocity = Math.min(Math.abs(velocity) / MAXV, 1);
  if (velocity) bus.direction = velocity > 0 ? 1 : -1;
}

/** Entry / skip write develop progress; WebGL layer listens and re-kicks its rAF. */
export function setHeroDevelop(p) {
  const next = Math.min(Math.max(p, 0), 1);
  if (Math.abs(next - bus.heroDevelop) < 0.00005 && next !== 0 && next !== 1) return;
  bus.heroDevelop = next;
  developListeners.forEach((fn) => {
    try { fn(next); } catch { /* */ }
  });
}

export function onHeroDevelop(fn) {
  developListeners.add(fn);
  return () => developListeners.delete(fn);
}
