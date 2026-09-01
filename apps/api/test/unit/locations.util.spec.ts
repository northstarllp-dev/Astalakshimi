import { normalizeLocationText } from '../../src/locations/locations.util';

describe('normalizeLocationText', () => {
  it('lowercases and strips non-alphanumeric characters', () => {
    expect(normalizeLocationText('  Bangalore ')).toBe('bangalore');
    expect(normalizeLocationText('Bengaluru')).toBe('bengaluru');
    expect(normalizeLocationText('bang-lore')).toBe('banglore');
  });
});
