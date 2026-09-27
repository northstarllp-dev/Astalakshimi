/**
 * Number-word parser for the chat contact guard.
 * Turns every way a user might type a phone number in words back into
 * digits so the downstream phone regex can catch it.
 */

// ---------------------------------------------------------------------------
// 1. NATIVE-SCRIPT DIGITS  (NFKC does not fold these)
// ---------------------------------------------------------------------------
const NATIVE_DIGIT_RANGES: Array<[number, number]> = [
  [0x0966, 0x096f], // Devanagari ०-९
  [0x09e6, 0x09ef], // Bengali ০-৯
  [0x0a66, 0x0a6f], // Gurmukhi ੦-੯
  [0x0ae6, 0x0aef], // Gujarati ૦-૯
  [0x0be6, 0x0bef], // Tamil ௦-௯
  [0x0c66, 0x0c6f], // Telugu ౦-౯
  [0x0ce6, 0x0cef], // Kannada ೦-೯
  [0x0d66, 0x0d6f], // Malayalam ൦-൯
];

function foldNativeDigits(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code === undefined) { out += ch; continue; }
    let folded: string | null = null;
    for (const [start, end] of NATIVE_DIGIT_RANGES) {
      if (code >= start && code <= end) { folded = String(code - start); break; }
    }
    out += folded ?? ch;
  }
  return out;
}

// ---------------------------------------------------------------------------
// 2. DIGIT-WORD MAPS
// ---------------------------------------------------------------------------
const UNAMBIGUOUS_WORDS: Record<string, string> = {
  // English digits
  zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5',
  six: '6', seven: '7', eight: '8', nine: '9',
  // English teens
  eleven: '11', twelve: '12', thirteen: '13', fourteen: '14', fifteen: '15',
  sixteen: '16', seventeen: '17', eighteen: '18', nineteen: '19',
  // English tens
  twenty: '20', thirty: '30', forty: '40', fourty: '40', fifty: '50',
  sixty: '60', seventy: '70', eighty: '80', ninety: '90',
  // Common misspellings
  nain: '9', nien: '9', sevan: '7', sevn: '7', fiv: '5', fyv: '5',
  eit: '8', ait: '8', zeero: '0', jero: '0', tree: '3', fore: '4', sixx: '6',
  ate: '8', oh: '0', o: '0',
  // Hindi (Latin)
  shunya: '0', shoonya: '0', ek: '1', do: '2', teen: '3', char: '4', chaar: '4',
  paanch: '5', chhe: '6', saat: '7', aath: '8', nau: '9', naus: '9',
  dus: '10', bees: '20', tees: '30', chalis: '40', pachas: '50',
  saath: '60', sattar: '70', assi: '80', nabbe: '90',
  // Tamil (Latin)
  sunnya: '0', onnu: '1', rendu: '2', moonu: '3', mundru: '3', naalu: '4',
  ainthu: '5', anju: '5', aaru_ta: '6', elu: '7', ezhu: '7', ettu: '8',
  onbathu: '9', ombathu: '9', patthu: '10', irupathu: '20', muppathu: '30',
  naarpadhu: '40', aimbadhu: '50', aarpathu: '60', ezhuapadhu: '70',
  enbadhu: '80', thonnooru: '90',
  // Telugu (Latin)
  sunna: '0', okati: '1', rendhu: '2', moodu: '3', naalugu: '4', aidu: '5',
  aaru: '6', edu: '7', enimidi: '8', tommidi: '9', padi: '10', iruvai: '20',
  muvai: '30', nalabhai: '40', ebhai: '50', aabhai: '60', debhai: '70',
  enabhai: '80', tombhai: '90',
  // Kannada (Latin)
  sunne: '0', ondu: '1', eradu: '2', mooru: '3', naalku: '4', aidhu: '5',
  aaru_kn: '6', elu_kn: '7', entu: '8', ombattu: '9', hattu: '10',
  ippattu: '20', muvattu: '30', nalavattu: '40', aivattu: '50', aravattu: '60',
  eluvattu: '70', embattu: '80', tombattu: '90',
  // Malayalam (Latin)
  poojyam: '0', onnu_ml: '1', randu: '2', moonu_ml: '3', naalu_ml: '4',
  anchu: '5', aaru_ml: '6', ezhu_ml: '7', ettu_ml: '8', onpathu: '9', pathu: '10',
  irupathu_ml: '20', muppathu_ml: '30', naalpathu: '40', anpathu: '50',
  aarupathu: '60', ezhipathu: '70', enpathu: '80', thonnooru_ml: '90',
};

const AMBIGUOUS_WORDS: Record<string, string> = {
  for: '4', to: '2', too: '2', won: '1', do: '2', no: '0',
  sat: '7', che: '6', aat: '8', ath: '8', ten: '10',
};

const NATIVE_SCRIPT_WORDS: Record<string, string> = {
  'शून्य': '0', 'एक': '1', 'दो': '2', 'तीन': '3', 'चार': '4', 'पाँच': '5',
  'पांच': '5', 'छह': '6', 'सात': '7', 'आठ': '8', 'नौ': '9', 'दस': '10',
  'சுழியம்': '0', 'ஒன்று': '1', 'இரண்டு': '2', 'மூன்று': '3', 'நான்கு': '4',
  'ஐந்து': '5', 'ஆறு': '6', 'ஏழு': '7', 'எட்டு': '8', 'ஒன்பது': '9', 'பத்து': '10',
};

// ---------------------------------------------------------------------------
// 3. HELPERS
// ---------------------------------------------------------------------------
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function squeezeRepeats(text: string): string {
  return text.replace(/([a-z])\1{2,}/gi, '$1$1');
}

function joinLetterSpaced(text: string): string {
  // Join any run of single letters separated by spaces/dots/dashes into one
  // token. splitConcatenated will then turn digit-word runs into digits.
  return text.replace(/\b([a-z])((?:[\s.\-]+[a-z])){2,}\b/gi, (match) => {
    const letters = match.replace(/[\s.\-]+/g, '');
    return letters.toLowerCase();
  });
}

const UNAMBIGUOUS_RE = new RegExp(
  `\\b(${Object.keys(UNAMBIGUOUS_WORDS).map(escapeRe).join('|')})\\b`, 'gi'
);
const AMBIGUOUS_RE = new RegExp(
  `\\b(${Object.keys(AMBIGUOUS_WORDS).map(escapeRe).join('|')})\\b`, 'gi'
);
const NATIVE_SCRIPT_RE = new RegExp(
  Object.keys(NATIVE_SCRIPT_WORDS).map(escapeRe).join('|'), 'gu'
);

function replaceUnambiguous(text: string): string {
  return text.replace(UNAMBIGUOUS_RE, (w) => UNAMBIGUOUS_WORDS[w.toLowerCase()] ?? w);
}

function replaceNativeScript(text: string): string {
  return text.replace(NATIVE_SCRIPT_RE, (w) => NATIVE_SCRIPT_WORDS[w] ?? w);
}

/** Ambiguous words convert ONLY when adjacent to a digit. Repeat until stable. */
function replaceAmbiguous(text: string): string {
  let prev: string;
  let cur = text;
  let guard = 0;
  do {
    prev = cur;
    cur = ambiguousPass(prev);
    guard++;
  } while (cur !== prev && guard < 6);
  return cur;
}

function ambiguousPass(text: string): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);
    AMBIGUOUS_RE.lastIndex = 0;
    const m = AMBIGUOUS_RE.exec(rest);
    if (!m || m.index === undefined) { out += rest; break; }
    out += rest.slice(0, m.index);
    const matchStart = i + m.index;
    const matchEnd = matchStart + m[0].length;
    const digit = AMBIGUOUS_WORDS[m[0].toLowerCase()];
    // Look at the nearest non-space char before and after (skip spaces/dashes/dots).
    let before = '';
    for (let k = matchStart - 1; k >= 0; k--) {
      if (!/[\s.\-_]/.test(text[k])) { before = text[k]; break; }
    }
    let after = '';
    for (let k = matchEnd; k < text.length; k++) {
      if (!/[\s.\-_]/.test(text[k])) { after = text[k]; break; }
    }
    if (digit && (/\d/.test(before) || /\d/.test(after))) out += digit;
    else out += m[0];
    i = matchEnd;
  }
  AMBIGUOUS_RE.lastIndex = 0;
  return out;
}

// ---------------------------------------------------------------------------
// 4. TENS + ONES ("ninety eight" -> 98)
// ---------------------------------------------------------------------------
const TENS_WORDS = [
  'twenty','thirty','forty','fourty','fifty','sixty','seventy','eighty','ninety',
  'irupathu_ml','muppathu_ml','naalpathu','anpathu','aarupathu','ezhipathu',
  'enpathu','thonnooru_ml','iruvai','muvai','nalabhai','ebhai','aabhai',
  'debhai','enabhai','tombhai','ippattu','muvattu','nalavattu','aivattu',
  'aravattu','eluvattu','embattu','tombattu','irupathu','muppathu','naarpadhu',
  'aimbadhu','enbadhu','tees','chalis','pachas','saath','sattar','assi','nabbe',
];
const TENS_RE = new RegExp(
  `\\b(${TENS_WORDS.join('|')})\\s+([a-z0-9]+)\\b`, 'gi'
);

function composeTens(text: string): string {
  return text.replace(TENS_RE, (match, tens, ones) => {
    const tensVal = UNAMBIGUOUS_WORDS[tens.toLowerCase()];
    if (!tensVal || !tensVal.endsWith('0')) return match;
    const onesVal = UNAMBIGUOUS_WORDS[ones.toLowerCase()];
    if (onesVal === undefined) return match;
    if (!/^\d$/.test(onesVal)) return match;
    return tensVal.slice(0, -1) + onesVal;
  });
}

// ---------------------------------------------------------------------------
// 5. HUNDRED ("nine hundred" -> 900)
// ---------------------------------------------------------------------------
function composeHundred(text: string): string {
  text = text.replace(
    /\b([1-9])\s+hundred\s+([1-9]\d?)\b/gi,
    (_m, h, rest) => String(parseInt(h, 10) * 100 + parseInt(rest, 10))
  );
  text = text.replace(/\b([1-9])\s+hundred\b/gi, (_m, h) => String(parseInt(h, 10) * 100));
  text = text.replace(/(\d)\s+hundred\b/gi, '$100');
  return text;
}

// ---------------------------------------------------------------------------
// 6. CONCATENATED DIGIT WORDS ("nineeightseven" -> 987)
// ---------------------------------------------------------------------------
function splitConcatenated(text: string): string {
  return text.replace(/\b[a-z]{6,}\b/gi, (token) => {
    const lower = token.toLowerCase();
    let i = 0;
    let digits = '';
    while (i < lower.length) {
      let found = '';
      for (let len = Math.min(8, lower.length - i); len >= 2; len--) {
        const sub = lower.slice(i, i + len);
        if (UNAMBIGUOUS_WORDS[sub]) { found = sub; break; }
      }
      if (!found) return token;
      digits += UNAMBIGUOUS_WORDS[found];
      i += found.length;
    }
    return digits || token;
  });
}

// ---------------------------------------------------------------------------
// 7. MAIN ENTRY
// ---------------------------------------------------------------------------
export function convertNumberWords(raw: string): string {
  let text = raw;
  text = foldNativeDigits(text);
  text = replaceNativeScript(text);
  text = squeezeRepeats(text);
  text = joinLetterSpaced(text);
  text = splitConcatenated(text);
  text = replaceUnambiguous(text);
  text = composeTens(text);
  text = composeHundred(text);
  text = replaceAmbiguous(text);
  return text;
}
