// clock.js — show partitioning helpers + the "next show city" local time.
import shows from '../data/shows.json';

const TZ_BY_CITY = {
  Vilnius: 'Europe/Vilnius',
  Berlin: 'Europe/Berlin',
  Amsterdam: 'Europe/Amsterdam',
  Oslo: 'Europe/Oslo',
  TBC: 'Europe/Vilnius'
};

// end-of-day in Vilnius: a gig isn't "past" until its day is over locally.
function endOfDayVilnius(iso) {
  // 21:59:59Z ≈ end of day in Vilnius (UTC+2/+3). Good enough for partitioning.
  return new Date(iso + 'T23:59:59+02:00').getTime();
}

export function partition(now = Date.now()) {
  const upcoming = [];
  const played = [];
  for (const s of shows) (endOfDayVilnius(s.date) >= now ? upcoming : played).push(s);
  upcoming.sort((a, b) => a.date.localeCompare(b.date));
  played.sort((a, b) => b.date.localeCompare(a.date));
  return { upcoming, played };
}

export function isTonight(iso, now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Vilnius', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return iso === today;
}

export function nextShow() {
  return partition().upcoming[0] || null;
}

export function cityTime(city) {
  const tz = TZ_BY_CITY[city] || 'Europe/Vilnius';
  const t = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date());
  return t;
}

// Refine the build-time "tonight" flag against the viewer's real clock,
// and keep the footer clock ticking for the touch/reduced-motion fallback.
export function initClockFallback() {
  const ns = nextShow();
  const footer = document.querySelector('[data-footer-clock]');
  // mark tonight
  document.querySelectorAll('.show[data-date]').forEach((row) => {
    if (isTonight(row.dataset.date)) {
      row.classList.add('show--tonight');
      if (!row.querySelector('.show__flag')) {
        const d = row.querySelector('.show__date');
        if (d) d.insertAdjacentHTML('beforeend', '<span class="show__flag" style="display:inline-block">TONIGHT</span>');
      }
    }
  });
  if (!ns || !footer) return;
  const tick = () => { footer.textContent = `${ns.city.toUpperCase()} ${cityTime(ns.city)}`; };
  tick();
  return setInterval(tick, 1000);
}
