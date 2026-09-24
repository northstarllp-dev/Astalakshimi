import {
  candidateAge,
  educationRank,
  hasRequiredPartnerPrefs,
  passesHardFilters,
  scoreCandidate,
  targetGenders,
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

const REQUIRED_PREFS = {
  prefAgeMin: 25,
  prefAgeMax: 32,
  prefMaritalStatuses: ['Never Married', 'Divorced'],
  prefReligions: ['Hindu', 'Jain'],
};

describe('match-scoring', () => {
  describe('candidateAge', () => {
    it('computes whole-years age inclusive of the birthday', () => {
      expect(candidateAge('1996-09-20', REF)).toBe(30);
      expect(candidateAge('1996-09-21', REF)).toBe(29);
    });

    it('accepts Date objects from Postgres date columns', () => {
      expect(candidateAge(new Date(Date.UTC(1996, 8, 20)), REF)).toBe(30);
      expect(candidateAge(new Date(Date.UTC(1996, 8, 21)), REF)).toBe(29);
    });

    it('returns null for missing or invalid dob', () => {
      expect(candidateAge(null, REF)).toBeNull();
      expect(candidateAge('', REF)).toBeNull();
      expect(candidateAge('not-a-date', REF)).toBeNull();
      expect(candidateAge('1996-13-40', REF)).toBeNull();
      expect(candidateAge(new Date('invalid'), REF)).toBeNull();
    });
  });

  describe('targetGenders', () => {
    it('maps Male to Female, Female to Male, Other to both', () => {
      expect(targetGenders('Male')).toEqual(['Female']);
      expect(targetGenders('Female')).toEqual(['Male']);
      expect(targetGenders('Other')).toEqual(['Male', 'Female']);
      expect(targetGenders(null)).toEqual([]);
    });
  });

  describe('hasRequiredPartnerPrefs', () => {
    it('requires age, religion, and marital lists', () => {
      expect(hasRequiredPartnerPrefs(REQUIRED_PREFS)).toBe(true);
      expect(hasRequiredPartnerPrefs({ ...REQUIRED_PREFS, prefMaritalStatuses: [] })).toBe(false);
      expect(hasRequiredPartnerPrefs({ ...REQUIRED_PREFS, prefReligions: [] })).toBe(false);
      expect(hasRequiredPartnerPrefs({ ...REQUIRED_PREFS, prefAgeMin: null })).toBe(false);
    });
  });

  describe('educationRank', () => {
    it('ranks levels in order and is case-insensitive', () => {
      expect(educationRank('High School')).toBeLessThan(educationRank('Diploma'));
      expect(educationRank('masters')).toBe(educationRank('Masters'));
    });

    it('returns 0 for missing or unknown levels', () => {
      expect(educationRank(null)).toBe(0);
      expect(educationRank('Something Else')).toBe(0);
    });
  });

  describe('passesHardFilters', () => {
    it('passes when age, any selected religion, and any selected marital match', () => {
      expect(passesHardFilters(BASE_CANDIDATE, REQUIRED_PREFS, REF)).toEqual({ ok: true });
      expect(
        passesHardFilters({ ...BASE_CANDIDATE, religion: 'Jain', maritalStatus: 'Divorced' }, REQUIRED_PREFS, REF),
      ).toEqual({ ok: true });
    });

    it('rejects out-of-range age including the day before turning min age', () => {
      expect(
        passesHardFilters({ ...BASE_CANDIDATE, dob: '1980-01-01' }, REQUIRED_PREFS, REF).failedOn,
      ).toBe('age');
      // 25 tomorrow: dob 2001-09-21 is 24 at REF
      expect(
        passesHardFilters({ ...BASE_CANDIDATE, dob: '2001-09-21' }, REQUIRED_PREFS, REF).failedOn,
      ).toBe('age');
    });

    it('rejects unparseable dob', () => {
      expect(passesHardFilters({ ...BASE_CANDIDATE, dob: null }, REQUIRED_PREFS, REF)).toEqual({
        ok: false,
        failedOn: 'age',
      });
    });

    it('rejects marital or religion not in the selected lists', () => {
      expect(
        passesHardFilters({ ...BASE_CANDIDATE, maritalStatus: 'Widowed' }, REQUIRED_PREFS, REF),
      ).toEqual({ ok: false, failedOn: 'maritalStatus' });
      expect(passesHardFilters({ ...BASE_CANDIDATE, religion: 'Christian' }, REQUIRED_PREFS, REF)).toEqual({
        ok: false,
        failedOn: 'religion',
      });
    });

    it('compares religion and marital case-insensitively after trim', () => {
      expect(
        passesHardFilters(
          { ...BASE_CANDIDATE, religion: ' hindu ', maritalStatus: 'never married' },
          REQUIRED_PREFS,
          REF,
        ),
      ).toEqual({ ok: true });
    });

    it('fails when required religion or marital lists are empty', () => {
      expect(
        passesHardFilters(BASE_CANDIDATE, { ...REQUIRED_PREFS, prefReligions: [] }, REF).failedOn,
      ).toBe('religion');
      expect(
        passesHardFilters(BASE_CANDIDATE, { ...REQUIRED_PREFS, prefMaritalStatuses: [] }, REF).failedOn,
      ).toBe('maritalStatus');
    });

    it('fails when the age window is missing', () => {
      expect(
        passesHardFilters(BASE_CANDIDATE, { ...REQUIRED_PREFS, prefAgeMin: null, prefAgeMax: null }, REF).failedOn,
      ).toBe('age');
    });
  });

  describe('scoreCandidate', () => {
    const prefs = {
      ...REQUIRED_PREFS,
      prefHeightMinCm: 160,
      prefHeightMaxCm: 180,
      prefCastes: ['Brahmin'],
      prefMotherTongues: ['Tamil'],
      prefMinEducation: 'Bachelors',
      prefLocations: ['Chennai'],
    };

    it('adds internal rank points only for set optional prefs that match', () => {
      const score = scoreCandidate(BASE_CANDIDATE, prefs, REF);
      expect(score.points).toBe(25 + 20 + 20 + 20 + 15);
      expect(score.reasons).toEqual(
        expect.arrayContaining(['Same community', 'Same mother tongue', 'Education match']),
      );
      expect(score.reasons.length).toBeLessThanOrEqual(3);
    });

    it('does not treat Caste no bar as a specific community to match', () => {
      const open = { ...REQUIRED_PREFS, prefCastes: ['Caste no bar'] };
      const score = scoreCandidate({ ...BASE_CANDIDATE, caste: 'Reddy' }, open, REF);
      expect(score.reasons).not.toContain('Same community');
      expect(score.points).toBe(0);
    });

    it('scores 0 points when no optional prefs are set', () => {
      expect(scoreCandidate(BASE_CANDIDATE, REQUIRED_PREFS, REF).points).toBe(0);
      expect(scoreCandidate(BASE_CANDIDATE, REQUIRED_PREFS, REF).reasons).toEqual([]);
    });

    it('does not exclude on blank height; height points only when a range is set', () => {
      expect(scoreCandidate({ ...BASE_CANDIDATE, heightCm: null }, REQUIRED_PREFS, REF).points).toBe(0);
      expect(scoreCandidate({ ...BASE_CANDIDATE, heightCm: null }, prefs, REF).points).toBe(25 + 20 + 20 + 20);
    });

    it('matches location on city or state, case-insensitively', () => {
      const locationOnly = { ...REQUIRED_PREFS, prefLocations: ['Chennai'] };
      expect(
        scoreCandidate({ ...BASE_CANDIDATE, city: 'Coimbatore', state: 'Tamil Nadu' }, locationOnly, REF).reasons,
      ).not.toContain('Preferred location');
      const statePrefs = { ...REQUIRED_PREFS, prefLocations: ['tamil nadu'] };
      expect(
        scoreCandidate({ ...BASE_CANDIDATE, city: 'Coimbatore', state: 'Tamil Nadu' }, statePrefs, REF).reasons,
      ).toContain('Preferred location');
    });

    it('matches a catalog city name and a "City, State" label against profiles.city', () => {
      const cityPrefs = { ...REQUIRED_PREFS, prefLocations: ['Bengaluru'] };
      expect(
        scoreCandidate({ ...BASE_CANDIDATE, city: 'Bengaluru', state: 'Karnataka' }, cityPrefs, REF).reasons,
      ).toContain('Preferred location');
      const labelPrefs = { ...REQUIRED_PREFS, prefLocations: ['Bengaluru, Karnataka'] };
      expect(
        scoreCandidate({ ...BASE_CANDIDATE, city: 'Bengaluru', state: 'Karnataka' }, labelPrefs, REF).reasons,
      ).toContain('Preferred location');
    });
  });
});
