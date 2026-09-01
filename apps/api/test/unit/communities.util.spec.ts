import { normalizeCommunityText } from '../../src/communities/communities.util';

describe('normalizeCommunityText', () => {
  it('lowercases and strips non-alphanumeric characters', () => {
    expect(normalizeCommunityText('  Iyer ')).toBe('iyer');
    expect(normalizeCommunityText('Bharadwaja')).toBe('bharadwaja');
    expect(normalizeCommunityText('Vadama-Iyer')).toBe('vadamaiyer');
  });
});
