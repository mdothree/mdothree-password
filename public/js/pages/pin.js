// js/pages/pin.js — PIN Generator page logic
import { copyToClipboard, showToast } from '../utils/clipboard.js';
import { withLoading, showToast as uiToast, showError } from '../utils/ui-helpers.js';
import { initSubscription }           from '../services/subscriptionService.js';
import { proBadge, handleStripeReturn } from '../services/paywallUI.js';
import { onAuthChange }               from '../config/config.js';

initSubscription();
handleStripeReturn();
onAuthChange(u => {
  const nav = document.querySelector('.tool-nav');
  if (!nav) return;
  if (u && !nav.querySelector('.pro-badge')) nav.appendChild(proBadge());
});

// Unbiased random digit: rejection-sample bytes >= 250 (250 = 25 * 10), so
// every digit has probability exactly 1/10. A plain `byte % 10` favoured 0-5.
function randomDigits(length) {
  const out = [];
  while (out.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length * 2));
    for (const b of bytes) {
      if (b < 250) out.push(b % 10);
      if (out.length === length) break;
    }
  }
  return out;
}

function genPIN(length, avoidSeq, avoidRepeat) {
  let attempts = 0;
  while (attempts++ < 1000) {
    const digits = randomDigits(length);
    const pin    = digits.join('');

    if (avoidSeq) {
      let isSeq = false;
      for (let i = 0; i < digits.length - 2; i++) {
        if (Math.abs(digits[i + 1] - digits[i]) === 1 && Math.abs(digits[i + 2] - digits[i + 1]) === 1) {
          isSeq = true; break;
        }
      }
      if (isSeq) continue;
    }

    if (avoidRepeat && /(.)\1{2,}/.test(pin)) continue;

    return pin;
  }
  // Fallback (no constraints met within limit)
  return randomDigits(length).join('');
}

const display     = document.getElementById('pinDisplay');
const pinList     = document.getElementById('pinList');
const pinLenInput = document.getElementById('pinLen');
const pinLenVal   = document.getElementById('pinLenVal');
let pins          = [];

pinLenInput.addEventListener('input', () => {
  pinLenVal.textContent = pinLenInput.value;
});

function gen() {
  const length      = parseInt(pinLenInput.value);
  const count       = Math.min(50, parseInt(document.getElementById('pinCount').value) || 1);
  const avoidSeq    = document.getElementById('avoidSeq').checked;
  const avoidRepeat = document.getElementById('avoidRepeat').checked;

  pins = Array.from({ length: count }, () => genPIN(length, avoidSeq, avoidRepeat));
  display.textContent = pins[0];
  pinList.innerHTML   = '';

  pins.forEach(pin => {
    const item = document.createElement('div');
    item.className = 'pw-item pw-item--pin';
    const span = document.createElement('span');
    span.textContent = pin;
    item.appendChild(span);
    item.addEventListener('click', async () => {
      const ok = await copyToClipboard(pin);
      showToast(ok ? 'PIN copied!' : 'Copy failed — select and copy manually', ok ? 'success' : 'error');
    });
    pinList.appendChild(item);
  });
}

document.getElementById('genPins').addEventListener('click', gen);
document.getElementById('refreshPin').addEventListener('click', gen);

document.getElementById('copyPin').addEventListener('click', async () => {
  const ok = await copyToClipboard(display.textContent);
  showToast(ok ? 'Copied!' : 'Copy failed — select and copy manually', ok ? 'success' : 'error');
});

document.getElementById('copyAllPins').addEventListener('click', async () => {
  const ok = await copyToClipboard(pins.join('\n'));
  showToast(ok ? `${pins.length} PINs copied!` : 'Copy failed — select and copy manually', ok ? 'success' : 'error');
});

gen();

// Global error boundary — catch unhandled promise rejections
window.addEventListener('unhandledrejection', event => {
  console.error('[mdothree] Unhandled promise rejection:', event.reason);
  uiToast(event.reason?.message || 'An unexpected error occurred', 'error');
  event.preventDefault();
});
