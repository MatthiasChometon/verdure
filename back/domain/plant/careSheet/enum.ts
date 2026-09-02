import { registerEnumType } from '@nestjs/graphql';

// How much light a plant wants: LOW tolerates a dim corner, MEDIUM wants bright
// indirect light, BRIGHT needs a very bright spot or some direct sun.
export enum PlantLightNeed {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  BRIGHT = 'BRIGHT',
}

// How humid the air a plant likes: LOW copes with dry rooms, MEDIUM is average
// indoor air, HIGH wants a humid spot (misting, a pebble tray or a bathroom).
export enum PlantHumidityNeed {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

registerEnumType(PlantLightNeed, { name: 'PlantLightNeed' });
registerEnumType(PlantHumidityNeed, { name: 'PlantHumidityNeed' });
