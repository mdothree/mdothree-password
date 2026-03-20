// services/strengthMeter.js
// Password strength analysis

const COMMON_PATTERNS = [
  /^(.)\1+$/,               // All same character
  /^(012|123|234|345|456|567|678|789|890)+/i,
  /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)+/i,
  /^(qwerty|asdf|zxcv|qazwsx|password|pass|123456|letmein|welcome|admin|login)/i,
];

const COMMON_PASSWORDS = new Set([
  'password', 'password1', '123456', '12345678', 'qwerty', 'abc123',
  'monkey', 'letmein', 'dragon', '111111', 'baseball', 'iloveyou',
  'master', 'sunshine', 'ashley', 'bailey', 'passw0rd', 'shadow',
  'superman', 'michael', 'football',
]);

/**
 * Analyze password strength
 * @param {string} password
 * @returns {{ score: number, level: string, feedback: string[], entropy: number }}
 */
export function analyzeStrength(password) {
  if (!password) return { score: 0, level: 'very-weak', feedback: [], entropy: 0 };

  const len = password.length;
  const feedback = [];
  let score = 0;

  // Length
  if (len >= 8)  score += 1;
  if (len >= 12) score += 1;
  if (len >= 16) score += 1;
  if (len >= 20) score += 1;
  if (len < 8)   feedback.push('Use at least 8 characters');
  if (len < 12)  feedback.push('12+ characters is recommended');

  // Character variety
  const hasUpper   = /[A-Z]/.test(password);
  const hasLower   = /[a-z]/.test(password);
  const hasDigits  = /[0-9]/.test(password);
  const hasSymbols = /[^A-Za-z0-9]/.test(password);

  if (hasUpper)   score += 1;
  if (hasLower)   score += 1;
  if (hasDigits)  score += 1;
  if (hasSymbols) score += 2;

  if (!hasUpper)   feedback.push('Add uppercase letters');
  if (!hasLower)   feedback.push('Add lowercase letters');
  if (!hasDigits)  feedback.push('Add numbers');
  if (!hasSymbols) feedback.push('Add special characters');

  // Penalize common patterns
  const lc = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lc)) {
    score = Math.max(0, score - 5);
    feedback.push('This is a very common password');
  }

  for (const pattern of COMMON_PATTERNS) {
    if (pattern.test(password)) {
      score = Math.max(0, score - 2);
      feedback.push('Avoid predictable patterns');
      break;
    }
  }

  // Penalize repeated chars
  if (/(.)\1{2,}/.test(password)) {
    score = Math.max(0, score - 1);
    feedback.push('Avoid repeated characters');
  }

  // Entropy estimation
  let charsetSize = 0;
  if (hasLower)   charsetSize += 26;
  if (hasUpper)   charsetSize += 26;
  if (hasDigits)  charsetSize += 10;
  if (hasSymbols) charsetSize += 32;
  const entropy = charsetSize > 0 ? Math.log2(Math.pow(charsetSize, len)) : 0;

  const clampedScore = Math.min(10, Math.max(0, score));

  let level;
  if (clampedScore <= 2) level = 'very-weak';
  else if (clampedScore <= 4) level = 'weak';
  else if (clampedScore <= 6) level = 'fair';
  else if (clampedScore <= 8) level = 'strong';
  else level = 'very-strong';

  return {
    score: clampedScore,
    level,
    feedback: [...new Set(feedback)].slice(0, 3),
    entropy: Math.round(entropy),
  };
}

export const LEVEL_LABELS = {
  'very-weak':   'Very Weak',
  'weak':        'Weak',
  'fair':        'Fair',
  'strong':      'Strong',
  'very-strong': 'Very Strong',
};
