import {
  normalizePhotoBlur,
  photoPrivacyToBlur,
  photoBlurToPrivacy,
  computeBlurDecision,
} from '../../src/common/photo-access';

describe('photo-access blur helpers', () => {
  it('normalizes legacy accepted → when_not_connected', () => {
    expect(normalizePhotoBlur('accepted')).toBe('when_not_connected');
    expect(normalizePhotoBlur('when_not_connected')).toBe('when_not_connected');
    expect(normalizePhotoBlur('never')).toBe('never');
    expect(normalizePhotoBlur('always')).toBe('always');
    expect(normalizePhotoBlur(undefined)).toBe('always');
  });

  it('maps photoPrivacy ↔ photoBlur both ways', () => {
    expect(photoPrivacyToBlur('blurred')).toBe('always');
    expect(photoPrivacyToBlur('accepted')).toBe('when_not_connected');
    expect(photoPrivacyToBlur('visible')).toBe('never');
    expect(photoBlurToPrivacy('always')).toBe('blurred');
    expect(photoBlurToPrivacy('when_not_connected')).toBe('accepted');
    expect(photoBlurToPrivacy('never')).toBe('visible');
  });

  it('computeBlurDecision respects never / mutual / owner', () => {
    expect(
      computeBlurDecision({
        photoBlur: 'always',
        isAccepted: false,
        viewerUserId: 'v',
        ownerUserId: 'o',
      }).blurPhoto,
    ).toBe(true);
    expect(
      computeBlurDecision({
        photoBlur: 'never',
        isAccepted: false,
        viewerUserId: 'v',
        ownerUserId: 'o',
      }).blurPhoto,
    ).toBe(false);
    expect(
      computeBlurDecision({
        photoBlur: 'always',
        isAccepted: true,
        viewerUserId: 'v',
        ownerUserId: 'o',
      }).blurPhoto,
    ).toBe(false);
    expect(
      computeBlurDecision({
        photoBlur: 'always',
        isAccepted: false,
        viewerUserId: 'o',
        ownerUserId: 'o',
      }).blurPhoto,
    ).toBe(false);
  });
});
