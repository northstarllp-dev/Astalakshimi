import {
  candidateAge,
  educationRank,
  passesHardFilters,
  scoreCandidate,
  DEFAULT_PREF_AGE_MIN,
  DEFAULT_PREF_AGE_MAX,
} from '../../src/matches/match-scoring';

const REF = new Date('2026-09-20T00:00:00Z');

const BASE_CANDIDATE = {
  dob: '1996-09-20', // 30 at REF
  heightCm: 170,
  maritalStatus: 'Never Married',
  religion: 'Hindu',
  caste: 'Brahmin',
  motherTongue: 'Tamil',
  educationLevel: 'Bachelors',
  city: 'Chennai',
  state: 'Tamil Nadu',
};

describe('match-scoring (basic matrimony matching)', () => {
  describe('candidateAge', () => {
    it('computes whole-years age', () => {
      expect(candidateAge('1996-09-20', REF)).toBe(30);
      expect(candidateAge('1996-09-21', REF)).toBe(29);
    });

    it('returns null for missing or invalid dob', () => {
      expect(candidateAge(null, REF)).toBeNull();
      expect(candidateAge('', REF)).toBeNull();
      expect(candidateAge('not-a-date', REF)).toBeNull();
      expect(candidateAge('1996-13-40', REF)).toBeNull();
    });
  });

  describe('educationRank', () => {
    it('ranks levels in order and is case-insensitive', () => {
      expect(educationRank('High School')).toBeLessThan(educationRank('Diploma'));
      expect(educationRank('Diploma')).toBeLessThan(educationRank('Bachelors'));
      expect(educationRank('Bachelors')).toBeLessThan(educationRank('Masters'));
      expect(educationRank('Masters')).toBeLessThan(educationRank('Doctorate'));
      expect(educationRank('masters')).toBe(educationRank('Masters'));
    });

    it('returns 0 for missing or unknown levels', () => {
      expect(educationRank(null)).toBe(0);
      expect(educationRank('Something Else')).toBe(0);
    });
  });

  describe('passesHardFilters', () => {
    const prefs = {
      prefAgeMin: 25,
      prefAgeMax: 32,
      prefMaritalStatuses: ['Never Married'],
      prefReligions: ['Hindu'],
    };

    it('passes a candidate inside every window', () => {
      expect(passesHardFilters(BASE_CANDIDATE, prefs, REF)).toEqual({ ok: true });
    });

    it('rejects out-of-range age', () => {
      expect(
        passesHardFilters({ ...BASE_CANDIDATE, dob: '1980-01-01' }, prefs, REF).failedOn,
      ).toBe('age');
    });

    it('rejects unparseable dob (cannot verify age)', () => {
      expect(passesHardFilters({ ...BASE_CANDIDATE, dob: null }, prefs, REF)).toEqual({
        ok: false,
        failedOn: 'age',
      });
    });

    it('rejects non-listed marital status and religion', () => {
      expect(
        passesHardFilters({ ...BASE_CANDIDATE, maritalStatus: 'Divorced' }, prefs, REF),
      ).toEqual({ ok: false, failedOn: 'maritalStatus' });
      expect(passesHardFilters({ ...BASE_CANDIDATE, religion: 'Christian' }, prefs, REF)).toEqual({
        ok: false,
        failedOn: 'religion',
      });
    });

    it('treats empty lists as no preference', () => {
      const open = {
        prefAgeMin: 18,
        prefAgeMax: 80,
        prefMaritalStatuses: [],
        prefReligions: [],
      };
      expect(
        passesHardFilters({ ...BASE_CANDIDATE, religion: 'Christian', maritalStatus: 'Widowed' }, open, REF),
      ).toEqual({ ok: true });
    });

    it('falls back to default age window when prefs are unset', () => {
      expect(DEFAULT_PREF_AGE_MIN).toBe(21);
      expect(DEFAULT_PREF_AGE_MAX).toBe(35);
      expect(passesHardFilters(BASE_CANDIDATE, {}, REF)).toEqual({ ok: true });
      expect(
        passesHardFilters({ ...BASE_CANDIDATE, dob: '1970-01-01' }, {}, REF).failedOn,
      ).toBe('age');
    });
  });

  describe('scoreCandidate', () => {
    const prefs = {
      prefAgeMin: 25,
      prefAgeMax: 35,
      prefHeightMinCm: 160,
      prefHeightMaxCm: 180,
      prefCastes: ['Brahmin'],
      prefMotherTongues: ['Tamil'],
      prefMinEducation: 'Bachelors',
      prefLocations: ['Chennai'],
    };

    it('scores a full match at base + all weights with reasons', () => {
      const score = scoreCandidate(BASE_CANDIDATE, prefs, REF);
      // 40 + 15 + 12 + 12 + 10 + 6 + 5 = 100 → capped at 98
      expect(score.percent).toBe(98);
      expect(score.reasons).toEqual(
        expect.arrayContaining(['Same community', 'Same mother tongue', 'Education match', 'Preferred location']),
      );
      expect(score.reasons.length).toBeLessThanOrEqual(4);
    });

    it('scores base + age-fit when nothing is set, less when nothing matches', () => {
      // Empty prefs: no soft dimensions set, but age 30 sits near the middle
      // of the default 21–35 window (+5 age-fit).
      expect(scoreCandidate(BASE_CANDIDATE, {}, REF).percent).toBe(45);
      expect(
        scoreCandidate(
          { ...BASE_CANDIDATE, caste: 'Other', motherTongue: 'Hindi', city: 'Delhi', state: 'Delhi', heightCm: 150 },
          prefs,
          REF,
        ).percent,
      ).toBeLessThan(98);
    });

    it('requires education >= minimum (higher candidate passes, lower fails)', () => {
      expect(
        scoreCandidate({ ...BASE_CANDIDATE, educationLevel: 'Masters' }, prefs, REF).reasons,
      ).toContain('Education match');
      expect(
        scoreCandidate({ ...BASE_CANDIDATE, educationLevel: 'Diploma' }, prefs, REF).reasons,
      ).not.toContain('Education match');
    });

    it('matches location on city or state, case-insensitively', () => {
      expect(
        scoreCandidate({ ...BASE_CANDIDATE, city: 'Coimbatore', state: 'Tamil Nadu' }, prefs, REF).reasons,
      ).not.toContain('Preferred location');
      const statePrefs = { ...prefs, prefLocations: ['tamil nadu'] };
      expect(
        scoreCandidate({ ...BASE_CANDIDATE, city: 'Coimbatore', state: 'Tamil Nadu' }, statePrefs, REF).reasons,
      ).toContain('Preferred location');
    });

    it('ignores missing height without penalty', () => {
      // Full prefs earn 40 + 60 = 100 → capped at 98; without height 40 + 54 = 94.
      expect(scoreCandidate(BASE_CANDIDATE, prefs, REF).percent).toBe(98);
      expect(scoreCandidate({ ...BASE_CANDIDATE, heightCm: null }, prefs, REF).percent).toBe(94);
    });
  });
});
