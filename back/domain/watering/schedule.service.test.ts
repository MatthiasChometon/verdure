import { WateringScheduleService } from './schedule.service';

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

describe('WateringScheduleService.isWinterRest', () => {
  it('is true in the deep dormancy months (December to February)', () => {
    expect(schedule.isWinterRest(new Date('2026-12-01T00:00:00Z'))).toBe(true);
    expect(schedule.isWinterRest(new Date('2026-01-15T00:00:00Z'))).toBe(true);
    expect(schedule.isWinterRest(new Date('2026-02-28T00:00:00Z'))).toBe(true);
  });

  it('is false outside the deep dormancy months', () => {
    expect(schedule.isWinterRest(new Date('2026-03-01T00:00:00Z'))).toBe(false);
    expect(schedule.isWinterRest(new Date('2026-07-15T00:00:00Z'))).toBe(false);
    expect(schedule.isWinterRest(new Date('2026-11-30T00:00:00Z'))).toBe(false);
  });
});

describe('WateringScheduleService.seasonalFactor', () => {
  it('does not stretch the interval during the growing season', () => {
    expect(schedule.seasonalFactor(new Date('2026-04-01T00:00:00Z'))).toBe(1);
    expect(schedule.seasonalFactor(new Date('2026-09-30T00:00:00Z'))).toBe(1);
  });

  it('stretches the interval a little in the shoulder months', () => {
    expect(schedule.seasonalFactor(new Date('2026-03-15T00:00:00Z'))).toBe(1.2);
    expect(schedule.seasonalFactor(new Date('2026-10-15T00:00:00Z'))).toBe(1.2);
    expect(schedule.seasonalFactor(new Date('2026-11-15T00:00:00Z'))).toBe(1.2);
  });

  it('stretches the interval the most in deep winter dormancy', () => {
    expect(schedule.seasonalFactor(new Date('2026-12-15T00:00:00Z'))).toBe(1.5);
    expect(schedule.seasonalFactor(new Date('2026-01-15T00:00:00Z'))).toBe(1.5);
    expect(schedule.seasonalFactor(new Date('2026-02-15T00:00:00Z'))).toBe(1.5);
  });
});

describe('WateringScheduleService.winterRest', () => {
  const inDormancy = new Date('2026-01-15T00:00:00Z');
  const inGrowth = new Date('2026-07-15T00:00:00Z');

  it('is true only when tracked for winter and currently in dormancy', () => {
    expect(schedule.winterRest(inDormancy, 14)).toBe(true);
  });

  it('is false for a plant not tracked for winter', () => {
    expect(schedule.winterRest(inDormancy, null)).toBe(false);
  });

  it('is false outside the dormancy months', () => {
    expect(schedule.winterRest(inGrowth, 14)).toBe(false);
  });
});

describe('WateringScheduleService.nextDue', () => {
  it('returns null when the plant was never watered', () => {
    expect(schedule.nextDue(null, 5, 14)).toBeNull();
  });

  it('adds the plain summer interval during the growing season', () => {
    expect(schedule.nextDue('2026-07-10', 5, 14)).toBe('2026-07-15');
  });

  it('stretches the shoulder-month interval by 1.2', () => {
    // October is winter (14 days) in a shoulder month → round(14 * 1.2) = 17.
    expect(schedule.nextDue('2026-10-10', 5, 14)).toBe('2026-10-27');
  });

  it('stretches the deep-dormancy interval by 1.5', () => {
    // December is deep dormancy → round(14 * 1.5) = 21.
    expect(schedule.nextDue('2026-12-10', 5, 14)).toBe('2026-12-31');
  });

  it('crosses month and year boundaries correctly', () => {
    // December is deep dormancy → round(7 * 1.5) = 11.
    expect(schedule.nextDue('2026-12-28', 5, 7)).toBe('2027-01-08');
  });

  it('returns null when the relevant season has no interval', () => {
    expect(schedule.nextDue('2026-07-10', null, 14)).toBeNull();
    expect(schedule.nextDue('2026-12-10', 5, null)).toBeNull();
  });
});
