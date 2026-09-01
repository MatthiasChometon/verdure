import { registerEnumType } from '@nestjs/graphql';

// Whether a plant is a hazard to pets and small children. UNKNOWN is honest: an
// unrecognised species must never be implied to be safe.
export enum PlantSafetyLevel {
  SAFE = 'SAFE',
  TOXIC = 'TOXIC',
  UNKNOWN = 'UNKNOWN',
}

registerEnumType(PlantSafetyLevel, { name: 'PlantSafetyLevel' });
