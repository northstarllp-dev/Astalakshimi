import { calculateProfileCompleteness } from './profile-completeness';

describe('calculateProfileCompleteness', () => {
  it('returns 0 for an empty profile', () => {
    expect(calculateProfileCompleteness({})).toBe(0);
  });

  it('scores all weighted fields up to 100', () => {
    expect(
      calculateProfileCompleteness({
        fullName: 'Priya Sharma',
        phone: '+919876543210',
        city: 'Chennai',
        religion: 'Hindu',
        caste: 'Brahmin',
        motherTongue: 'Tamil',
        photoCount: 2,
        aboutMe: 'Family-oriented professional looking for a match.',
        birthTime: '10:30 AM',
        birthPlace: 'Chennai',
        verificationStatus: 'verified',
      }),
    ).toBe(100);
  });

  it('caps score at 100', () => {
    expect(
      calculateProfileCompleteness({
        fullName: 'Priya Sharma',
        phone: '9876543210',
        city: 'Chennai',
        religion: 'Hindu',
        caste: 'Brahmin',
        motherTongue: 'Tamil',
        photoCount: 5,
        aboutMe: 'A'.repeat(50),
        birthTime: '10:30 AM',
        birthPlace: 'Chennai',
        verificationStatus: 'verified',
      }),
    ).toBe(100);
  });
});
