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

import { convertNumberWords } from './number-words.util';

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

  // Convert numbers typed in words (English tens/teens, Hindi, regional,
  // native scripts, misspellings, letter-spaced, concatenated) into digits.
  // Replaces the old single-word pass below.
  text = convertNumberWords(text);

  // Expand "double X" / "triple X" / "quadruple X"
  text = text.replace(/\b(double|triple|quadruple)\s+([a-z0-9]+)\b/gi, (_m, mult, val) => {
    const digit = ALL_WORD_DIGITS[val] ?? (/^\d$/.test(val) ? val : null);
    if (!digit) return _m;
    const count = mult.toLowerCase() === 'double' ? 2 : mult.toLowerCase() === 'triple' ? 3 : 4;
    return digit.repeat(count);
  });

  // Replace spelled-out single-digit words (legacy safety net; convertNumberWords
  // already handled most, this catches anything missed).
  text = text.replace(/\b[a-z]+\b/gi, (word) => ALL_WORD_DIGITS[word.toLowerCase()] ?? word);

  // Collapse separators BETWEEN digits: "98 76-54.32 10" -> "9876543210"
  // Also collapse commas, semicolons, colons, pipes, asterisks, hashes, tildes,
  // parentheses, plus signs, and the fillers "and"/"then"/"next" between digits.
  // "/" is left out so dates keep their shape.
  const FILLER_RE = /\s+(?:and|then|next)\s+/gi;
  for (let i = 0; i < 3; i++) {
    text = text.replace(/(\d)[\s.,;:|*#~()\-_]+(?=\d)/g, '$1');
    text = text.replace(/(\d)\s+(?:and|then|next)\s+(?=\d)/gi, '$1');
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
  // Indian mobile: optional +91 / 0, then 6-9 + 9 digits, not surrounded by other digits.
  /(?<!\d)(?:\+?91|0)?[6-9]\d{9}(?!\d)/g,
  // Landlines / international: any 8+ digit run not surrounded by digits.
  // Catches "044 2345 6789", "+1 415 555 0134", "09876543210", "call9876543210".
  /(?<!\d)\d{8,}(?!\d)/g,
  // Common "12345 67890" spacing pattern (kept as a fallback for pre-collapse).
  /\b\d{5}[\s\-]?\d{5}\b/g,
];

export const EMAIL_PATTERNS = [
  // Accept @, at, "at the rate", attherate, (at), [at], {at} as the "@".
  // Accept ., dot, (dot), [dot] as the ".".
  /[a-z0-9._%+-]+\s*(?:@|\bat\b|\bat\s+the\s+rate\b|\battherate\b|\(at\)|\[at\]|\{at\})\s*[a-z0-9.-]+\s*(?:\.|\bdot\b|\(dot\)|\[dot\])\s*[a-z]{2,}/gi,
];

// Bare email provider names ("priya sharma gmail", "send to my yahoo").
export const EMAIL_PROVIDER_PATTERN =
  /\b(?:gmail|googlemail|yahoo|ymail|outlook|hotmail|live\.com|rediff|rediffmail|icloud|proton|zoho|aol|msn)\b/gi;

// Bare domain ("priya.in", "xyz dot com", "priya dot in").
export const DOMAIN_PATTERN =
  /\b[a-z0-9][a-z0-9._-]*\s*(?:\.|\bdot\b)\s*(?:com|in|net|org|co\.in|co|io|me|info|biz|edu|gov)\b/gi;

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

// Handle mentions WITHOUT a full url — "ig: myname", "insta - my_name98", "@myhandle"
export const SOCIAL_HANDLE_PATTERNS = [
  /\b(?:ig|insta|instagram)\s*[:\-=]?\s*@?[a-z0-9_.]{3,30}\b/gi,
  /\b(?:tg|telegram)\s*[:\-=]?\s*@?[a-z0-9_.]{3,30}\b/gi,
  /\b(?:sc|snap|snapchat)\s*[:\-=]?\s*@?[a-z0-9_.]{3,30}\b/gi,
  /@[a-z][a-z0-9_.]{2,29}\b/g, // generic @handle
];

// Social platforms block when paired with a cue word either before OR after:
// me, my, id, handle, username, follow, add, search, find, dm, profile.
const SOCIAL_PLATFORM_NAMES =
  'instagram|insta|ig|facebook|fb|youtube|yt|linkedin|linked\\s*in|twitter|tweet|x\\.com|sharechat|moj|josh|threads|reddit|quora';
const SOCIAL_CUE_WORDS = 'me|my|id|handle|username|follow|add|search|find|dm|profile';
export const SOCIAL_PLATFORM_CUE_PATTERN = new RegExp(
  `\\b(?:${SOCIAL_PLATFORM_NAMES})\\b[^.]{0,40}?\\b(?:${SOCIAL_CUE_WORDS})\\b|\\b(?:${SOCIAL_CUE_WORDS})\\b[^.]{0,40}?\\b(?:${SOCIAL_PLATFORM_NAMES})\\b`,
  'gi'
);

export const MESSAGING_APP_MENTION_PATTERNS = [
  /\b(?:whatsapp|wtsapp|wtsp|wtsapp|whatsap|whats\s*app|wa\b|w\.a\.?)\b/gi,
  /\btelegram\b|\btg\b/gi,
  /\bsignal\b/gi,
  /\bhangouts?\b/gi,
  /\bviber\b/gi,
  /\bimo\b/gi,
  /\bskype\b/gi,
  /\bdiscord\b/gi,
  /\bsnapchat\b|\bsnap\b/gi,
  /\bzoom\b/gi,
  /\bgoogle\s*meet\b/gi,
  /\bduo\b|\bfacetime\b/gi,
  /\bmessenger\b|\bfb\s*messenger\b/gi,
  /\bhike\b/gi,
  /\bwechat\b/gi,
  /\bline\b/gi,
];

// SHORT FORMS / SLANG — casual chat rarely spells "number" or "instagram" in
// full. These need tighter context than a bare word match would allow, since
// short tokens like "no" and "pm" collide with everyday English ("no problem",
// "5 pm") — so each pattern below requires an adjacent contact-request cue
// (a pronoun, a platform prefix, or "me"/"pls") rather than matching alone.
export const SHORT_FORM_PATTERNS = [
  // "unga no?", "ur no", "your no", "u no pls", "yr num" — pronoun + no/num/number
  /\b(?:unga|ungal|un|your|ur|u|yr)\s*(?:no\.?|num\.?|number)\b\s*\??/gi,

  // "ph no", "mob no", "mobile no", "cell no", "wtsp no", "wa no"
  /\b(?:ph|phn|mob|mobile|cell|wtsp|wa)\s*(?:no\.?|num\.?|number)\b/gi,

  // "insta id", "ig id", "tg id", "fb id", "snap id"
  /\b(?:insta|ig|tg|telegram|fb|snap)\s*id\b/gi,

  // "dm me", "pm me", "inbox me", "dm pls" — require "me"/"pls"/"please" so
  // "pm" (as in 5pm) and "dm" alone don't false-positive
  /\b(?:dm|pm|inbox)\s*(?:me|pls|please)\b/gi,
  /\b(?:please|pls)\s*(?:dm|pm|inbox)\b/gi,

  // bare "no?" / "num?" right after a name/pronoun-like short exchange
  // (kept narrow — only fires with a trailing question mark to reduce noise)
  /\b(?:no|num)\?/gi,
];

// ADDRESS DATA — kept mostly as-is but PIN code demoted to low-confidence
// (see scoring section) because a bare 6-digit number is common in
// non-address contexts (ages typed wrong, OTPs pasted by mistake, etc.)
export const ADDRESS_PATTERNS = [
  /\b(?:flat|door|house|plot|shop|unit|room|block|floor|apt|apartment)\s*(?:no\.?|num\.?|#|number)?\s*[\w\-\/]+/gi,
  /\b(?:no\.?|#)\s*\d+[\w\-\/]*/gi,
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
  /let(?:'s| us)\b.*\b(?:meet|catch up)\b.*\b(?:in person|face to face)\b/gi,
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
  ...SHORT_FORM_PATTERNS,
];

// Self-disclosure: sender offering their own contact details.
// "my number is ...", "call me", "text me", "my whatsapp", "my id is priya_98".
export const SELF_DISCLOSURE_PATTERNS = [
  /\bmy\s+(?:number|no\.?|num\.?|mobile|cell|phone|contact|whatsapp|wtsp|wtsapp|email|mail|mail\s+id|gmail|insta|instagram|ig|id|handle|username|snapchat|snap|telegram|tg|fb|facebook|linkedin|youtube|profile)\b/gi,
  /\b(?:call|ring|text|ping|whatsapp|wtsapp|message|reach|contact)\s+me\b/gi,
  /\bgive\s+(?:me\s+)?a\s+(?:call|ring|missed\s+call|buzz)\b/gi,
  /\bmissed\s+call\s+do\b/gi,
  /\b(?:here'?s|this\s+is)\s+my\s+(?:number|no\.?|num\.?|mobile|whatsapp|contact|email|mail|id)\b/gi,
];

// Hinglish solicitation: Hindi written in Latin script.
export const SOLICITATION_PATTERNS_HINGLISH = [
  /\b(?:apna|aapka|tumhara|tera|mera|meri)\s+(?:number|no\.?|num\.?|mobile|phone|contact|whatsapp|wtsp|wtsapp|email|mail|id)\b/gi,
  /\b(?:number|no\.?|num\.?|mobile|phone|contact)\s+(?:do|dedo|de\s+do|bhejo|bhej|batao|batao\s+na|dena)\b/gi,
  /\b(?:call|missed\s+call)\s+(?:karo|kar|kardo|kardo\s+na)\b/gi,
  /\b(?:whatsapp|wtsapp|wtsp)\s+(?:pe|par|mein|main)\s+(?:baat|baat\s+karo|chat|message|msg)\b/gi,
  /\b(?:insta|instagram|ig)\s+(?:pe|par|mein|main)\s+(?:follow|message|msg|dm)\b/gi,
  /\b(?:milte|mil)\s+hain\b/gi,
  /\b(?:mera|meri)\s+(?:number|no\.?|num\.?|mobile|whatsapp|email|mail|id)\s+(?:hai|he|ho)\b/gi,
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
  emailProvider: 10,
  domain: 8,
  upi: 9,
  socialUrl: 10,
  socialHandle: 5,
  socialPlatformCue: 8,
  messagingAppMention: 8,
  address: 4,
  pinCodeOnly: 4, // blocks when a 6-digit number appears (pincode context)
  solicitation: 4,
  selfDisclosure: 8,
  hinglish: 8,
};

// Review tier is now treated as blocked (effective threshold = REVIEW_THRESHOLD).
// This is intentional: the user asked for tighter rules.
const BLOCK_THRESHOLD = 4;
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
  add('emailProvider', testAny([EMAIL_PROVIDER_PATTERN], text));
  add('domain', testAny([DOMAIN_PATTERN], text));
  add('upi', testAny([UPI_PATTERN], text));
  add('socialUrl', testAny(SOCIAL_URL_PATTERNS, text));
  add('socialHandle', testAny(SOCIAL_HANDLE_PATTERNS, text));
  add('socialPlatformCue', testAny([SOCIAL_PLATFORM_CUE_PATTERN], text));
  add('messagingAppMention', testAny(MESSAGING_APP_MENTION_PATTERNS, text));
  add('address', testAny(ADDRESS_PATTERNS, text));
  add('solicitation', testAny(SOLICITATION_PATTERNS, text));
  add('selfDisclosure', testAny(SELF_DISCLOSURE_PATTERNS, text));
  add('hinglish', testAny(SOLICITATION_PATTERNS_HINGLISH, text));

  // PIN code only counts if no stronger address signal already fired —
  // otherwise it's redundant; alone, it's weak evidence.
  if (!matchedCategories.includes('address')) {
    add('pinCodeOnly', PIN_CODE_LOW_CONFIDENCE.test(text));
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