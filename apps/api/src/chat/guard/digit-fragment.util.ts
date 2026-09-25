import { normalizeForModeration } from './rules.constant';

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

/** Join digits from every digit-only shard in chronological order. */
export function assembleDigitFragments(messagesChronological: string[]): string {
  return messagesChronological.filter(isDigitFragment).map(extractDigits).join('');
}

/** True when a run of digits contains a complete Indian mobile number. */
export function containsAssembledPhone(digits: string): boolean {
  return /[6-9]\d{9}/.test(digits);
}
