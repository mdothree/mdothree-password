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

function genPIN(length, avoidSeq, avoidRepeat) {
  let attempts = 0;
  while (attempts++ < 1000) {
    const bytes  = crypto.getRandomValues(new Uint8Array(length));
    const digits = Array.from(bytes).map(b => b % 10);
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
  return Array.from(crypto.getRandomValues(new Uint8Array(length))).map(b => b % 10).join('');
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
    item.innerHTML = `<span>${pin}</span>`;
    item.addEventListener('click', async () => {
      await copyToClipboard(pin);
      showToast('PIN copied!');
    });
    pinList.appendChild(item);
  });
}

document.getElementById('genPins').addEventListener('click', gen);
document.getElementById('refreshPin').addEventListener('click', gen);

document.getElementById('copyPin').addEventListener('click', async () => {
  await copyToClipboard(display.textContent);
  showToast('Copied!');
});

document.getElementById('copyAllPins').addEventListener('click', async () => {
  await copyToClipboard(pins.join('\n'));
  showToast(`${pins.length} PINs copied!`);
});

gen();

// Global error boundary — catch unhandled promise rejections
window.addEventListener('unhandledrejection', event => {
  console.error('[mdothree] Unhandled promise rejection:', event.reason);
  uiToast(event.reason?.message || 'An unexpected error occurred', 'error');
  event.preventDefault();
});
