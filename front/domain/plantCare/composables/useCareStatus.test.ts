import { describe, expect, it } from 'vitest';
import { useCareStatus } from './useCareStatus';

const schedule = (
  lastDoneOn: string | null,
  nextDueOn: string | null,
): { lastDoneOn: string | null; nextDueOn: string | null } => ({
  lastDoneOn,
  nextDueOn,
});

describe('useCareStatus', () => {
  it('reads as never done when there is no cycle yet', () => {
    expect(useCareStatus(schedule(null, null), '2026-08-31').level).toBe('never');
  });

  it('is due today when the next-due date is today', () => {
    const status = useCareStatus(schedule('2026-08-01', '2026-08-31'), '2026-08-31');
    expect(status.level).toBe('dueToday');
  });

  it('counts the days it is overdue', () => {
    const status = useCareStatus(schedule('2026-08-01', '2026-08-31'), '2026-09-03');
    expect(status.level).toBe('overdue');
    expect(status.count).toBe(3);
  });

  it('counts the days until it is next due', () => {
    const status = useCareStatus(schedule('2026-08-01', '2026-08-31'), '2026-08-28');
    expect(status.level).toBe('upcoming');
    expect(status.count).toBe(3);
  });
});
