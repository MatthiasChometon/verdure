import { WateringScheduleService } from '../schedule.service';

const schedule = new WateringScheduleService();

describe('WateringScheduleService.season', () => {
  it('treats April to September as summer', () => {
    expect(schedule.season(new Date('2026-04-01T00:00:00Z'))).toBe('summer');
    expect(schedule.season(new Date('2026-07-15T00:00:00Z'))).toBe('summer');
    expect(schedule.season(new Date('2026-09-30T00:00:00Z'))).toBe('summer');
  });

  it('treats October to March as winter', () => {
    expect(schedule.season(new Date('2026-10-01T00:00:00Z'))).toBe('winter');
    expect(schedule.season(new Date('2026-12-15T00:00:00Z'))).toBe('winter');
    expect(schedule.season(new Date('2026-03-31T00:00:00Z'))).toBe('winter');
  });
});

describe('WateringScheduleService.nextDue', () => {
  it('returns null when the plant was never watered', () => {
    expect(schedule.nextDue(null, 5, 14)).toBeNull();
  });

  it('adds the summer interval for a summer watering', () => {
    expect(schedule.nextDue('2026-07-10', 5, 14)).toBe('2026-07-15');
  });

  it('adds the winter interval for a winter watering', () => {
    expect(schedule.nextDue('2026-12-10', 5, 14)).toBe('2026-12-24');
  });

  it('crosses month and year boundaries correctly', () => {
    expect(schedule.nextDue('2026-12-28', 5, 7)).toBe('2027-01-04');
  });

  it('returns null when the relevant season has no interval', () => {
    expect(schedule.nextDue('2026-07-10', null, 14)).toBeNull();
    expect(schedule.nextDue('2026-12-10', 5, null)).toBeNull();
  });
});
