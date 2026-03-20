// js/app.js — mdothree-password (Firebase-integrated)

import { generatePassword, generatePasswords } from './services/passwordGenerator.js';
import { analyzeStrength, LEVEL_LABELS }       from './services/strengthMeter.js';
import { copyToClipboard, showToast }           from './utils/clipboard.js';
import {
  savePasswordToHistory,
  loadPasswordHistory,
  deletePasswordFromHistory,
  clearPasswordHistory,
} from './services/passwordStorage.js';
import { onAuthChange, ensureAnonymousUser } from './config/config.js';
import { initSubscription, onSubscriptionChange } from './services/subscriptionService.js';
import { proGate, lockElement, openUpgradeModal, handleStripeReturn, proBadge } from './services/paywallUI.js';

initSubscription();
handleStripeReturn();
onSubscriptionChange(status => {
  const nav = document.querySelector('.tool-nav');
  if (!nav) return;
  const existing = nav.querySelector('.pro-badge');
  if (status.isPro && !existing) nav.appendChild(proBadge());
  else if (!status.isPro && existing) existing.remove();
});

// Firebase auth status badge
const authStatus = document.createElement('div');
authStatus.style.cssText = 'position:fixed;bottom:60px;right:16px;font-size:0.72rem;color:var(--text-secondary);font-family:var(--font-mono);z-index:999';
document.body.appendChild(authStatus);
onAuthChange(user => { authStatus.textContent = user ? `🔥 syncing` : '☁ offline'; });
ensureAnonymousUser().then(() => loadAndRenderHistory());

// ---- Elements ----
const display       = document.getElementById('passwordDisplay');
const strengthFill  = document.getElementById('strengthBarFill');
const strengthLabel = document.getElementById('strengthLabel');
const copyPwBtn     = document.getElementById('copyPwBtn');
const refreshBtn    = document.getElementById('refreshBtn');
const generateBtn   = document.getElementById('generateBtn');
const copyAllBtn    = document.getElementById('copyAllBtn');
const clearHistBtn  = document.getElementById('clearHistoryBtn');
const multiPanel    = document.getElementById('multiPwPanel');
const multiList     = document.getElementById('multiPwList');
const historyList   = document.getElementById('historyList');
const pwLengthInput = document.getElementById('pwLength');
const pwLengthVal   = document.getElementById('pwLengthVal');
const pwCountInput  = document.getElementById('pwCount');

let history = [];
let lastPasswords = [];

// ---- Length slider ----
pwLengthInput?.addEventListener('input', () => {
  pwLengthVal.textContent = pwLengthInput.value;
});

// ---- Get options ----
function getOpts() {
  return {
    length:     parseInt(pwLengthInput.value, 10),
    useUpper:   document.getElementById('useUpper').checked,
    useLower:   document.getElementById('useLower').checked,
    useDigits:  document.getElementById('useDigits').checked,
    useSymbols: document.getElementById('useSymbols').checked,
    avoidAmbig: document.getElementById('avoidAmbig').checked,
    symbols:    document.getElementById('customSymbols').value || '!@#$%^&*()-_=+[]{}|;:,.<>?',
  };
}

async function generate() {
  const opts  = getOpts();
  const rawCount = Math.min(50, Math.max(1, parseInt(pwCountInput.value, 10) || 1));
  // Pro gate: bulk generation (>5 at once)
  if (rawCount > 5 && !await proGate('password.bulk')) {
    if (pwCountInput) pwCountInput.value = 5; return;
  }
  const count = rawCount;
  lastPasswords = generatePasswords(opts, count);

  const primary = lastPasswords[0];
  display.textContent = primary;
  updateStrength(primary);

  const { level } = analyzeStrength(primary);
  await savePasswordToHistory(primary, { length: opts.length, strength: level, algo: 'random' });
  await loadAndRenderHistory();

  if (count > 1) {
    multiPanel.classList.remove('hidden');
    multiList.innerHTML = '';
    lastPasswords.forEach(pw => multiList.appendChild(makePwItem(pw)));
  } else {
    multiPanel.classList.add('hidden');
  }
}

function updateStrength(pw) {
  const { level } = analyzeStrength(pw);
  strengthFill.className = `strength-bar-fill fill-${level}`;
  strengthLabel.textContent = LEVEL_LABELS[level];
  strengthLabel.className = `strength-label strength-${level}`;
}

async function loadAndRenderHistory() {
  const items = await loadPasswordHistory(15);
  historyList.innerHTML = '';
  if (!items.length) {
    historyList.innerHTML = '<div style="font-size:0.8rem;color:var(--text-secondary);padding:8px 0">No history yet.</div>';
    return;
  }
  items.forEach(item => historyList.appendChild(makePwItem(item.password, true, item.id)));
}

function makePwItem(pw, showDelete = false, docId = null) {
  const { level } = analyzeStrength(pw);
  const colors = { 'very-weak':'#EF4444','weak':'#F97316','fair':'#F59E0B','strong':'#22C55E','very-strong':'#10B981' };
  const item = document.createElement('div');
  item.className = 'pw-item';
  item.innerHTML = `
    <span style="flex:1;word-break:break-all">${pw}</span>
    <span class="pw-item-strength" title="${LEVEL_LABELS[level]}"></span>
    ${showDelete && docId ? `<button data-id="${docId}" class="del-btn" style="background:none;border:none;cursor:pointer;color:var(--text-secondary);font-size:0.75rem;padding:2px 6px;margin-left:4px" title="Delete">✕</button>` : ''}
  `;
  item.querySelector('.pw-item-strength').style.background = colors[level] || '#ccc';
  item.querySelector('span:first-child').addEventListener('click', async () => {
    await copyToClipboard(pw); showToast('Password copied!');
  });
  item.querySelector('.del-btn')?.addEventListener('click', async e => {
    e.stopPropagation();
    await deletePasswordFromHistory(docId);
    await loadAndRenderHistory();
  });
  return item;
}

// ---- Events ----
generateBtn?.addEventListener('click', generate);
refreshBtn?.addEventListener('click', generate);

copyPwBtn?.addEventListener('click', async () => {
  const pw = display.textContent;
  if (!pw || pw === 'Click Generate') return;
  await copyToClipboard(pw);
  showToast('Copied!');
});

copyAllBtn?.addEventListener('click', async () => {
  if (!lastPasswords.length) return;
  await copyToClipboard(lastPasswords.join('\n'));
  showToast(`${lastPasswords.length} passwords copied!`);
});

clearHistBtn?.addEventListener('click', async () => {
  await clearPasswordHistory();
  await loadAndRenderHistory();
  showToast('History cleared');
});

// Auto-generate on load
generate();
