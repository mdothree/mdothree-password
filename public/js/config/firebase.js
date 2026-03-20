// config/firebase.js — mdothree-password
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore,
  collection, addDoc, getDocs, query, where, orderBy, limit,
  serverTimestamp, deleteDoc, doc, updateDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

function loadConfig() {
  if (typeof window !== 'undefined') {
    if (window.__FIREBASE_CONFIG) return window.__FIREBASE_CONFIG;
    const meta = document.querySelector('meta[name="firebase-config"]');
    if (meta) { try { return JSON.parse(meta.content); } catch {} }
  }
  return {
    apiKey:            'REPLACE_WITH_API_KEY',
    authDomain:        'REPLACE.firebaseapp.com',
    projectId:         'REPLACE_WITH_PROJECT_ID',
    storageBucket:     'REPLACE.appspot.com',
    messagingSenderId: 'REPLACE',
    appId:             'REPLACE_WITH_APP_ID',
  };
}

let _app, _db, _auth;

export function getFirebaseApp() {
  if (_app) return _app;
  _app = getApps().length ? getApps()[0] : initializeApp(loadConfig());
  return _app;
}
export function getDB() {
  if (_db) return _db;
  _db = getFirestore(getFirebaseApp());
  return _db;
}
export function getFirebaseAuth() {
  if (_auth) return _auth;
  _auth = getAuth(getFirebaseApp());
  return _auth;
}

export async function ensureAnonymousUser() {
  const auth = getFirebaseAuth();
  if (auth.currentUser) return auth.currentUser;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (e) {
    console.warn('[Firebase] Anonymous sign-in failed:', e.code);
    return null;
  }
}

export function onAuthChange(cb) {
  return onAuthStateChanged(getFirebaseAuth(), cb);
}

export { serverTimestamp, collection, addDoc, getDocs, query, where, orderBy, limit, deleteDoc, doc, updateDoc };
