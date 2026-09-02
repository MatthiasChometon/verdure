import { PlantSafetyLevel } from './enum';

// A short reassurance / reason shown under the badge, kept in both languages so
// the front stays a pure consumer (mirrors the `lang` argument on suggestPlantName).
export type LocalisedNote = { fr: string; en: string };

export type SafetyEntry = {
  level: PlantSafetyLevel.SAFE | PlantSafetyLevel.TOXIC;
  note: LocalisedNote;
};

const TOXIC = PlantSafetyLevel.TOXIC;
const SAFE = PlantSafetyLevel.SAFE;

// Reasons recur across many genera, so name them once and reuse.
const OXALATE: LocalisedNote = {
  fr: "Cristaux d'oxalate de calcium : irritation de la bouche si mâchée.",
  en: 'Calcium oxalate crystals — irritates the mouth if chewed.',
};
const SAP_IRRITANT: LocalisedNote = {
  fr: 'Sève irritante pour la peau et le tube digestif des animaux.',
  en: 'Irritant sap, harmful to pets if licked or eaten.',
};
const NON_TOXIC: LocalisedNote = {
  fr: 'Sans danger connu pour les chats, les chiens et les enfants.',
  en: 'No known danger to cats, dogs or children.',
};

// A curated map of common houseplants, keyed by lowercase genus (the first word
// of the species, matching the list's genus facet). Toxicity is a genus-level
// trait here — enough for a reassuring, honest badge without a per-species table.
// Sourced from the ASPCA toxic/non-toxic plant lists. Anything absent stays
// UNKNOWN on purpose: never imply safety we have not verified.
export const PLANT_SAFETY_CATALOG: Record<string, SafetyEntry> = {
  // Toxic — calcium oxalate (aroids, the bulk of "trendy" foliage plants).
  monstera: { level: TOXIC, note: OXALATE },
  philodendron: { level: TOXIC, note: OXALATE },
  epipremnum: { level: TOXIC, note: OXALATE },
  scindapsus: { level: TOXIC, note: OXALATE },
  pothos: { level: TOXIC, note: OXALATE },
  dieffenbachia: { level: TOXIC, note: OXALATE },
  aglaonema: { level: TOXIC, note: OXALATE },
  alocasia: { level: TOXIC, note: OXALATE },
  colocasia: { level: TOXIC, note: OXALATE },
  caladium: { level: TOXIC, note: OXALATE },
  syngonium: { level: TOXIC, note: OXALATE },
  spathiphyllum: { level: TOXIC, note: OXALATE },
  anthurium: { level: TOXIC, note: OXALATE },
  zamioculcas: { level: TOXIC, note: OXALATE },
  // Toxic — other well-known mechanisms.
  dracaena: {
    level: TOXIC,
    note: {
      fr: 'Saponines : vomissements possibles chez le chat et le chien.',
      en: 'Saponins — can cause vomiting in cats and dogs.',
    },
  },
  sansevieria: {
    level: TOXIC,
    note: {
      fr: 'Saponines : vomissements possibles chez le chat et le chien.',
      en: 'Saponins — can cause vomiting in cats and dogs.',
    },
  },
  aloe: {
    level: TOXIC,
    note: {
      fr: 'Le latex de la feuille est purgatif et toxique pour les animaux.',
      en: 'Leaf latex is a purgative and toxic to pets.',
    },
  },
  ficus: { level: TOXIC, note: SAP_IRRITANT },
  euphorbia: { level: TOXIC, note: SAP_IRRITANT },
  kalanchoe: {
    level: TOXIC,
    note: {
      fr: 'Contient des glucosides toxiques pour le cœur des animaux.',
      en: 'Contains glycosides that affect pets’ hearts.',
    },
  },
  hedera: { level: TOXIC, note: SAP_IRRITANT },
  cyclamen: {
    level: TOXIC,
    note: {
      fr: 'Tubercule très toxique, surtout pour les chats.',
      en: 'The tuber is highly toxic, especially to cats.',
    },
  },
  lilium: {
    level: TOXIC,
    note: {
      fr: 'Danger mortel pour le chat, même en petite quantité.',
      en: 'Potentially fatal to cats, even in small amounts.',
    },
  },
  schefflera: { level: TOXIC, note: OXALATE },
  crassula: {
    level: TOXIC,
    note: {
      fr: 'La plante jade provoque léthargie et vomissements chez les animaux.',
      en: 'Jade plant causes lethargy and vomiting in pets.',
    },
  },
  begonia: { level: TOXIC, note: OXALATE },
  // Safe — ASPCA non-toxic to cats and dogs.
  chlorophytum: { level: SAFE, note: NON_TOXIC },
  calathea: { level: SAFE, note: NON_TOXIC },
  goeppertia: { level: SAFE, note: NON_TOXIC },
  maranta: { level: SAFE, note: NON_TOXIC },
  peperomia: { level: SAFE, note: NON_TOXIC },
  pilea: { level: SAFE, note: NON_TOXIC },
  fittonia: { level: SAFE, note: NON_TOXIC },
  hoya: { level: SAFE, note: NON_TOXIC },
  howea: { level: SAFE, note: NON_TOXIC },
  chamaedorea: { level: SAFE, note: NON_TOXIC },
  nephrolepis: { level: SAFE, note: NON_TOXIC },
  phalaenopsis: { level: SAFE, note: NON_TOXIC },
  saintpaulia: { level: SAFE, note: NON_TOXIC },
  schlumbergera: { level: SAFE, note: NON_TOXIC },
  echeveria: { level: SAFE, note: NON_TOXIC },
  haworthia: { level: SAFE, note: NON_TOXIC },
  beaucarnea: { level: SAFE, note: NON_TOXIC },
};
