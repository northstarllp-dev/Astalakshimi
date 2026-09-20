import { calculateProfileCompleteness } from '../../src/admin/profile-completeness';

describe('calculateProfileCompleteness', () => {
  it('returns 0 for an empty profile', () => {
    expect(calculateProfileCompleteness({})).toBe(0);
  });

  it('scores filled profile fields as a percentage of 40', () => {
    const score = calculateProfileCompleteness({
      profile: {
        profileFor: 'Myself',
        fullName: 'Priya Sharma',
        gender: 'Female',
        dob: '1998-06-15',
        maritalStatus: 'Never Married',
        city: 'Chennai',
        religion: 'Hindu',
        caste: 'Brahmin',
        motherTongue: 'Tamil',
        heightCm: 162,
        weightKg: 58,
        complexion: 'Fair',
        aboutMe: 'Family-oriented professional looking for a match.',
      },
      userPhone: '9876543210',
      photoCount: 2,
    });
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('caps score at 100', () => {
    expect(
      calculateProfileCompleteness({
        profile: {
          fullName: 'Priya Sharma',
          aboutMe: 'A'.repeat(50),
        },
        userPhone: '9876543210',
        photoCount: 5,
        horoscope: { birthTime: '10:30 AM', birthPlace: 'Chennai' },
        verificationStatus: 'verified',
      }),
    ).toBeLessThanOrEqual(100);
  });
});
