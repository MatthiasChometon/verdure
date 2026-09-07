import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/module';
import { PlantModule } from '../plant/module';
import { WateringModule } from '../watering/module';
import { AdviceResolver } from './advice/resolver';
import { CareSheetResolver } from './careSheet/resolver';
import { PlantCareSheetService } from './careSheet/service';
import { PlantSafetyService } from './safety/service';
import { SafetyResolver } from './safety/resolver';
import { SpeciesInfoResolver } from './speciesInfo/resolver';
import { PlantSpeciesInfoService } from './speciesInfo/service';

// Per-species reference data (toxicity, care sheet, biography, advice). Its
// services read the plant core (genus) and it resolves fields on Plant, hence
// the mutual forwardRef with the plant core.
@Module({
  imports: [AuthModule, forwardRef(() => PlantModule), WateringModule],
  providers: [
    AdviceResolver,
    SafetyResolver,
    PlantSafetyService,
    CareSheetResolver,
    PlantCareSheetService,
    SpeciesInfoResolver,
    PlantSpeciesInfoService,
  ],
  // The plant list annotates each row with its safety flag through this.
  exports: [PlantSafetyService],
})
export class SpeciesReferenceModule {}
