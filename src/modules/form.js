// form.js — booking form: honeypot + min-time, submit via fetch, replace in place.
export function initForm() {
  const form = document.getElementById('booking-form');
  if (!form) return;
  const ts = form.querySelector('input[name="ts"]');
  if (ts) ts.value = String(Date.now());

  const msg = form.querySelector('.bform__msg');
  const btn = form.querySelector('.bform__submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.className = 'bform__msg';
    msg.textContent = '';

    const data = Object.fromEntries(new FormData(form).entries());
    // client-side honeypot / min-time short-circuit (server re-checks)
    if (data.company_url) return; // bot
    btn.disabled = true;
    btn.textContent = 'Sending…';

    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const out = await res.json().catch(() => ({}));
      if (res.ok && out.ok) {
        const wrap = form.parentElement;
        form.remove();
        const done = document.createElement('div');
        done.className = 'bform';
        done.innerHTML = `<p class="bform__msg bform__msg--ok">Enquiry sent. A reply will come to the address you gave. Thank you.</p>`;
        wrap.appendChild(done);
      } else {
        throw new Error(out.error || `Something went wrong (${res.status}).`);
      }
    } catch (err) {
      msg.className = 'bform__msg bform__msg--err';
      msg.textContent = `${err.message} Your message is still here — or email the booking address directly.`;
      btn.disabled = false;
      btn.textContent = 'Send enquiry';
    }
  });
}
