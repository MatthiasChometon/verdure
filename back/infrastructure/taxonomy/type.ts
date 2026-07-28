export type SpeciesMatch = {
  key: number;
  name: string;
};

export type GbifSuggestion = {
  key?: number;
  canonicalName?: string;
  scientificName?: string;
  kingdom?: string;
};

export type GbifSearchResult = { key: number; canonicalName?: string };

export type GbifSearchResponse = {
  results: GbifSearchResult[];
  endOfRecords: boolean;
};
