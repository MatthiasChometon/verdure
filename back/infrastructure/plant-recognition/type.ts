export type PlantNetResult = {
  score: number;
  species?: { scientificNameWithoutAuthor?: string };
};

export type PlantNetResponse = { results?: PlantNetResult[] };
