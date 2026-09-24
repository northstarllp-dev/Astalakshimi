import { cleanList, dobBoundsForAgeWindow } from '../../src/matches/viewer-context';

const REF = new Date('2026-09-20T00:00:00Z');

describe('viewer-context helpers', () => {
  describe('dobBoundsForAgeWindow', () => {
    it('returns null when the age window is incomplete', () => {
      expect(dobBoundsForAgeWindow({}, REF)).toBeNull();
      expect(dobBoundsForAgeWindow({ prefAgeMin: 25 }, REF)).toBeNull();
      expect(dobBoundsForAgeWindow({ prefAgeMax: 32 }, REF)).toBeNull();
    });

    it('produces an inclusive DOB window (upper more recent than lower)', () => {
      const bounds = dobBoundsForAgeWindow({ prefAgeMin: 25, prefAgeMax: 32 }, REF);
      expect(bounds).not.toBeNull();
      expect(bounds!.dobUpper > bounds!.dobLower).toBe(true);
    });
  });

  describe('cleanList', () => {
    it('trims and drops blanks', () => {
      expect(cleanList([' Hindu ', '', 'Jain'])).toEqual(['Hindu', 'Jain']);
      expect(cleanList(null)).toEqual([]);
    });
  });
});
