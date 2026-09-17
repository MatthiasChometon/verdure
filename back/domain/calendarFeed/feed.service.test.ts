import { describe, expect, it } from 'vitest';
import { CareDueService } from '../plantCare/due.service';
import { CareType } from '../plantCare/enum';
import { CareRepository } from '../plantCare/repository';
import { CareScheduleRecord } from '../plantCare/type';
import { WateringRepository } from '../watering/repository';
import { WateringScheduleService } from '../watering/schedule.service';
import { PlantWateringRecord } from '../watering/type';
import { CalendarFeedService } from './feed.service';

const build = (
  wateringRecords: PlantWateringRecord[],
  careRecords: CareScheduleRecord[] = [],
): CalendarFeedService => {
  const watering = {
    wateringRecordsFor: () => Promise.resolve(wateringRecords),
  } as unknown as WateringRepository;
  const care = {
    careRecordsFor: () => Promise.resolve(careRecords),
  } as unknown as CareRepository;

  return new CalendarFeedService(
    watering,
    new WateringScheduleService(),
    care,
    new CareDueService(),
  );
};

describe('CalendarFeedService.icsFor', () => {
  it('emits a watering event for a plant with a computable next-due date', async () => {
    const service = build([
      {
        id: 'p1',
        name: 'Monstera',
        lastWateredOn: '2026-07-08',
        summerDays: 7,
        winterDays: 14,
      },
    ]);

    const ics = await service.icsFor('alice', 'fr');

    expect(ics).toContain('UID:watering-p1@verdure');
    expect(ics).toContain('SUMMARY:Arroser Monstera');
  });

  it('omits a plant never watered (no cycle to anchor a due date on)', async () => {
    const service = build([
      {
        id: 'p1',
        name: 'Monstera',
        lastWateredOn: null,
        summerDays: 7,
        winterDays: 14,
      },
    ]);

    const ics = await service.icsFor('alice', 'fr');

    expect(ics).not.toContain('BEGIN:VEVENT');
  });

  it('emits a care event alongside watering events', async () => {
    const careRecords: CareScheduleRecord[] = [
      {
        plantId: 'p1',
        plantName: 'Monstera',
        careType: CareType.FERTILIZING,
        intervalDays: 30,
        lastDoneOn: '2026-06-15',
      },
    ];
    const service = build([], careRecords);

    const ics = await service.icsFor('alice', 'fr');

    expect(ics).toContain('UID:care-p1-FERTILIZING@verdure');
    expect(ics).toContain('SUMMARY:Monstera : engrais');
  });

  it('phrases titles in English for a non-French locale', async () => {
    const service = build([
      {
        id: 'p1',
        name: 'Monstera',
        lastWateredOn: '2026-07-08',
        summerDays: 7,
        winterDays: 14,
      },
    ]);

    const ics = await service.icsFor('alice', 'en');

    expect(ics).toContain('SUMMARY:Water Monstera');
  });
});
