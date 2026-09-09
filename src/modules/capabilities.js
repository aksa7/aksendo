// capabilities.js — decide how much enhancement this device gets.
export const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const isDesktop = () => window.matchMedia('(min-width: 820px)').matches;

export const finePointer = () =>
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// Weak-hardware guard for the WebGL developing layer.
export function weakDevice() {
  const cores = navigator.hardwareConcurrency || 8;
  const mem = navigator.deviceMemory || 8;
  return cores <= 4 || mem <= 4;
}

export function hasWebGL2() {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}

// Full motion layer only when: desktop, not reduced-motion.
export const motionAllowed = () => isDesktop() && !reducedMotion();
