// bus.js — tiny shared state for scroll velocity, read by type/develop/grain.
export const bus = {
  velocity: 0,      // normalised 0..1
  raw: 0,           // signed px/frame-ish
  scroll: 0,
  direction: 1
};
const MAXV = 60;
export function setScroll({ scroll, velocity }) {
  bus.scroll = scroll;
  bus.raw = velocity;
  bus.velocity = Math.min(Math.abs(velocity) / MAXV, 1);
  if (velocity) bus.direction = velocity > 0 ? 1 : -1;
}
