// worker/index.js — static assets + booking API for aksendo.com
// - serves the built site from the ASSETS binding, with cache headers
// - POST /api/booking: validate → Resend email + auto-reply, honeypot + min-time
//   + IP rate limit. Never exposes the delivery inbox in the response.

const RL_MAX = 5;              // submissions
const RL_WINDOW = 60 * 60;     // per hour (seconds)
const MIN_MS = 3000;           // min time-on-page before submit

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // www -> apex 301
    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname === '/api/booking') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
      return handleBooking(request, env, ctx);
    }

    // static assets
    const res = await env.ASSETS.fetch(request);
    return withCache(res, url);
  }
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

function withCache(res, url) {
  const h = new Headers(res.headers);
  const p = url.pathname;
  if (p.startsWith('/assets/')) {
    h.set('cache-control', 'public, max-age=31536000, immutable');   // vite-hashed
  } else if (/\.(woff2|avif|webp|jpe?g|png|svg)$/.test(p)) {
    h.set('cache-control', 'public, max-age=86400');
  } else {
    h.set('cache-control', 'no-cache');                              // html
  }
  h.set('x-content-type-options', 'nosniff');
  h.set('referrer-policy', 'strict-origin-when-cross-origin');
  return new Response(res.body, { status: res.status, headers: h });
}

async function handleBooking(request, env, ctx) {
  let data;
  try { data = await request.json(); } catch { return json({ error: 'Bad request' }, 400); }

  const { name = '', email = '', organisation = '', date = '', city = '', message = '', company_url = '', ts = 0 } = data;

  // honeypot: pretend success, deliver nothing
  if (String(company_url).trim() !== '') return json({ ok: true });

  // min time-on-page
  if (!ts || Date.now() - Number(ts) < MIN_MS) return json({ error: 'Please take a moment and try again.' }, 400);

  // validation
  if (!name.trim() || !message.trim()) return json({ error: 'Name and message are required.' }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'A valid email is required so we can reply.' }, 400);
  if (message.length > 4000 || name.length > 200) return json({ error: 'That message is too long.' }, 400);

  // rate limit by IP (KV if bound, else best-effort skip)
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  if (env.RL) {
    const key = `rl:${ip}`;
    const count = Number((await env.RL.get(key)) || 0);
    if (count >= RL_MAX) return json({ error: 'Too many enquiries from this address. Please email directly.' }, 429);
    ctx.waitUntil(env.RL.put(key, String(count + 1), { expirationTtl: RL_WINDOW }));
  }

  if (!env.RESEND_API_KEY) {
    return json({ error: 'Booking service is not configured yet. Please email the booking address directly.' }, 503);
  }

  const to = env.BOOKING_TO || 'bookings@aksendo.com';
  const from = env.BOOKING_FROM || 'bookings@aksendo.com';
  const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

  const adminHtml = `<h2>New booking enquiry</h2>
    <p><b>Name:</b> ${esc(name)}<br><b>Email:</b> ${esc(email)}<br>
    <b>Organisation:</b> ${esc(organisation) || '—'}<br>
    <b>Date:</b> ${esc(date) || '—'}<br><b>City:</b> ${esc(city) || '—'}</p>
    <p style="white-space:pre-wrap">${esc(message)}</p>`;

  const replyHtml = `<p>Thanks for reaching out about a booking — this is a quick confirmation that your enquiry reached AKSENDO.</p>
    <p>You'll get a personal reply soon. For anything urgent, just respond to this email.</p>
    <p>— AKSENDO</p>`;

  try {
    const send = (payload) => fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const r1 = await send({
      from: `AKSENDO Site <${from}>`, to: [to], reply_to: email,
      subject: `Booking — ${name}${city ? ` · ${city}` : ''}${date ? ` · ${date}` : ''}`,
      html: adminHtml
    });
    if (!r1.ok) throw new Error('delivery failed');

    // auto-reply to sender (best effort)
    ctx.waitUntil(send({
      from: `AKSENDO <${from}>`, to: [email],
      subject: 'Your booking enquiry — AKSENDO',
      html: replyHtml
    }));

    return json({ ok: true });
  } catch {
    return json({ error: 'Could not send right now. Please email the booking address directly.' }, 502);
  }
}
