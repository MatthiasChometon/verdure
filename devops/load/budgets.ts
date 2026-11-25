/**
 * Time budgets of every API operation. They come from UX rules (Nielsen, RAIL,
 * Doherty, Core Web Vitals), never from what the code does today: slower code is a
 * bug to fix. Tightening is free; loosening needs the maintainer's OK in the PR.
 *
 * See docs/plans/refactor-socle.md, "Performance lot (V11)".
 */

export type Budget = { p95: number; p99: number; rule: string };

// Reads feeding a screen: the main content shows within 1 s of a navigation (Nielsen 1 s,
// RAIL load), which leaves 300 ms (p95) / 800 ms (p99) for the API.
const READ: Budget = {
  p95: 300,
  p99: 800,
  rule: 'flow of thought, 1 s to content',
};
// Mutations: Doherty threshold 400 ms end to end, so 250 ms (p95) for the API.
const MUTATION: Budget = { p95: 250, p99: 600, rule: 'Doherty, 400 ms' };
// Public REST routes called by machines (calendar apps) stay cheap too.
const FEED: Budget = { p95: 400, p99: 1000, rule: 'machine client, bounded' };
const HEALTH: Budget = { p95: 100, p99: 300, rule: 'instantaneous, 100 ms' };

export const BUDGETS: Record<string, Budget> = {
  health: HEALTH,
  me: READ,
  plants: READ,
  plantsDue: READ,
  plantFacets: READ,
  plant: READ,
  wateringEvents: READ,
  calendarFeedToken: READ,
  calendarFeed: FEED,
  waterPlant: MUTATION,
};

// Every operation, under every profile: nothing fails more than one request in a hundred.
export const thresholdsFor = (scale = 1): Record<string, string[]> => {
  const thresholds: Record<string, string[]> = {
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  };
  for (const [op, budget] of Object.entries(BUDGETS)) {
    thresholds[`http_req_duration{op:${op}}`] = [
      `p(95)<${budget.p95 * scale}`,
      `p(99)<${budget.p99 * scale}`,
    ];
  }
  return thresholds;
};
