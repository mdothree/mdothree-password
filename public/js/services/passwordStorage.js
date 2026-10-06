// services/passwordStorage.js — mdothree-password
// Session-only password history, kept in memory in this browser tab.
//
// PRIVACY: generated passwords are NEVER sent to a server. An earlier version
// wrote every generated password in plaintext to Firestore
// (`password_history`), which contradicted the page promise "your passwords
// never leave your device". History now lives only in this tab's memory and is
// gone on reload. Do not reintroduce remote storage without an explicit opt-in
// and updated copy.

const MAX_HISTORY = 50;

let memoryHistory = [];
let _seq = 0;

/**
 * Remember a generated password for this tab session only.
 * @param {string} password
 * @param {{ length?: number, algo?: string, strength?: string }} meta
 * @returns {Promise<string>} local id
 */
export async function savePasswordToHistory(password, meta = {}) {
  const id = `local-${Date.now()}-${++_seq}`;
  memoryHistory.unshift({
    id,
    password,
    length:    meta.length   ?? password.length,
    strength:  meta.strength ?? '',
    algo:      meta.algo     ?? 'random',
    createdAt: new Date(),
  });
  if (memoryHistory.length > MAX_HISTORY) memoryHistory.length = MAX_HISTORY;
  return id;
}

/**
 * @param {number} [count=20]
 * @returns {Promise<Array<{ id, password, length, strength, createdAt }>>}
 */
export async function loadPasswordHistory(count = 20) {
  return memoryHistory.slice(0, count);
}

/** @param {string} id */
export async function deletePasswordFromHistory(id) {
  memoryHistory = memoryHistory.filter(p => p.id !== id);
}

export async function clearPasswordHistory() {
  memoryHistory = [];
}
