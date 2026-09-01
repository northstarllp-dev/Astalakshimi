export type CityAutocompleteResult = {
  id: number;
  name: string;
  state: string;
  country: string;
  label: string;
};

export type StateOption = {
  id: number;
  name: string;
  country: string;
};

export type ResolvedCity = {
  id: number;
  name: string;
  state: string;
  country: string;
};
