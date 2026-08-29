const wordToDigitMap: Record<string, string> = {
  zero: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
};

export function normalizeText(text: string): string {
  if (!text) return '';
  let normalized = text.toLowerCase();

  // Replace word numbers with digits
  Object.keys(wordToDigitMap).forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    normalized = normalized.replace(regex, wordToDigitMap[word]);
  });

  // Remove common obfuscations like symbols or spaces between numbers
  // Example: 9-8-7 or 9.8.7 or 9 8 7 -> 987
  normalized = normalized.replace(/(?<=\d)[\s\-\.]+(?=\d)/g, '');

  return normalized;
}
