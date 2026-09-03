import { Injectable } from '@nestjs/common';
import { Plant } from './model';
import type { PlantRow } from './type';
import { WateringScheduleService } from './watering/schedule.service';

// Maps a plant row (as read by the list/save queries) to the domain Plant,
// deriving nextDueOn/winterRest from its watering rhythm.
@Injectable()
export class PlantMapper {
  constructor(private readonly wateringSchedule: WateringScheduleService) {}

  toPlant(row: PlantRow): Plant {
    return {
      ...row,
      nextDueOn: this.wateringSchedule.nextDue(
        row.lastWateredOn,
        row.wateringIntervalSummerDays,
        row.wateringIntervalWinterDays,
      ),
      winterRest: this.wateringSchedule.winterRest(
        new Date(),
        row.wateringIntervalWinterDays,
      ),
    };
  }
}
