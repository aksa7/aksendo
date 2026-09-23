// worker/index.js — static assets + booking API for aksendo.com
// - serves the built site from the ASSETS binding, with cache headers
// - POST /api/booking: validate → Resend email + auto-reply, honeypot + min-time
//   + IP rate limit. Never exposes the delivery inbox in the response.
// Always return JSON from the booking handler — never let an exception kill the connection
// (a dropped connection surfaces as "Failed to fetch" in the browser).

const RL_MAX = 5;              // submissions
const RL_WINDOW = 60 * 60;     // per hour (seconds)
const MIN_MS = 3000;           // min time-on-page before submit

// Best-effort in-memory fallback when KV (`RL`) is not bound (single-isolate only).
const memRl = new Map();

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Booking API first — never www-redirect a POST (301 → browsers retry as GET → 405).
    if (url.pathname === '/api/booking' || url.pathname === '/api/booking/') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(request) });
      }
      if (request.method !== 'POST') {
        return json({ ok: false, error: 'Method not allowed' }, 405, request);
      }
      try {
        return await handleBooking(request, env, ctx);
      } catch (err) {
        console.error('booking unhandled', err && err.message ? err.message : err);
        return json(
          { ok: false, error: 'Could not send right now. Please email the booking address directly.' },
          500,
          request
        );
      }
    }

    // www → apex with 308 so method/body are preserved for any future non-GET
    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 308);
    }

    // static assets
    if (!env.ASSETS) {
      return json({ ok: false, error: 'Assets binding missing' }, 500, request);
    }
    const res = await env.ASSETS.fetch(request);
    return withCache(res, url);
  }
};

function corsHeaders(request) {
  // Same-origin form needs no CORS; keep permissive echo for local vite proxy debugging.
  const origin = request.headers.get('Origin') || '';
  const h = {
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400'
  };
  if (origin) h['access-control-allow-origin'] = origin;
  return h;
}

function json(obj, status = 200, request = null) {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  };
  if (request) Object.assign(headers, corsHeaders(request));
  return new Response(JSON.stringify(obj), { status, headers });
}

function withCache(res, url) {
  const h = new Headers(res.headers);
  const p = url.pathname;
  if (p.startsWith('/assets/')) {
    h.set('cache-control', 'public, max-age=31536000, immutable');
  } else if (/\.(woff2|otf|avif|webp|jpe?g|png|svg)$/.test(p)) {
    h.set('cache-control', 'public, max-age=86400');
  } else {
    h.set('cache-control', 'no-cache');
  }
  h.set('x-content-type-options', 'nosniff');
  h.set('referrer-policy', 'strict-origin-when-cross-origin');
  return new Response(res.body, { status: res.status, headers: h });
}

async function rateLimit(ip, env, ctx) {
  if (env.RL) {
    const key = `rl:${ip}`;
    const count = Number((await env.RL.get(key)) || 0);
    if (count >= RL_MAX) return false;
    ctx.waitUntil(env.RL.put(key, String(count + 1), { expirationTtl: RL_WINDOW }));
    return true;
  }
  // In-memory fallback (resets on isolate recycle — better than open flood)
  const now = Date.now();
  let row = memRl.get(ip);
  if (!row || now - row.start > RL_WINDOW * 1000) {
    row = { start: now, count: 0 };
  }
  if (row.count >= RL_MAX) {
    memRl.set(ip, row);
    return false;
  }
  row.count += 1;
  memRl.set(ip, row);
  return true;
}

async function handleBooking(request, env, ctx) {
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: 'Bad request' }, 400, request);
  }

  const {
    name = '',
    email = '',
    organisation = '',
    date = '',
    city = '',
    message = '',
    company_url = '',
    ts = 0
  } = data || {};

  // honeypot: pretend success, deliver nothing
  if (String(company_url).trim() !== '') {
    return json({ ok: true }, 200, request);
  }

  // min time-on-page
  const started = Number(ts);
  if (!started || !Number.isFinite(started) || Date.now() - started < MIN_MS) {
    return json({ ok: false, error: 'Please take a moment and try again.' }, 400, request);
  }

  // validation
  if (!String(name).trim() || !String(message).trim()) {
    return json({ ok: false, error: 'Name and message are required.' }, 400, request);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email).trim())) {
    return json({ ok: false, error: 'A valid email is required so we can reply.' }, 400, request);
  }
  if (String(message).length > 4000 || String(name).length > 200) {
    return json({ ok: false, error: 'That message is too long.' }, 400, request);
  }

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  if (!(await rateLimit(ip, env, ctx))) {
    return json(
      { ok: false, error: 'Too many enquiries from this address. Please email directly.' },
      429,
      request
    );
  }

  if (!env.RESEND_API_KEY) {
    return json(
      { ok: false, error: 'Booking service is not configured yet. Please email the booking address directly.' },
      503,
      request
    );
  }

  const to = env.BOOKING_TO || 'bookings@aksendo.com';
  // Prefer a dedicated form sender if set; otherwise the verified domain address.
  const from =
    env.BOOKING_FROM ||
    'Aksendo Bookings <bookings@aksendo.com>';
  const esc = (s) =>
    String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

  const cleanName = String(name).trim();
  const cleanEmail = String(email).trim();
  const cleanOrg = String(organisation).trim();
  const cleanDate = String(date).trim();
  const cleanCity = String(city).trim();
  const cleanMsg = String(message).trim();

  const textBody =
    `Name: ${cleanName}\n` +
    `Email: ${cleanEmail}\n` +
    `Organisation: ${cleanOrg || '—'}\n` +
    `Date: ${cleanDate || '—'}\n` +
    `City: ${cleanCity || '—'}\n\n` +
    cleanMsg;

  const adminHtml = `<h2>New booking enquiry</h2>
    <p><b>Name:</b> ${esc(cleanName)}<br><b>Email:</b> ${esc(cleanEmail)}<br>
    <b>Organisation:</b> ${esc(cleanOrg) || '—'}<br>
    <b>Date:</b> ${esc(cleanDate) || '—'}<br><b>City:</b> ${esc(cleanCity) || '—'}</p>
    <p style="white-space:pre-wrap">${esc(cleanMsg)}</p>`;

  const replyHtml =
    `<p style="margin:0 0 1em;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">Thank you so much for reaching out.</p>` +
    `<p style="margin:0 0 1em;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">Playing music for people is not just something I do, it's genuinely my whole life. Every message like yours means a lot, because it means someone out there wants to share that feeling with me.</p>` +
    `<p style="margin:0 0 1em;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">I read every enquiry myself, and I'll get back to you personally very soon. If anything is urgent, just reply directly to this email and it'll reach me.</p>` +
    `<p style="margin:0 0 1.5em;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">Thank you again, truly.</p>` +
    `<p style="margin:0;font-family:Arial Black,Helvetica Neue,Helvetica,Arial,sans-serif;font-weight:700;font-size:14px;letter-spacing:0.05em;text-transform:uppercase;color:#111">AKSENDO</p>`;

  const send = (payload) =>
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

  let r1;
  try {
    r1 = await send({
      from,
      to: [to],
      reply_to: cleanEmail,
      subject: `New booking enquiry — ${cleanOrg || cleanName}`,
      text: textBody,
      html: adminHtml
    });
  } catch (err) {
    console.error('resend network', err && err.message ? err.message : err);
    return json(
      { ok: false, error: 'Could not send right now. Please email the booking address directly.' },
      502,
      request
    );
  }

  if (!r1.ok) {
    let detail = '';
    try { detail = await r1.text(); } catch { /* */ }
    console.error('resend failed', r1.status, detail.slice(0, 500));
    return json(
      { ok: false, error: 'Could not send right now. Please email the booking address directly.' },
      502,
      request
    );
  }

  // Auto-reply: best-effort — never fail the primary booking notification
  ctx.waitUntil(
    send({
      from,
      to: [cleanEmail],
      subject: 'Thanks for your booking enquiry',
      text:
        'Thank you so much for reaching out.\n\n' +
        "Playing music for people is not just something I do, it's genuinely my whole life. Every message like yours means a lot, because it means someone out there wants to share that feeling with me.\n\n" +
        "I read every enquiry myself, and I'll get back to you personally very soon. If anything is urgent, just reply directly to this email and it'll reach me.\n\n" +
        'Thank you again, truly.\n\n' +
        'AKSENDO',
      html: replyHtml
    }).then(async (r) => {
      if (!r.ok) {
        let detail = '';
        try { detail = await r.text(); } catch { /* */ }
        console.error('resend auto-reply failed', r.status, detail.slice(0, 300));
      }
    }).catch((err) => {
      console.error('resend auto-reply network', err && err.message ? err.message : err);
    })
  );

  return json({ ok: true }, 200, request);
}
