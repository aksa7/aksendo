// embeds.js — click-to-load facades for mixes. Nothing third-party loads until asked.
// Default (v4 a): inject the YouTube iframe in place. The anchor's href is the
// no-JS / reduced fallback (opens on YouTube).
import links from '../data/links.json';

function channelToEmbed() {
  // No per-video ids supplied yet → open the channel. When real video ids land in
  // a data file, swap this to an embed URL. For now the facade opens the channel.
  return null;
}

export function initMixes() {
  const yt = links.artist.youtube;
  document.querySelectorAll('[data-mix]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const embed = channelToEmbed();
      if (!embed) return; // no embeddable id yet: let the anchor open YouTube
      e.preventDefault();
      const iframe = document.createElement('iframe');
      iframe.src = `${embed}?autoplay=1&rel=0`;
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
      iframe.loading = 'lazy';
      iframe.title = 'AKSENDO mix';
      el.classList.add('is-live');
      el.appendChild(iframe);
    });
  });
}
