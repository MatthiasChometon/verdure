import { WateringDueService } from './due.service';
import { WateringScheduleService } from './schedule.service';
import { PlantWateringRecord } from './type';

const due = new WateringDueService(new WateringScheduleService());

const record = (
  overrides: Partial<PlantWateringRecord> & Pick<PlantWateringRecord, 'id'>,
): PlantWateringRecord => ({
  name: overrides.name ?? overrides.id,
  lastWateredOn: null,
  summerDays: 7,
  winterDays: 14,
  ...overrides,
});

describe('WateringDueService.duePlants', () => {
  it('includes a plant whose next-due date is today', () => {
    // Watered on the 8th, summer interval 7 → due on the 15th.
    const records = [record({ id: 'p1', lastWateredOn: '2026-07-08' })];
    expect(due.duePlants(records, '2026-07-15')).toEqual([
      { id: 'p1', name: 'p1', dueOn: '2026-07-15' },
    ]);
  });

  it('includes a plant already overdue (due date before today)', () => {
    const records = [record({ id: 'p1', lastWateredOn: '2026-07-01' })];
    expect(due.duePlants(records, '2026-07-20')).toEqual([
      { id: 'p1', name: 'p1', dueOn: '2026-07-08' },
    ]);
  });

  it('excludes a plant not yet due', () => {
    const records = [record({ id: 'p1', lastWateredOn: '2026-07-10' })];
    expect(due.duePlants(records, '2026-07-12')).toEqual([]);
  });

  it('excludes a plant that has never been watered (no due date)', () => {
    const records = [record({ id: 'p1', lastWateredOn: null })];
    expect(due.duePlants(records, '2026-07-15')).toEqual([]);
  });

  it('excludes an untracked plant (no interval for the season)', () => {
    const records = [
      record({
        id: 'p1',
        lastWateredOn: '2026-07-01',
        summerDays: null,
        winterDays: null,
      }),
    ];
    expect(due.duePlants(records, '2026-07-20')).toEqual([]);
  });

  it('returns only the due plants out of a mixed collection', () => {
    const records = [
      record({ id: 'overdue', lastWateredOn: '2026-07-01' }),
      record({ id: 'not-yet', lastWateredOn: '2026-07-14' }),
      record({ id: 'never', lastWateredOn: null }),
    ];
    expect(
      due.duePlants(records, '2026-07-15').map((plant) => plant.id),
    ).toEqual(['overdue']);
  });

  it('uses the winter interval for a plant last watered in winter', () => {
    // Watered on Dec 10, winter interval 14 → due Dec 24.
    const records = [record({ id: 'p1', lastWateredOn: '2026-12-10' })];
    expect(due.duePlants(records, '2026-12-23')).toEqual([]);
    expect(due.duePlants(records, '2026-12-24')).toEqual([
      { id: 'p1', name: 'p1', dueOn: '2026-12-24' },
    ]);
  });
});
