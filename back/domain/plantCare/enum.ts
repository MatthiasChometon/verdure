import { registerEnumType } from '@nestjs/graphql';

// Recurring plant-care tasks beyond watering (which keeps its own richer,
// season-aware model). Each is a simple fixed-interval routine the owner tracks.
export enum CareType {
  FERTILIZING = 'FERTILIZING',
  MISTING = 'MISTING',
  ROTATING = 'ROTATING',
  REPOTTING = 'REPOTTING',
}

registerEnumType(CareType, {
  name: 'CareType',
  description: 'A recurring plant-care task other than watering.',
});
