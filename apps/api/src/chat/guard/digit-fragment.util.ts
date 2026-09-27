import { normalizeForModeration } from './rules.constant';

const CONTACT_CUE_RE =
  /\b(?:number|no\.?|num\.?|mobile|cell|phone|call|whatsapp|wtsapp|wtsp|whats\s*app|contact|digits|naambari)\b/i;

/** A message whose payload is only digits (possibly split across spaces/dashes). */
export function isDigitFragment(raw: string): boolean {
  const normalized = normalizeForModeration(raw.trim());
  if (!normalized || !/\d/.test(normalized)) {
    return false;
  }

  const withoutSeparators = normalized.replace(/[\s.\-_+()]/g, '');
  return /^\d+$/.test(withoutSeparators);
}

export function extractDigits(raw: string): string {
  return normalizeForModeration(raw).replace(/\D/g, '');
}

/**
 * True when a message is "digit-heavy" after normalisation: digits make up
 * at least 40% of the alphanumeric characters. Catches "my number is 98765"
 * and "call me at 9876543210" which are not pure digit fragments but still
 * carry phone digits worth reassembling across messages.
 */
export function isDigitHeavy(raw: string): boolean {
  const normalized = normalizeForModeration(raw.trim());
  if (!normalized) return false;
  const alnum = normalized.replace(/[^a-z0-9]/gi, '');
  if (!alnum) return false;
  const digits = (normalized.match(/\d/g) || []).length;
  return digits / alnum.length >= 0.4 && digits >= 2;
}

/**
 * True when a message contains a contact cue word (number, mobile, call,
 * whatsapp, phone, digits). Used to decide whether to harvest digits from
 * a recent message that is not itself digit-heavy.
 */
export function hasContactCue(raw: string): boolean {
  return CONTACT_CUE_RE.test(raw);
}

/** Join digits from every shard in chronological order. */
export function assembleDigitFragments(messagesChronological: string[]): string {
  const shards: string[] = [];
  for (const msg of messagesChronological) {
    if (isDigitFragment(msg)) {
      shards.push(extractDigits(msg));
    } else if (isDigitHeavy(msg) || hasContactCue(msg)) {
      shards.push(extractDigits(msg));
    }
  }
  return shards.join('');
}

/** True when a run of digits contains a complete Indian mobile number or 10+ digits. */
export function containsAssembledPhone(digits: string): boolean {
  return /(?:[6-9]\d{9})|\d{10,}/.test(digits);
}
