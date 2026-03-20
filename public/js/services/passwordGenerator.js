// services/passwordGenerator.js
// Cryptographically secure password generation

const UPPER   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER   = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS  = '0123456789';
const AMBIG   = 'O0l1I';

/**
 * Generate a single secure password
 * @param {Object} opts
 * @param {number}  opts.length       - Password length (default 20)
 * @param {boolean} opts.useUpper     - Include uppercase
 * @param {boolean} opts.useLower     - Include lowercase
 * @param {boolean} opts.useDigits    - Include digits
 * @param {boolean} opts.useSymbols   - Include symbols
 * @param {boolean} opts.avoidAmbig   - Remove ambiguous chars (0, O, l, 1)
 * @param {string}  opts.symbols      - Custom symbol set
 * @returns {string}
 */
export function generatePassword({
  length = 20,
  useUpper = true,
  useLower = true,
  useDigits = true,
  useSymbols = true,
  avoidAmbig = false,
  symbols = '!@#$%^&*()-_=+[]{}|;:,.<>?',
} = {}) {
  let charset = '';
  const required = [];

  if (useUpper)   { const c = avoidAmbig ? removeChars(UPPER, AMBIG) : UPPER;   charset += c; required.push(randomFrom(c)); }
  if (useLower)   { const c = avoidAmbig ? removeChars(LOWER, AMBIG) : LOWER;   charset += c; required.push(randomFrom(c)); }
  if (useDigits)  { const c = avoidAmbig ? removeChars(DIGITS, AMBIG) : DIGITS; charset += c; required.push(randomFrom(c)); }
  if (useSymbols && symbols) { charset += symbols; required.push(randomFrom(symbols)); }

  if (!charset) return '';

  // Fill remaining length with random chars from full charset
  const remaining = length - required.length;
  const password = [...required];
  for (let i = 0; i < remaining; i++) {
    password.push(randomFrom(charset));
  }

  // Fisher-Yates shuffle
  for (let i = password.length - 1; i > 0; i--) {
    const j = secureRandInt(i + 1);
    [password[i], password[j]] = [password[j], password[i]];
  }

  return password.join('');
}

/**
 * Generate multiple passwords
 * @param {Object} opts
 * @param {number} count
 * @returns {string[]}
 */
export function generatePasswords(opts, count = 1) {
  return Array.from({ length: count }, () => generatePassword(opts));
}

// ---- Helpers ----
function removeChars(str, chars) {
  return str.split('').filter(c => !chars.includes(c)).join('');
}

function randomFrom(str) {
  return str[secureRandInt(str.length)];
}

function secureRandInt(max) {
  const arr = crypto.getRandomValues(new Uint32Array(1));
  return arr[0] % max;
}
