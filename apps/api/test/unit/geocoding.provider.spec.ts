import {
  dedupeCityResults,
  parseNominatimResult,
} from '../../src/locations/geocoding.provider';

describe('geocoding.provider', () => {
  it('parses nominatim town results into city autocomplete rows', () => {
    const parsed = parseNominatimResult({
      place_id: 12345,
      display_name: 'Ambur, Vellore, Tamil Nadu, India',
      address: {
        town: 'Ambur',
        state: 'Tamil Nadu',
        country: 'India',
      },
    });

    expect(parsed).toEqual({
      id: 12345,
      name: 'Ambur',
      state: 'Tamil Nadu',
      country: 'India',
      label: 'Ambur, Tamil Nadu',
    });
  });

  it('dedupes cities by name and state', () => {
    const merged = dedupeCityResults([
      { id: 1, name: 'Ambur', state: 'Tamil Nadu', country: 'India', label: 'Ambur, Tamil Nadu' },
      { id: 2, name: 'Ambur', state: 'Tamil Nadu', country: 'India', label: 'Ambur, Tamil Nadu' },
      { id: 3, name: 'Chennai', state: 'Tamil Nadu', country: 'India', label: 'Chennai, Tamil Nadu' },
    ]);

    expect(merged).toHaveLength(2);
    expect(merged.map((row) => row.name)).toEqual(['Ambur', 'Chennai']);
  });
});
