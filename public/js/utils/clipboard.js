// clipboard.js — re-exports from ui-helpers.js (single source of truth)
export { showToast, copyToClipboard } from './ui-helpers.js';

// Auto-clear clipboard after N seconds (password-specific feature)
export function scheduleClearClipboard(seconds = 30) {
  setTimeout(async () => {
    try { await navigator.clipboard.writeText(''); } catch { /* permissions */ }
  }, seconds * 1000);
}
