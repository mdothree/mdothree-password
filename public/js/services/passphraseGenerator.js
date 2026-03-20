// services/passphraseGenerator.js
// EFF wordlist-inspired passphrase generation

// Compact 200-word list (subset of EFF large wordlist for bundle size)
const WORDS = [
  'abandon','ability','absence','account','achieve','acquire','address','advance',
  'adverse','airport','ancient','announce','antenna','anxiety','applied','approve',
  'archive','arrange','arrival','article','assault','attempt','average','balance',
  'barrier','benefit','blanket','blossom','bracket','buffalo','builder','cabinet',
  'capable','captain','capture','careful','catalog','ceiling','central','century',
  'chapter','charity','chicken','circuit','classic','climate','cluster','collect',
  'comfort','command','common','compact','concept','concern','connect','consume',
  'contest','control','convert','council','country','courage','created','crystal',
  'culture','curious','current','curtain','cushion','customer','cylinder','dancing',
  'daylight','decimal','defeat','deliver','density','deposit','descend','deserve',
  'despite','develop','devoted','digital','dismiss','display','distant','disturb',
  'division','dolphin','dominant','doorbell','dormant','drought','dynamic','eastern',
  'economy','edition','embrace','emerald','emotion','enforce','enhance','enormous',
  'enquire','essence','evening','examine','example','exclude','execute','explore',
  'express','extreme','factory','failure','fantasy','feather','fiction','fighter',
  'finance','fitness','flatten','fortune','forward','freedom','furnish','gallery',
  'garbage','general','genuine','geology','gesture','glowing','golden','gravity',
  'harvest','heading','healthy','helpful','history','horizon','ignite','imagine',
  'include','initial','inquiry','insight','install','island','journey','justice',
  'kingdom','kitchen','knowing','launch','league','legend','library','limited',
  'logical','loyalty','machine','managed','maximum','meaning','measure','medical',
  'memory','mention','message','mission','mixture','monitor','morning','mountain',
  'network','neutral','nothing','observe','obvious','opening','optical','orbital',
  'outcome','outline','package','pattern','payment','perfect','perform','picture',
  'plastic','plateau','podcast','popular','portion','protect','provide','purpose',
  'qualify','quantum','quarter','radical','ranking','rapidly','realize','rebuild',
  'receive','reflect','release','replace','reserve','results','reverse','science',
  'section','segment','service','shelter','silence','similar','society','someone',
  'spatial','special','station','storage','subject','support','surface','survive',
  'tactic','teacher','textile','thermal','thunder','tonight','traffic','transfer',
  'triumph','typical','undergo','uniform','victory','village','visitor','vitamin',
  'weather','welcome','western','windows','working','written','yellow','zealous',
];

/**
 * Generate a passphrase from random words
 * @param {Object} opts
 * @param {number} opts.wordCount - Number of words (default 4)
 * @param {string} opts.separator - Separator between words (default '-')
 * @param {boolean} opts.capitalize - Capitalize each word
 * @param {boolean} opts.addNumber - Append a random number
 * @param {boolean} opts.addSymbol - Append a random symbol
 * @returns {string}
 */
export function generatePassphrase({
  wordCount = 4,
  separator = '-',
  capitalize = false,
  addNumber = false,
  addSymbol = false,
} = {}) {
  const words = [];
  for (let i = 0; i < wordCount; i++) {
    const idx = secureRandInt(WORDS.length);
    let word = WORDS[idx];
    if (capitalize) word = word[0].toUpperCase() + word.slice(1);
    words.push(word);
  }

  let passphrase = words.join(separator);
  if (addNumber) passphrase += secureRandInt(100).toString().padStart(2, '0');
  if (addSymbol) passphrase += '!@#$%'[secureRandInt(5)];

  return passphrase;
}

/**
 * Estimate passphrase strength
 * @param {number} wordCount
 * @returns {{ bits: number, crackTime: string }}
 */
export function estimatePassphraseEntropy(wordCount) {
  const bits = Math.log2(Math.pow(WORDS.length, wordCount));
  let crackTime;
  if (bits < 40) crackTime = 'Minutes';
  else if (bits < 60) crackTime = 'Years';
  else if (bits < 80) crackTime = 'Centuries';
  else crackTime = 'Practically uncrackable';
  return { bits: Math.round(bits), crackTime };
}

function secureRandInt(max) {
  return crypto.getRandomValues(new Uint32Array(1))[0] % max;
}
