import { CareDueService } from './due.service';
import { CareType } from './enum';
import { CareScheduleRecord } from './type';

const due = new CareDueService();

const record = (
  overrides: Partial<CareScheduleRecord> & Pick<CareScheduleRecord, 'plantId'>,
): CareScheduleRecord => ({
  plantName: overrides.plantName ?? overrides.plantId,
  careType: CareType.FERTILIZING,
  intervalDays: 30,
  lastDoneOn: null,
  ...overrides,
});

describe('CareDueService.dueTasks', () => {
  it('includes a task whose next-due date is today', () => {
    // Fertilised on the 1st, every 30 days → due on the 31st.
    const records = [record({ plantId: 'p1', lastDoneOn: '2026-05-01' })];
    expect(due.dueTasks(records, '2026-05-31')).toEqual([
      {
        plantId: 'p1',
        plantName: 'p1',
        careType: CareType.FERTILIZING,
        dueOn: '2026-05-31',
      },
    ]);
  });

  it('includes a task already overdue (due date before today)', () => {
    const records = [record({ plantId: 'p1', lastDoneOn: '2026-05-01' })];
    expect(due.dueTasks(records, '2026-06-15')[0].dueOn).toBe('2026-05-31');
  });

  it('excludes a task not yet due', () => {
    const records = [record({ plantId: 'p1', lastDoneOn: '2026-05-20' })];
    expect(due.dueTasks(records, '2026-05-31')).toEqual([]);
  });

  it('excludes a task never done (no cycle to measure from)', () => {
    const records = [record({ plantId: 'p1', lastDoneOn: null })];
    expect(due.dueTasks(records, '2026-05-31')).toEqual([]);
  });

  it('honours each task type its own interval', () => {
    const records = [
      record({
        plantId: 'misted',
        careType: CareType.MISTING,
        intervalDays: 3,
        lastDoneOn: '2026-05-10',
      }),
      record({
        plantId: 'repot',
        careType: CareType.REPOTTING,
        intervalDays: 365,
        lastDoneOn: '2026-05-10',
      }),
    ];
    const dueIds = due
      .dueTasks(records, '2026-05-14')
      .map((task) => task.plantId);
    expect(dueIds).toEqual(['misted']);
  });

  it('returns only the due tasks out of a mixed collection', () => {
    const records = [
      record({ plantId: 'overdue', lastDoneOn: '2026-01-01' }),
      record({ plantId: 'not-yet', lastDoneOn: '2026-05-28' }),
      record({ plantId: 'never', lastDoneOn: null }),
    ];
    expect(
      due.dueTasks(records, '2026-05-31').map((task) => task.plantId),
    ).toEqual(['overdue']);
  });
});

describe('CareDueService.nextDueOn', () => {
  it('adds the interval to the last-done date', () => {
    expect(due.nextDueOn('2026-05-01', 30)).toBe('2026-05-31');
  });

  it('is null when never done', () => {
    expect(due.nextDueOn(null, 30)).toBeNull();
  });
});
