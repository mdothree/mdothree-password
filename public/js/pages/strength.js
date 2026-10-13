// js/pages/strength.js — Password Strength Meter page logic
import { analyzeStrength, LEVEL_LABELS } from '../services/strengthMeter.js';
import { withLoading, showToast as uiToast, showError } from '../utils/ui-helpers.js';
import { initSubscription, onSubscriptionChange } from '../services/subscriptionService.js';
import { proBadge, handleStripeReturn }  from '../services/paywallUI.js';

initSubscription();
handleStripeReturn();
// Pro badge only for a real Pro entitlement (an anonymous guest is not Pro).
onSubscriptionChange(status => {
  const nav = document.querySelector('.mdo-actions');
  if (!nav) return;
  const existing = nav.querySelector('.pro-badge');
  if (status.isPro && !existing) nav.insertBefore(proBadge(), nav.querySelector('[data-mdo-account]'));
  else if (!status.isPro && existing) existing.remove();
});

const testPw   = document.getElementById('testPw');
const sFill    = document.getElementById('sFill');
const sLabel   = document.getElementById('sLabel');
const analysis = document.getElementById('analysis');
const entropyEl= document.getElementById('entropy');
const levelEl  = document.getElementById('level');
const feedbackEl = document.getElementById('feedback');

document.getElementById('toggleVis').addEventListener('click', () => {
  testPw.type = testPw.type === 'password' ? 'text' : 'password';
});

testPw.addEventListener('input', () => {
  const pw = testPw.value;
  if (!pw) {
    analysis.hidden = true;
    sFill.className = 'strength-bar-fill';
    sLabel.textContent = '—';
    return;
  }

  const { level, entropy, feedback } = analyzeStrength(pw);
  sFill.className    = `strength-bar-fill fill-${level}`;
  sLabel.textContent = LEVEL_LABELS[level];
  sLabel.className   = `strength-label strength-${level}`;
  entropyEl.textContent = `${entropy} bits`;
  levelEl.textContent   = LEVEL_LABELS[level];
  levelEl.className     = `strength-${level}`;

  feedbackEl.innerHTML = feedback.length
    ? feedback.map(f => `<li class="feedback-item">${f}</li>`).join('')
    : '<li class="feedback-item feedback-item--good">✓ Looks good!</li>';

  analysis.hidden = false;
});

// Global error boundary — catch unhandled promise rejections
window.addEventListener('unhandledrejection', event => {
  console.error('[mdothree] Unhandled promise rejection:', event.reason);
  uiToast(event.reason?.message || 'An unexpected error occurred', 'error');
  event.preventDefault();
});
