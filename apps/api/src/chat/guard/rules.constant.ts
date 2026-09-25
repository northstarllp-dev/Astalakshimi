/**
 * Contact-info & address leakage moderation for in-app chat.
 *
 * WHY THIS IS STRUCTURED DIFFERENTLY FROM PLAIN REGEX-ON-RAW-TEXT:
 * Regex matched directly against raw user text is trivially bypassed by:
 *   - inserting spaces/dots/dashes between digits ("98 765 . 43210")
 *   - spelling numbers out ("nine eight seven six five...")
 *   - "double"/"triple" shorthand ("double nine double eight seven...")
 *   - digit/letter homoglyphs ("98765432lO" — capital I / lowercase l for 1, O for 0)
 *   - keycap emoji digits (9️⃣8️⃣7️⃣...)
 *   - zero-width characters and full-width unicode variants
 *   - transliterated regional-language number words and solicitation phrases
 *     (Tamil/Telugu/Kannada/Malayalam users rarely type in native script in chat —
 *      they type Tanglish/Kanglish/Tenglish/Manglish in Latin letters)
 *
 * So: normalize first, THEN run patterns against the normalized string.
 * Always run this server-side. Never trust a client-side check alone.
 *
 * IMPORTANT LIMITATIONS (read before treating this as a complete solution):
 *   1. No regex/wordlist system catches everything. Users will invent new
 *      evasions faster than you can patch rules. Treat this as tier 1 of a
 *      layered defense, not the whole defense (see bottom of file).
 *   2. This cannot see phone numbers sent as IMAGES, screenshots, or VOICE
 *      NOTES. That's a common bypass once text is filtered — you need
 *      OCR on images and ASR on audio if your app supports those message types.
 *   3. The regional-language phrase lists below are a starting point, not
 *      exhaustive — transliteration spelling is not standardized (e.g. "kudunga"
 *      vs "kodunga" vs "kudunka"). Budget for your moderation team to keep
 *      extending PHRASE_WORDLISTS from real flagged/missed messages.
 */

// ---------------------------------------------------------------------------
// 1. NORMALIZATION
// ---------------------------------------------------------------------------

const ZERO_WIDTH_RE = /[\u200B-\u200F\uFEFF\u2060\u00AD]/g;

// Digit-lookalike letters commonly substituted to dodge digit regexes.
// Applied ONLY inside runs that already look digit-adjacent, so we don't
// mangle normal words — see maskLatinDigitLookalikes().
const LEET_DIGIT_MAP: Record<string, string> = {
  o: '0', O: '0',
  i: '1', I: '1', l: '1', L: '1', '|': '1',
  z: '2', Z: '2',
  e: '3', E: '3',
  a: '4', A: '4',
  s: '5', S: '5',
  g: '6', G: '6', b: '6',
  t: '7', T: '7',
  B: '8',
  q: '9', g9: '9',
};

// Keycap / enclosed digit emoji -> plain digit
const DIGIT_EMOJI_MAP: Record<string, string> = {
  '0️⃣': '0', '1️⃣': '1', '2️⃣': '2', '3️⃣': '3', '4️⃣': '4',
  '5️⃣': '5', '6️⃣': '6', '7️⃣': '7', '8️⃣': '8', '9️⃣': '9',
  '🔟': '10',
  '⓪': '0', '①': '1', '②': '2', '③': '3', '④': '4',
  '⑤': '5', '⑥': '6', '⑦': '7', '⑧': '8', '⑨': '9',
};

// English spelled-out digits
const WORD_DIGITS_EN: Record<string, string> = {
  zero: '0', oh: '0', one: '1', two: '2', three: '3', four: '4', for: '4',
  five: '5', six: '6', seven: '7', eight: '8', nine: '9', ate: '8',
};

// Common Tamil / Telugu / Kannada / Malayalam transliterations for digits,
// as typed casually in Latin script. Not exhaustive — extend as needed.
const WORD_DIGITS_REGIONAL: Record<string, string> = {
  // Tamil
  sunnya: '0', onnu: '1', rendu: '2', moonu: '3', mundru: '3', naalu: '4',
  ainthu: '5', anju: '5', aaru: '6', elu: '7', ezhu: '7', ettu: '8', onbathu: '9', ombathu: '9',
  // Telugu
  sunna: '0', okati: '1', rendhu: '2', moodu: '3', naalugu: '4', aidu: '5',
  aaru_te: '6', edu: '7', enimidi: '8', tommidi: '9',
  // Kannada
  sunne: '0', ondu: '1', eradu: '2', mooru: '3', naalku: '4', aidhu: '5',
  aaru_kn: '6', elu_kn: '7', entu: '8', ombattu: '9',
  // Malayalam
  poojyam: '0', onnu_ml: '1', randu: '2', moonu_ml: '3', naalu_ml: '4',
  anchu: '5', aaru_ml: '6', ezhu_ml: '7', ettu_ml: '8', onpathu: '9',
};

const ALL_WORD_DIGITS: Record<string, string> = { ...WORD_DIGITS_EN, ...WORD_DIGITS_REGIONAL };

/**
 * Full normalization pipeline. Run this on every outbound chat message
 * BEFORE running the pattern sets below.
 */
export function normalizeForModeration(raw: string): string {
  let text = raw;

  // Unicode compatibility fold (full-width digits/letters -> ascii, etc.)
  text = text.normalize('NFKC');

  // Strip invisible / zero-width characters used to break up patterns
  text = text.replace(ZERO_WIDTH_RE, '');

  // Replace digit emoji
  for (const [emoji, digit] of Object.entries(DIGIT_EMOJI_MAP)) {
    text = text.split(emoji).join(digit);
  }

  text = text.toLowerCase();

  // "priya(at)gmail(dot)com" / "priya [at] gmail [dot] com" -> "priya@gmail.com"
  text = text.replace(/[\[({]\s*(?:at|dot)\s*[\])}]/g, (token) =>
    token.includes('dot') ? '.' : '@',
  );

  // Expand "double X" / "triple X" (e.g. "double nine" -> "99", "triple 8" -> "888")
  text = text.replace(/\b(double|triple)\s+([a-z0-9]+)\b/gi, (_m, mult, val) => {
    const digit = ALL_WORD_DIGITS[val] ?? (/^\d$/.test(val) ? val : null);
    if (!digit) return _m;
    const count = mult.toLowerCase() === 'double' ? 2 : 3;
    return digit.repeat(count);
  });

  // Replace spelled-out digit words (English + regional transliterations)
  text = text.replace(/\b[a-z]+\b/gi, (word) => ALL_WORD_DIGITS[word.toLowerCase()] ?? word);

  // Collapse separators BETWEEN digits: "98 76-54.32 10" -> "9876543210"
  // Repeat pass since overlapping separators can remain after one pass.
  for (let i = 0; i < 3; i++) {
    text = text.replace(/(\d)[\s.\-_]+(?=\d)/g, '$1');
  }

  // Normalize obvious letter/digit substitutions ONLY within tokens that are
  // majority-digit already (avoids corrupting real words like "late" or "isle").
  text = text.replace(/\b[a-z0-9]{6,}\b/gi, (token) => {
    const digitCount = (token.match(/\d/g) || []).length;
    if (digitCount < token.length * 0.4) return token; // not digit-like enough, leave alone
    return token
      .split('')
      .map((ch) => LEET_DIGIT_MAP[ch] ?? ch)
      .join('');
  });

  // Collapse excess whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

// ---------------------------------------------------------------------------
// 2. PATTERN SETS (run against normalizeForModeration() output)
// ---------------------------------------------------------------------------

export const PHONE_PATTERNS = [
  /(?:\+|0{0,2})91[\s\-]*\d{10}\b/g,
  /\b[6-9]\d{9}\b/g, // Indian mobile numbers start 6-9, exactly 10 digits — far fewer false positives than \d{8,15}
  /\b\d{5}[\s\-]?\d{5}\b/g, // common "12345 67890" spacing pattern pre-collapse fallback
];

export const EMAIL_PATTERNS = [
  /[a-z0-9._%+-]+\s*(?:@|\bat\b)\s*[a-z0-9.-]+\s*(?:\.|\bdot\b)\s*[a-z]{2,}/gi,
];

// UPI handles: name@psp-handle. Checked against known PSP suffixes to avoid
// treating this as a duplicate of the generic email pattern (which it
// previously was, causing double-matches).
const UPI_HANDLES = [
  'upi', 'okhdfcbank', 'okicici', 'oksbi', 'okaxis', 'paytm', 'ybl', 'ibl',
  'axl', 'apl', 'sbi', 'icici', 'hdfcbank', 'idfcbank', 'fbl', 'jio', 'airtel',
];
export const UPI_PATTERN = new RegExp(
  `[a-z0-9.\\-_]{2,64}@(?:${UPI_HANDLES.join('|')})\\b`,
  'gi'
);

export const SOCIAL_URL_PATTERNS = [
  /(?:instagram\.com|instagr\.am)\/[a-z0-9_.]+/gi,
  /facebook\.com\/[a-z0-9_.]+/gi,
  /\bfb\.me\/[a-z0-9_.]+/gi,
  /t\.me\/[a-z0-9_.]+/gi,
  /wa\.me\/\d+/gi,
  /api\.whatsapp\.com\/send[^\s]*/gi,
  /snapchat\.com\/add\/[a-z0-9_.]+/gi,
  /(?:www\.|https?:\/\/)[^\s]+/gi,
  /maps\.(?:google|apple|bing)\.(?:com|co\.in)\/[^\s]*/gi,
  /goo\.gl\/maps\/[^\s]*/gi,
  /maps\.app\.goo\.gl\/[^\s]*/gi,
];

// Handle mentions WITHOUT a full url — "ig: myname", "insta is my_name98", "@myhandle".
// A separator or "is/id/handle" is required so "instagram reels" is not a handle.
export const SOCIAL_HANDLE_PATTERNS = [
  /\b(?:ig|insta|instagram)(?:\s*[:\-=]\s*|\s+(?:is|id|handle|account)\s+)@?[a-z0-9_.]{3,30}\b/gi,
  /\b(?:tg|telegram)(?:\s*[:\-=]\s*|\s+(?:is|id|handle|account)\s+)@?[a-z0-9_.]{3,30}\b/gi,
  /\b(?:sc|snap|snapchat)(?:\s*[:\-=]\s*|\s+(?:is|id|handle|account)\s+)@?[a-z0-9_.]{3,30}\b/gi,
  /@[a-z][a-z0-9_.]{2,29}\b/g, // generic @handle
];

export const MESSAGING_APP_MENTION_PATTERNS = [
  /\b(?:whatsapp|wtsapp|whats\s*app|wa\b|w\.a\.?)\b/gi,
  /\btelegram\b|\btg\b/gi,
  /\bsignal\b/gi,
  /\bhangouts?\b/gi,
  /\bviber\b/gi,
  /\bimo\b/gi,
];

// ADDRESS DATA — kept mostly as-is but PIN code demoted to low-confidence
// (see scoring section) because a bare 6-digit number is common in
// non-address contexts (ages typed wrong, OTPs pasted by mistake, etc.)
export const ADDRESS_PATTERNS = [
  /\b(?:flat|door|house|plot|shop|unit|room|block|floor|apt|apartment)\s*(?:no\.?|num\.?|#|number)?\s*\d+[\w\-\/]*/gi,
  /\b(?:no\.?|#)\s*\d+[\w\-\/]*/gi,
  /\b(?:pin\s*code|pincode|zip\s*code|zipcode)\b.{0,30}\b\d{6}\b/gi,
  /\b\w[\w\s]{1,40}\b(?:street|st\.?|road|rd\.?|lane|ln\.?|avenue|ave\.?|nagar|colony|layout|extension|extn\.?|cross|main|circle|marg|path|bypass|highway|hwy\.?|enclave|vihar|puram|nagara|salai|galli|gali)\b/gi,
  /\b\w[\w\s]{1,40}\b(?:area|sector|phase|zone|village|taluk|tehsil|mandal|ward|division)\b/gi,
  /\b(?:near|beside|opposite|opp\.?|adjacent to|next to|behind|in front of|above|below)\b.{0,60}(?:temple|mosque|church|school|hospital|mall|park|market|station|stop|petrol|bunk|bank|atm|post office|office|building|tower|complex)\b/gi,
  /\b(?:landmark|locality|address|pincode|zipcode)\s*[:=\-]\s*\S+/gi,
];

export const PIN_CODE_LOW_CONFIDENCE = /\b\d{6}\b/g; // only meaningful WITH nearby address context — see scoring

// ---------------------------------------------------------------------------
// 3. SOLICITATION PHRASES — English + Tanglish/Tenglish/Kanglish/Manglish
// ---------------------------------------------------------------------------

export const SOLICITATION_PATTERNS_EN = [
  /(?:give|send|share|drop|tell me|what is|what's)\b.*\b(?:number|phone|whatsapp|wa|insta|instagram|ig|snapchat|snap|telegram|tg|fb|facebook)\b/gi,
  /(?:can i|may i|could i|can we)\b.*\b(?:have|get|know|ask)\b.*\b(?:number|phone|whatsapp|wa|insta|instagram|ig|snapchat|snap|telegram|tg|fb|facebook)\b/gi,
  /(?:can|shall|should) we (?:talk|chat|connect|speak) (?:on|over|outside|directly)\b/gi,
  /can i (?:call|text|message|ping) you\b/gi,
  /connect on (whatsapp|insta|instagram|snapchat|telegram|fb|facebook)/gi,
  /(?:message|ping|text|hit me up) (?:me )?on\b/gi,
  /(?:give|send|share|drop|tell me|what is|what's|can i get|may i have)\b.*\b(?:address|location|place|home|house|flat|locality|area|landmark|pincode|zip)/gi,
  /where\b.*\b(?:do you|are you|you)\b.*\b(?:stay|live|reside|based|located|from)/gi,
  /\byour\b.*\b(?:address|location|home|house|flat|apartment|place|area|locality)\b/gi,
  /(?:come|visit|drop by|stop by|swing by)\b.*\b(?:my|our)\b.*\b(?:place|home|house|flat|apartment|office)\b/gi,
  /let(?:'s| us)\b.*\b(?:meet|catch up)\b.*\b(?:at|near|outside|in person|face to face)\b/gi,
  /(?:i will|i'll|we will|we'll)\b.*\bcome\b.*\bto your\b/gi,
  /(?:exchange|swap|trade)\b.*\b(?:number|contact|address|location|details)\b/gi,
  /(?:share|send)\b.*\b(?:your|my)\b.*\b(?:address|location|contact|number|details)\b/gi,
];

// Transliterated regional-language solicitation phrases. Spelling varies
// person to person — these cover the most common renderings. Extend from
// your moderation logs; treat this list as living, not final.
export const SOLICITATION_PATTERNS_REGIONAL = [
  // Tamil (asking for number / contact)
  /number\s*(kudunga|kudunka|kudungo|sollunga|solunga|solli|irukka|share\s*pannunga|share\s*pannu)/gi,
  /(unga|ungal|un)\s*number\s*(enna|solli|kudunga)?/gi,
  /nampar\s*(kudunga|solli|enna)/gi,
  /call\s*pannunga/gi,
  /wt?sapp\s*(number\s*)?(irukka|kudunga|share\s*pannunga)/gi,

  // Telugu
  /number\s*(cheppu|ivvu|cheppandi|ivvandi)/gi,
  /mee\s*number\s*(enti|cheppandi)?/gi,
  /phone\s*number\s*(cheppandi|ivvandi)/gi,

  // Kannada
  /number\s*(kodi|helthira|kodthira)/gi,
  /nimma\s*number\s*(enu|kodi)?/gi,

  // Malayalam
  /number\s*(tharuo|parayamo|tharumo)/gi,
  /ningalude\s*number\s*(entha|tharumo)?/gi,

  // Cross-language: asking where someone lives, transliterated
  /(eng[ae]?|evide|ekkada|elli)\s*(irukireenga|irukkinga|iruken|iruke|untaru|iddira)/gi, // "where do you stay" variants
];

export const SOLICITATION_PATTERNS = [
  ...SOLICITATION_PATTERNS_EN,
  ...SOLICITATION_PATTERNS_REGIONAL,
];

// ---------------------------------------------------------------------------
// 4. SCORING — combine matches into a confidence tier instead of binary block
// ---------------------------------------------------------------------------

export type ModerationSeverity = 'block' | 'review' | 'allow';

export interface ModerationResult {
  severity: ModerationSeverity;
  score: number;
  matchedCategories: string[];
}

const CATEGORY_WEIGHTS: Record<string, number> = {
  phone: 10,
  email: 10,
  upi: 9,
  socialUrl: 10,
  socialHandle: 10,
  messagingAppMention: 2, // alone this is a mention, not contact data
  address: 10,
  pinCodeOnly: 2, // a bare 6-digit number is weak; "pincode 600001" is an address
  solicitation: 10,
};

const BLOCK_THRESHOLD = 8;
const REVIEW_THRESHOLD = 4;

function testAny(patterns: RegExp[], text: string): boolean {
  return patterns.some((re) => {
    re.lastIndex = 0;
    return re.test(text);
  });
}

/**
 * Score a single outbound message. Run normalizeForModeration() first.
 * Combining signals (e.g. "messaging app mention" + "social handle") pushes
 * a message over BLOCK_THRESHOLD even when no single pattern alone is
 * conclusive — this is what catches "insta - myname98, dm me" style evasions
 * that a single bare regex would miss or that would false-positive alone.
 */
export function scoreMessage(rawText: string): ModerationResult {
  const text = normalizeForModeration(rawText);
  const matchedCategories: string[] = [];
  let score = 0;

  const add = (category: keyof typeof CATEGORY_WEIGHTS, matched: boolean) => {
    if (matched) {
      matchedCategories.push(category);
      score += CATEGORY_WEIGHTS[category];
    }
  };

  add('phone', testAny(PHONE_PATTERNS, text));
  add('email', testAny(EMAIL_PATTERNS, text));
  add('upi', testAny([UPI_PATTERN], text));
  add('socialUrl', testAny(SOCIAL_URL_PATTERNS, text));
  add('socialHandle', testAny(SOCIAL_HANDLE_PATTERNS, text));
  add('messagingAppMention', testAny(MESSAGING_APP_MENTION_PATTERNS, text));
  add('address', testAny(ADDRESS_PATTERNS, text));
  add('solicitation', testAny(SOLICITATION_PATTERNS, text));

  // PIN code only counts if no stronger address signal already fired —
  // otherwise it's redundant; alone, it's weak evidence.
  if (!matchedCategories.includes('address')) {
    add('pinCodeOnly', testAny([PIN_CODE_LOW_CONFIDENCE], text));
  }

  let severity: ModerationSeverity = 'allow';
  if (score >= BLOCK_THRESHOLD) severity = 'block';
  else if (score >= REVIEW_THRESHOLD) severity = 'review';

  return { severity, score, matchedCategories };
}

/**
 * -----------------------------------------------------------------------
 * RECOMMENDED LAYERED DEFENSE (beyond this file):
 * -----------------------------------------------------------------------
 * 1. Server-side enforcement only — never trust client-side filtering,
 *    it can be bypassed by calling your send-message API directly.
 * 2. Route 'review' severity to a moderation queue instead of auto-allow;
 *    route 'block' to auto-reject with a user-facing warning; log both for
 *    pattern-list tuning.
 * 3. Add OCR on uploaded images and ASR (speech-to-text) on voice notes,
 *    then run the same scoreMessage() pipeline on the extracted text —
 *    otherwise users just screenshot their number or say it in a voice note.
 * 4. Add anomaly detection independent of content: accounts that get
 *    blocked/reviewed repeatedly, or that send unusually many digit-heavy
 *    or short-lived-edited messages, warrant tighter rate limits or a
 *    manual trust review regardless of whether any single message matched.
 * 5. Progressive enforcement: warn on first review-tier match, escalate to
 *    temporary chat restriction on repeats, permanent restriction on clear
 *    intent (repeated block-tier attempts after warnings).
 * 6. Feed moderator-confirmed false positives/negatives back into this
 *    wordlist regularly — regional transliteration spelling drifts and
 *    users adapt quickly once they learn what gets blocked.
 * 7. Consider a lightweight ML/LLM classifier as a second opinion on
 *    'review' tier messages — it generalizes to novel phrasing this
 *    pattern list hasn't seen yet, which pure regex never will.
 * -----------------------------------------------------------------------
 */