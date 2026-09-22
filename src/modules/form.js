// form.js — booking form: honeypot + min-time, submit via fetch, replace in place.
export function initForm() {
  const form = document.getElementById('booking-form');
  if (!form) return;
  const ts = form.querySelector('input[name="ts"]');
  const stamp = () => { if (ts) ts.value = String(Date.now()); };
  stamp();

  const msg = form.querySelector('.bform__msg');
  const btn = form.querySelector('.bform__submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.className = 'bform__msg';
    msg.textContent = '';

    const data = Object.fromEntries(new FormData(form).entries());
    // client-side honeypot short-circuit (server re-checks)
    if (data.company_url) {
      // Fake success so bots don't learn
      const wrap = form.parentElement;
      form.remove();
      const done = document.createElement('div');
      done.className = 'bform';
      done.innerHTML = `<p class="bform__msg bform__msg--ok">Enquiry sent. A reply will come to the address you gave. Thank you.</p>`;
      wrap.appendChild(done);
      return;
    }

    // Soft client min-time — same rule as the Worker (keeps UX clear)
    const started = Number(data.ts);
    if (!started || Date.now() - started < 3000) {
      msg.className = 'bform__msg bform__msg--err';
      msg.textContent = 'Please take a moment and try again.';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Sending…';

    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
        credentials: 'same-origin'
      });

      const raw = await res.text();
      let out = {};
      try { out = raw ? JSON.parse(raw) : {}; } catch {
        throw new Error(
          res.ok
            ? 'Unexpected response from the booking service.'
            : `Something went wrong (${res.status}).`
        );
      }

      if (res.ok && out.ok) {
        const wrap = form.parentElement;
        form.remove();
        const done = document.createElement('div');
        done.className = 'bform';
        done.innerHTML = `<p class="bform__msg bform__msg--ok">Enquiry sent. A reply will come to the address you gave. Thank you.</p>`;
        wrap.appendChild(done);
        return;
      }

      throw new Error(out.error || `Something went wrong (${res.status}).`);
    } catch (err) {
      const network = err && (err.name === 'TypeError' || /Failed to fetch|NetworkError|Load failed/i.test(String(err.message || '')));
      msg.className = 'bform__msg bform__msg--err';
      msg.textContent = network
        ? 'Could not reach the booking service. Check your connection — or email the booking address directly. Your message is still here.'
        : `${err.message} Your message is still here — or email the booking address directly.`;
      btn.disabled = false;
      btn.textContent = 'Send enquiry';
      stamp(); // allow a clean retry clock
    }
  });
}
