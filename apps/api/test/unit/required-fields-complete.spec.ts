import { requiredFieldsComplete } from '../../src/profiles/required-fields-complete';

describe('requiredFieldsComplete', () => {
  const complete = {
    profile: {
      profileFor: 'Myself',
      fullName: 'Test User',
      gender: 'Female',
      dob: '1998-01-15',
      maritalStatus: 'Never Married',
      city: 'Chennai',
      heightCm: 165,
      religion: 'Hindu',
      caste: 'Iyer',
      motherTongue: 'Tamil',
      educationLevel: 'Bachelors',
      employmentStatus: 'Employed',
      annualIncome: '8-10 Lakh',
    },
    lifestyle: { diet: 'Vegetarian' },
    horoscope: {
      nakshatra: 'Rohini',
      rashi: 'Vrishabha',
      manglik: 'No',
      birthTime: '10:00 AM',
      birthPlace: 'Chennai',
    },
    photoCount: 1,
  };

  it('returns true when all required fields are filled', () => {
    expect(requiredFieldsComplete(complete)).toBe(true);
  });

  it('returns false when career income is missing', () => {
    expect(
      requiredFieldsComplete({
        ...complete,
        profile: { ...complete.profile, annualIncome: null },
      }),
    ).toBe(false);
  });

  it('returns false when horoscope is incomplete', () => {
    expect(
      requiredFieldsComplete({
        ...complete,
        horoscope: { ...complete.horoscope, birthPlace: '' },
      }),
    ).toBe(false);
  });

  it('returns false when no photos', () => {
    expect(requiredFieldsComplete({ ...complete, photoCount: 0 })).toBe(false);
  });
});
