// js/pages/passphrase.js — Passphrase Generator page logic (Pro)
import { generatePassphrase, estimatePassphraseEntropy } from '../services/passphraseGenerator.js';
import { withLoading, showToast as uiToast, showError } from '../utils/ui-helpers.js';
import { copyToClipboard, showToast }                    from '../utils/clipboard.js';
import { initSubscription }                              from '../services/subscriptionService.js';
import { proGate, lockElement, handleStripeReturn }      from '../services/paywallUI.js';
import { ensureAnonymousUser }                           from '../config/config.js';

initSubscription();
handleStripeReturn();
ensureAnonymousUser();

(async () => {
  const allowed = await proGate('password.passphrase');
  if (!allowed) {
    const body = document.querySelector('.tool-body');
    if (body) lockElement(body, 'password.passphrase', 'Passphrase Generator');
    return;
  }
  initPage();
})();

function initPage() {
  const display      = document.getElementById('phraseDisplay');
  const entropyInfo  = document.getElementById('entropyInfo');
  const wordCountInput = document.getElementById('wordCount');
  const wordCountVal = document.getElementById('wordCountVal');

  wordCountInput.addEventListener('input', () => {
    wordCountVal.textContent = wordCountInput.value;
  });

  function gen() {
    const wordCount = parseInt(wordCountInput.value);
    const phrase = generatePassphrase({
      wordCount,
      separator:  document.getElementById('separator').value || '-',
      capitalize: document.getElementById('capitalize').checked,
      addNumber:  document.getElementById('addNumber').checked,
      addSymbol:  document.getElementById('addSymbol').checked,
    });
    display.textContent = phrase;

    const { bits, crackTime } = estimatePassphraseEntropy(wordCount);
    entropyInfo.textContent = `~${bits} bits of entropy · Crack time: ${crackTime}`;
  }

  async function copy() {
    const ok = await copyToClipboard(display.textContent);
    showToast(ok ? 'Passphrase copied!' : 'Copy failed — select and copy manually', ok ? 'success' : 'error');
  }

  document.getElementById('genPhraseBtn').addEventListener('click', withLoading(document.getElementById('genPhraseBtn'), 'Generating…', gen));
  document.getElementById('refreshPhraseBtn').addEventListener('click', gen);
  document.getElementById('copyPhraseBtn').addEventListener('click', copy);
  document.getElementById('copyPhraseBtn2').addEventListener('click', copy);

  gen();
}

// Global error boundary — catch unhandled promise rejections
window.addEventListener('unhandledrejection', event => {
  console.error('[mdothree] Unhandled promise rejection:', event.reason);
  uiToast(event.reason?.message || 'An unexpected error occurred', 'error');
  event.preventDefault();
});
