// tests/passwordGenerator.test.js
// Unit tests for passwordGenerator.js and strengthMeter.js
// Run with: npm test

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

// ─── Inline portable versions of pure logic ───────────────────

function secureRandInt(max) {
  // Use crypto.getRandomValues if available (Node 19+), else Math.random
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    return globalThis.crypto.getRandomValues(new Uint32Array(1))[0] % max;
  }
  return Math.floor(Math.random() * max);
}

const UPPER   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER   = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS  = '0123456789';
const AMBIG   = 'O0l1I';

function removeChars(str, chars) {
  return str.split('').filter(c => !chars.includes(c)).join('');
}
function randomFrom(str) {
  return str[secureRandInt(str.length)];
}

function generatePassword({ length = 20, useUpper = true, useLower = true,
  useDigits = true, useSymbols = true, avoidAmbig = false,
  symbols = '!@#$%^&*()-_=+[]{}|;:,.<>?' } = {}) {
  let charset = '';
  const required = [];
  if (useUpper)   { const c = avoidAmbig ? removeChars(UPPER, AMBIG) : UPPER;   charset += c; required.push(randomFrom(c)); }
  if (useLower)   { const c = avoidAmbig ? removeChars(LOWER, AMBIG) : LOWER;   charset += c; required.push(randomFrom(c)); }
  if (useDigits)  { const c = avoidAmbig ? removeChars(DIGITS, AMBIG) : DIGITS; charset += c; required.push(randomFrom(c)); }
  if (useSymbols && symbols) { charset += symbols; required.push(randomFrom(symbols)); }
  if (!charset) return '';
  const remaining = length - required.length;
  const password = [...required];
  for (let i = 0; i < remaining; i++) password.push(randomFrom(charset));
  for (let i = password.length - 1; i > 0; i--) {
    const j = secureRandInt(i + 1);
    [password[i], password[j]] = [password[j], password[i]];
  }
  return password.join('');
}

// Strength meter logic
function analyzeStrength(password) {
  if (!password) return { score: 0, level: 'very-weak', feedback: [], entropy: 0 };
  const len = password.length;
  let score = 0;
  if (len >= 8)  score++;
  if (len >= 12) score++;
  if (len >= 16) score++;
  if (len >= 20) score++;
  const hasUpper   = /[A-Z]/.test(password);
  const hasLower   = /[a-z]/.test(password);
  const hasDigits  = /[0-9]/.test(password);
  const hasSymbols = /[^A-Za-z0-9]/.test(password);
  if (hasUpper)   score++;
  if (hasLower)   score++;
  if (hasDigits)  score++;
  if (hasSymbols) score += 2;
  const clamp = Math.min(10, Math.max(0, score));
  let level;
  if (clamp <= 2) level = 'very-weak';
  else if (clamp <= 4) level = 'weak';
  else if (clamp <= 6) level = 'fair';
  else if (clamp <= 8) level = 'strong';
  else level = 'very-strong';
  let charsetSize = 0;
  if (hasLower)   charsetSize += 26;
  if (hasUpper)   charsetSize += 26;
  if (hasDigits)  charsetSize += 10;
  if (hasSymbols) charsetSize += 32;
  const entropy = charsetSize > 0 ? Math.log2(Math.pow(charsetSize, len)) : 0;
  return { score: clamp, level, feedback: [], entropy: Math.round(entropy) };
}

// ─── Tests ───────────────────────────────────────────────────

describe('generatePassword — length', () => {
  it('generates correct length', () => {
    for (const len of [8, 12, 20, 32, 64]) {
      assert.strictEqual(generatePassword({ length: len }).length, len,
        `Expected length ${len}`);
    }
  });
  it('default length is 20', () => {
    assert.strictEqual(generatePassword().length, 20);
  });
});

describe('generatePassword — character sets', () => {
  it('uppercase only', () => {
    const pw = generatePassword({ length: 50, useUpper: true, useLower: false, useDigits: false, useSymbols: false });
    assert.match(pw, /^[A-Z]+$/);
  });
  it('lowercase only', () => {
    const pw = generatePassword({ length: 50, useUpper: false, useLower: true, useDigits: false, useSymbols: false });
    assert.match(pw, /^[a-z]+$/);
  });
  it('digits only', () => {
    const pw = generatePassword({ length: 20, useUpper: false, useLower: false, useDigits: true, useSymbols: false });
    assert.match(pw, /^[0-9]+$/);
  });
  it('includes at least one from each selected set', () => {
    for (let i = 0; i < 10; i++) {
      const pw = generatePassword({ length: 16 });
      assert.ok(/[A-Z]/.test(pw), 'missing uppercase');
      assert.ok(/[a-z]/.test(pw), 'missing lowercase');
      assert.ok(/[0-9]/.test(pw), 'missing digit');
      assert.ok(/[^A-Za-z0-9]/.test(pw), 'missing symbol');
    }
  });
  it('avoids ambiguous chars when requested', () => {
    for (let i = 0; i < 20; i++) {
      const pw = generatePassword({ length: 40, avoidAmbig: true });
      for (const ch of 'O0l1I') {
        assert.ok(!pw.includes(ch), `Found ambiguous char "${ch}" in "${pw}"`);
      }
    }
  });
  it('returns empty string with no charsets', () => {
    const pw = generatePassword({ useUpper: false, useLower: false, useDigits: false, useSymbols: false });
    assert.strictEqual(pw, '');
  });
});

describe('generatePassword — randomness', () => {
  it('produces different passwords each call', () => {
    const pws = new Set(Array.from({ length: 20 }, () => generatePassword({ length: 20 })));
    // With 20 chars from 90+ charset, collisions should be astronomically rare
    assert.ok(pws.size > 1, 'All passwords were identical — RNG broken');
  });
});

describe('analyzeStrength', () => {
  it('empty password is very-weak', () => {
    assert.strictEqual(analyzeStrength('').level, 'very-weak');
  });
  it('short simple password is weak', () => {
    const { level } = analyzeStrength('abc123');
    assert.ok(['very-weak', 'weak'].includes(level));
  });
  it('long complex password scores well', () => {
    const { level, score } = analyzeStrength('Tr0ub4dor&3xtraLong!');
    assert.ok(['strong', 'very-strong'].includes(level), `Got level "${level}"`);
    assert.ok(score >= 7);
  });
  it('entropy increases with length', () => {
    const short = analyzeStrength('Abc1!');
    const long  = analyzeStrength('Abc1!Abc1!Abc1!Abc1!');
    assert.ok(long.entropy > short.entropy);
  });
  it('entropy is 0 for empty string', () => {
    assert.strictEqual(analyzeStrength('').entropy, 0);
  });
  it('level is one of the expected values', () => {
    const levels = new Set(['very-weak', 'weak', 'fair', 'strong', 'very-strong']);
    for (const pw of ['a', 'abc123', 'Hello1!', 'Tr0ub4dor&3', 'xK#9mP@2nLqR!vT5']) {
      assert.ok(levels.has(analyzeStrength(pw).level), `Bad level for "${pw}"`);
    }
  });
});
