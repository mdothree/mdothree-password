// js/pages/strength.js — Password Strength Meter page logic
import { analyzeStrength, LEVEL_LABELS } from '../services/strengthMeter.js';
import { withLoading, showToast as uiToast, showError } from '../utils/ui-helpers.js';
import { initSubscription }              from '../services/subscriptionService.js';
import { proBadge, handleStripeReturn }  from '../services/paywallUI.js';
import { onAuthChange }                  from '../config/config.js';

initSubscription();
handleStripeReturn();
onAuthChange(u => {
  const nav = document.querySelector('.tool-nav');
  if (!nav) return;
  if (u && !nav.querySelector('.pro-badge')) nav.appendChild(proBadge());
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
