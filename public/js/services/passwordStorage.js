// services/passwordStorage.js — mdothree-password
// Persists generated password history to Firestore (per anonymous user).
// Falls back to in-memory if Firebase is unavailable.

import {
  getDB, ensureAnonymousUser, getFirebaseAuth,
  collection, addDoc, getDocs, query, where, orderBy, limit,
  serverTimestamp, deleteDoc, doc,
} from '../config/config.js';

const COLLECTION = 'password_history';
const MAX_HISTORY = 50;

// ---- In-memory fallback ----
let memoryHistory = [];

// ---- Firestore helpers ----

/**
 * Save a generated password to Firestore history.
 * @param {string} password
 * @param {{ length, algo, strength }} meta
 * @returns {Promise<string|null>} Firestore doc ID or null on failure
 */
export async function savePasswordToHistory(password, meta = {}) {
  const user = await ensureAnonymousUser();
  if (!user) {
    // Fallback: in-memory only
    memoryHistory.unshift({ id: Date.now().toString(), password, meta, createdAt: new Date() });
    if (memoryHistory.length > MAX_HISTORY) memoryHistory.pop();
    return null;
  }

  try {
    const db = getDB();
    const ref = await addDoc(collection(db, COLLECTION), {
      uid:       user.uid,
      password,
      length:    meta.length    ?? password.length,
      strength:  meta.strength  ?? '',
      algo:      meta.algo      ?? 'random',
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (e) {
    console.warn('[passwordStorage] save failed:', e.message);
    return null;
  }
}

/**
 * Load password history for the current user.
 * @param {number} [count=20]
 * @returns {Promise<Array<{ id, password, length, strength, createdAt }>>}
 */
export async function loadPasswordHistory(count = 20) {
  const user = getFirebaseAuth().currentUser;
  if (!user) return memoryHistory.slice(0, count);

  try {
    const db = getDB();
    const q = query(
      collection(db, COLLECTION),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(count),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
      id:        d.id,
      password:  d.data().password,
      length:    d.data().length,
      strength:  d.data().strength,
      createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
    }));
  } catch (e) {
    console.warn('[passwordStorage] load failed:', e.message);
    return memoryHistory.slice(0, count);
  }
}

/**
 * Delete a password from history by Firestore doc ID.
 * @param {string} docId
 */
export async function deletePasswordFromHistory(docId) {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    memoryHistory = memoryHistory.filter(p => p.id !== docId);
    return;
  }
  try {
    const db = getDB();
    await deleteDoc(doc(db, COLLECTION, docId));
  } catch (e) {
    console.warn('[passwordStorage] delete failed:', e.message);
  }
}

/**
 * Clear all history for the current user.
 */
export async function clearPasswordHistory() {
  const user = getFirebaseAuth().currentUser;
  if (!user) { memoryHistory = []; return; }

  try {
    const db = getDB();
    const q = query(collection(db, COLLECTION), where('uid', '==', user.uid));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  } catch (e) {
    console.warn('[passwordStorage] clear failed:', e.message);
  }
}
