// embeds.js — mix banners link out to YouTube by default (no third-party until asked).
// When a card has data-video, a future click-to-embed path can inject an iframe.
export function initMixes() {
  // Anchors already open the watch URL. Keep a hook for progressive enhancement.
  document.querySelectorAll('[data-mix][data-video]').forEach((el) => {
    el.addEventListener('keydown', (e) => {
      if (e.key === ' ') { e.preventDefault(); el.click(); }
    });
  });
}
