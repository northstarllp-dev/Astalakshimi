export type CommunityAutocompleteResult = {
  id: number;
  name: string;
  religion: string;
  label: string;
};

export type SubcasteAutocompleteResult = {
  id: number;
  name: string;
  communityId: number;
  community: string;
  label: string;
};

export type GotraAutocompleteResult = {
  id: number;
  name: string;
  religion: string | null;
  label: string;
};
