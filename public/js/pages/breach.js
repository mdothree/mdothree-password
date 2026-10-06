// js/pages/breach.js — Breach Checker page logic (Pro)
import { initSubscription }                         from '../services/subscriptionService.js';
import { withLoading, showToast as uiToast, showError } from '../utils/ui-helpers.js';
import { proGate, lockElement, handleStripeReturn } from '../services/paywallUI.js';
import { ensureAnonymousUser }                      from '../config/config.js';

initSubscription();
handleStripeReturn();
ensureAnonymousUser();

(async () => {
  const allowed = await proGate('password.breach');
  if (!allowed) {
    const body = document.querySelector('.tool-body');
    if (body) lockElement(body, 'password.breach', 'Breach Checker');
    return;
  }
  initPage();
})();

// k-Anonymity SHA-1 + HIBP range check
async function sha1Hex(str) {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

async function checkBreach(password) {
  const hash   = await sha1Hex(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const res  = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
  if (!res.ok) throw new Error('HIBP API unavailable');

  const text  = await res.text();
  const lines = text.split('\n');

  for (const line of lines) {
    const [lineSuffix, count] = line.trim().split(':');
    if (lineSuffix === suffix) {
      return { pwned: true, count: parseInt(count, 10) };
    }
  }
  return { pwned: false, count: 0 };
}

function initPage() {
  const input        = document.getElementById('breachInput');
  const toggleVis    = document.getElementById('toggleVis');
  const checkBtn     = document.getElementById('checkBtn');
  const resultPanel  = document.getElementById('resultPanel');
  const breachResult = document.getElementById('breachResult');
  const breachDetail = document.getElementById('breachDetail');

  // Rate limiting: minimum 2 seconds between checks to protect against HIBP API abuse
  const COOLDOWN_MS  = 2000;
  let   lastCheckAt  = 0;

  toggleVis.addEventListener('click', () => {
    input.type = input.type === 'password' ? 'text' : 'password';
  });

  checkBtn.addEventListener('click', async () => {
    const pw = input.value.trim();
    if (!pw) return;

    // Enforce cooldown between checks
    const now = Date.now();
    if (now - lastCheckAt < COOLDOWN_MS) {
      uiToast('Please wait a moment before checking again.', 'info');
      return;
    }
    lastCheckAt = now;

    // Minimum password length sanity check
    if (pw.length < 3) {
      uiToast('Enter a full password to check.', 'info');
      return;
    }

    checkBtn.textContent = 'Checking…';
    checkBtn.disabled    = true;
    resultPanel.hidden   = false;
    breachResult.textContent = 'Checking…';
    breachDetail.textContent = '';

    try {
      const { pwned, count } = await checkBreach(pw);
      if (pwned) {
        breachResult.innerHTML = `<span class="danger">⚠ Found in ${count.toLocaleString()} breaches</span>`;
        breachDetail.textContent = 'This password has been compromised. Do not use it for any account.';
      } else {
        breachResult.innerHTML = `<span class="success">✓ Not found in any known breach</span>`;
        breachDetail.textContent = 'This password does not appear in the HaveIBeenPwned database. However, always use a unique, strong password.';
      }
    } catch (e) {
      const err = document.createElement('span');
      err.className = 'danger';
      err.textContent = `Error: ${e.message}`;
      breachResult.replaceChildren(err);
      breachDetail.textContent = 'Could not reach the HaveIBeenPwned API. Check your internet connection.';
    } finally {
      checkBtn.textContent = 'Check Password';
      checkBtn.disabled    = false;
    }
  });
}

// Global error boundary — catch unhandled promise rejections
window.addEventListener('unhandledrejection', event => {
  console.error('[mdothree] Unhandled promise rejection:', event.reason);
  uiToast(event.reason?.message || 'An unexpected error occurred', 'error');
  event.preventDefault();
});
