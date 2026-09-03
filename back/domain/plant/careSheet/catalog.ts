import { PlantHumidityNeed, PlantLightNeed } from './enum';
import type { Localised } from '../type';

export type CareEntry = {
  light: PlantLightNeed;
  humidity: PlantHumidityNeed;
  tip: Localised;
};

const LOW = PlantLightNeed.LOW;
const MEDIUM_LIGHT = PlantLightNeed.MEDIUM;
const BRIGHT = PlantLightNeed.BRIGHT;

const DRY = PlantHumidityNeed.LOW;
const MEDIUM_HUMIDITY = PlantHumidityNeed.MEDIUM;
const HUMID = PlantHumidityNeed.HIGH;

// Tips recur across care archetypes, so name them once and reuse.
const SUCCULENT: Localised = {
  fr: 'Arrosez peu et laissez le terreau sécher complètement ; craint l’excès d’eau.',
  en: 'Water sparingly and let the mix dry out fully — it hates soggy roots.',
};
const AROID: Localised = {
  fr: 'Un tuteur mousse et un rempotage annuel encouragent de grandes feuilles.',
  en: 'A moss pole and yearly repotting encourage larger leaves.',
};
const TRAILING: Localised = {
  fr: 'Tolère la pénombre ; pincez les tiges pour un port plus touffu.',
  en: 'Tolerates low light; pinch the stems for a bushier shape.',
};
const PRAYER: Localised = {
  fr: 'Ses feuilles se replient la nuit ; préférez une eau douce non calcaire.',
  en: 'Its leaves fold up at night — prefer soft, non-chalky water.',
};

// A curated care sheet for common houseplants, keyed by lowercase genus (the
// first word of the species, matching the list's genus facet). Light, humidity
// and a growing tip are genus-level traits here — enough for a helpful sheet
// without a per-species table. Anything absent simply has no sheet: we never
// invent care advice we have not curated.
export const PLANT_CARE_CATALOG: Record<string, CareEntry> = {
  // Aroids — the bulk of trendy foliage plants.
  monstera: { light: MEDIUM_LIGHT, humidity: HUMID, tip: AROID },
  philodendron: { light: MEDIUM_LIGHT, humidity: HUMID, tip: AROID },
  epipremnum: { light: LOW, humidity: MEDIUM_HUMIDITY, tip: TRAILING },
  scindapsus: { light: LOW, humidity: MEDIUM_HUMIDITY, tip: TRAILING },
  pothos: { light: LOW, humidity: MEDIUM_HUMIDITY, tip: TRAILING },
  dieffenbachia: {
    light: MEDIUM_LIGHT,
    humidity: MEDIUM_HUMIDITY,
    tip: {
      fr: 'Tournez le pot vers la lumière pour garder un port droit.',
      en: 'Turn the pot toward the light to keep it growing upright.',
    },
  },
  aglaonema: {
    light: LOW,
    humidity: MEDIUM_HUMIDITY,
    tip: {
      fr: 'Une des rares plantes qui prospère loin des fenêtres.',
      en: 'One of the few plants that thrives far from a window.',
    },
  },
  alocasia: {
    light: BRIGHT,
    humidity: HUMID,
    tip: {
      fr: 'Aime l’air très humide ; des feuilles qui « pleurent » signalent trop d’eau.',
      en: 'Loves very humid air; weeping leaves mean it has had too much water.',
    },
  },
  colocasia: {
    light: BRIGHT,
    humidity: HUMID,
    tip: {
      fr: 'Grande buveuse en été ; gardez le terreau constamment humide.',
      en: 'A heavy drinker in summer — keep the soil consistently moist.',
    },
  },
  caladium: {
    light: MEDIUM_LIGHT,
    humidity: HUMID,
    tip: {
      fr: 'Entre en dormance l’hiver : réduisez fortement l’arrosage.',
      en: 'Goes dormant in winter — cut back watering sharply.',
    },
  },
  syngonium: { light: MEDIUM_LIGHT, humidity: MEDIUM_HUMIDITY, tip: TRAILING },
  spathiphyllum: {
    light: LOW,
    humidity: HUMID,
    tip: {
      fr: 'Ses feuilles retombent pour signaler la soif, puis se redressent.',
      en: 'Its leaves droop to signal thirst, then perk back up once watered.',
    },
  },
  anthurium: {
    light: MEDIUM_LIGHT,
    humidity: HUMID,
    tip: {
      fr: 'Fleurit presque toute l’année sous une lumière vive indirecte.',
      en: 'Blooms almost year-round in bright, indirect light.',
    },
  },
  zamioculcas: {
    light: LOW,
    humidity: DRY,
    tip: {
      fr: 'Quasi increvable : ses rhizomes stockent l’eau, arrosez rarement.',
      en: 'Nearly indestructible — water-storing rhizomes, so water rarely.',
    },
  },
  schefflera: {
    light: MEDIUM_LIGHT,
    humidity: MEDIUM_HUMIDITY,
    tip: {
      fr: 'Taillez les tiges trop longues pour garder un feuillage dense.',
      en: 'Prune leggy stems to keep the foliage full.',
    },
  },
  // Other well-known foliage & flowering plants.
  dracaena: {
    light: LOW,
    humidity: MEDIUM_HUMIDITY,
    tip: {
      fr: 'Sensible au fluor : préférez une eau filtrée ou de pluie.',
      en: 'Sensitive to fluoride — prefer filtered or rainwater.',
    },
  },
  sansevieria: {
    light: LOW,
    humidity: DRY,
    tip: {
      fr: 'Supporte l’oubli ; laissez le terreau sécher totalement entre deux arrosages.',
      en: 'Thrives on neglect — let the soil dry out fully between waterings.',
    },
  },
  aloe: { light: BRIGHT, humidity: DRY, tip: SUCCULENT },
  ficus: {
    light: BRIGHT,
    humidity: MEDIUM_HUMIDITY,
    tip: {
      fr: 'N’aime pas être déplacé : il peut perdre ses feuilles au moindre changement.',
      en: 'Dislikes being moved — it may drop leaves after any change.',
    },
  },
  euphorbia: { light: BRIGHT, humidity: DRY, tip: SUCCULENT },
  kalanchoe: {
    light: BRIGHT,
    humidity: DRY,
    tip: {
      fr: 'Refleurit après une série de nuits longues et sombres.',
      en: 'Reblooms after a spell of long, dark nights.',
    },
  },
  hedera: {
    light: MEDIUM_LIGHT,
    humidity: MEDIUM_HUMIDITY,
    tip: {
      fr: 'Aime la fraîcheur ; douchez le feuillage contre les araignées rouges.',
      en: 'Likes cool air — rinse the foliage to fend off spider mites.',
    },
  },
  cyclamen: {
    light: MEDIUM_LIGHT,
    humidity: MEDIUM_HUMIDITY,
    tip: {
      fr: 'Arrosez par le bas et gardez-le au frais pour prolonger la floraison.',
      en: 'Water from below and keep it cool to extend flowering.',
    },
  },
  lilium: {
    light: BRIGHT,
    humidity: MEDIUM_HUMIDITY,
    tip: {
      fr: 'Offrez-lui beaucoup de lumière pendant la floraison, puis laissez le feuillage jaunir.',
      en: 'Give it plenty of light while blooming, then let the foliage yellow off.',
    },
  },
  crassula: { light: BRIGHT, humidity: DRY, tip: SUCCULENT },
  begonia: {
    light: MEDIUM_LIGHT,
    humidity: HUMID,
    tip: {
      fr: 'Évitez de mouiller le feuillage pour prévenir l’oïdium.',
      en: 'Keep water off the leaves to prevent powdery mildew.',
    },
  },
  // Pet-safe common houseplants.
  chlorophytum: {
    light: MEDIUM_LIGHT,
    humidity: MEDIUM_HUMIDITY,
    tip: {
      fr: 'Produit des plantules faciles à bouturer dans un verre d’eau.',
      en: 'Sends out plantlets that root easily in a glass of water.',
    },
  },
  calathea: { light: MEDIUM_LIGHT, humidity: HUMID, tip: PRAYER },
  goeppertia: { light: MEDIUM_LIGHT, humidity: HUMID, tip: PRAYER },
  maranta: { light: MEDIUM_LIGHT, humidity: HUMID, tip: PRAYER },
  peperomia: {
    light: MEDIUM_LIGHT,
    humidity: MEDIUM_HUMIDITY,
    tip: {
      fr: 'Feuilles charnues qui stockent l’eau : laissez sécher entre deux arrosages.',
      en: 'Fleshy, water-storing leaves — let it dry out between waterings.',
    },
  },
  pilea: {
    light: MEDIUM_LIGHT,
    humidity: MEDIUM_HUMIDITY,
    tip: {
      fr: 'Tournez le pot chaque semaine pour un port bien symétrique.',
      en: 'Rotate the pot each week for even, symmetrical growth.',
    },
  },
  fittonia: {
    light: LOW,
    humidity: HUMID,
    tip: {
      fr: 'Boude dès qu’elle a soif mais revit vite après l’arrosage.',
      en: 'Wilts dramatically when thirsty but bounces back fast once watered.',
    },
  },
  hoya: {
    light: BRIGHT,
    humidity: MEDIUM_HUMIDITY,
    tip: {
      fr: 'Ne coupez pas les tiges florales fanées : elles refleurissent chaque année.',
      en: 'Don’t cut off the spent flower stalks — they rebloom each year.',
    },
  },
  howea: {
    light: LOW,
    humidity: MEDIUM_HUMIDITY,
    tip: {
      fr: 'Palmier tolérant à la pénombre ; craint surtout l’excès d’eau.',
      en: 'A shade-tolerant palm — its main enemy is overwatering.',
    },
  },
  chamaedorea: {
    light: LOW,
    humidity: HUMID,
    tip: {
      fr: 'Douchez le feuillage de temps en temps contre les araignées rouges.',
      en: 'Shower the foliage now and then to keep spider mites away.',
    },
  },
  nephrolepis: {
    light: MEDIUM_LIGHT,
    humidity: HUMID,
    tip: {
      fr: 'Gardez le terreau constamment humide et l’air bien humide.',
      en: 'Keep the soil evenly moist and the air nice and humid.',
    },
  },
  phalaenopsis: {
    light: MEDIUM_LIGHT,
    humidity: MEDIUM_HUMIDITY,
    tip: {
      fr: 'Trempez les racines une fois par semaine, puis laissez bien égoutter.',
      en: 'Soak the roots once a week, then let them drain fully.',
    },
  },
  saintpaulia: {
    light: MEDIUM_LIGHT,
    humidity: MEDIUM_HUMIDITY,
    tip: {
      fr: 'Arrosez par le bas à l’eau tiède, sans mouiller les feuilles.',
      en: 'Water from below with tepid water, keeping the leaves dry.',
    },
  },
  schlumbergera: {
    light: MEDIUM_LIGHT,
    humidity: MEDIUM_HUMIDITY,
    tip: {
      fr: 'Cactus de forêt : il a besoin de plus d’eau qu’un cactus du désert.',
      en: 'A forest cactus — it needs more water than a desert one.',
    },
  },
  echeveria: { light: BRIGHT, humidity: DRY, tip: SUCCULENT },
  haworthia: {
    light: MEDIUM_LIGHT,
    humidity: DRY,
    tip: {
      fr: 'Succulente tolérant la mi-ombre ; arrosez avec parcimonie.',
      en: 'A succulent that tolerates part shade — water it sparingly.',
    },
  },
  beaucarnea: {
    light: BRIGHT,
    humidity: DRY,
    tip: {
      fr: 'Son tronc renflé stocke l’eau : arrosez très rarement.',
      en: 'Its swollen trunk stores water — water very rarely.',
    },
  },
};
