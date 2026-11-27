/**
 * Time budgets of every API operation: one entry per GraphQL query and mutation and per
 * REST route. They come from UX rules (Nielsen, RAIL, Doherty, Core Web Vitals), never from
 * what the code does today: slower code is a bug to fix. Tightening is free; loosening needs
 * the maintainer's OK in the PR.
 *
 * Coverage is enforced twice: `check-coverage.mjs` fails when the schema or a controller
 * declares an operation that has no entry here, and api.ts types its calls by this table, so
 * `tsc` fails when an entry has no k6 call.
 *
 * See docs/plans/refactor-socle.md, "Performance lot (V11)".
 */

// A budget cites the UX rule behind each of its numbers: p95 is what most visits feel, p99
// the worst the same person meets once in a hundred actions.
export type Budget = {
  p95: number;
  p95Rule: string;
  p99: number;
  p99Rule: string;
};

// Reads feeding a screen. Nielsen: 1 s is the limit of an uninterrupted flow of thought, so
// the main content shows within 1 s of a navigation. The page keeps 700 ms for the network,
// the render and the other calls, the API gets 300 ms (p95). At p99 the API may use up to
// 800 ms, which leaves the 200 ms of one round trip: the page still answers in about 1 s.
const READ: Budget = {
  p95: 300,
  p95Rule: 'Nielsen 1 s to content: API share of a navigation',
  p99: 800,
  p99Rule: 'Nielsen 1 s flow of thought, minus one 200 ms round trip',
};
// Mutations. Doherty: below 400 ms the person and the screen keep each other's pace, so
// 250 ms (p95) leaves 150 ms for the round trip and the render. At p99, 600 ms plus a 400 ms
// slow round trip is still Nielsen's 1 s.
const MUTATION: Budget = {
  p95: 250,
  p95Rule: 'Doherty 400 ms: API share of an action',
  p99: 600,
  p99Rule: 'Nielsen 1 s flow of thought, minus one 400 ms slow round trip',
};
// Calendar apps poll in the background: nobody waits for the screen, but a feed that takes
// more than a second is a feed that times out.
const FEED: Budget = {
  p95: 400,
  p95Rule: 'Doherty 400 ms: the feed is read like a screen',
  p99: 1000,
  p99Rule: 'Nielsen 1 s: machine client timeout',
};
// Probes answer instantly: Nielsen 0.1 s is "the system reacts instantaneously".
const HEALTH: Budget = {
  p95: 100,
  p95Rule: 'Nielsen 0.1 s: instantaneous',
  p99: 300,
  p99Rule: 'RAIL: a response under 300 ms still reads as immediate',
};

const budgets = <const Tags extends readonly string[]>(
  budget: Budget,
  tags: Tags,
): Record<Tags[number], Budget> =>
  Object.fromEntries(tags.map((tag) => [tag, budget])) as Record<
    Tags[number],
    Budget
  >;

export const BUDGETS = {
  // GraphQL queries (tag = field name).
  ...budgets(READ, [
    'aiWorkerOnline',
    'amIAdmin',
    'bugReports',
    'calendarFeedToken',
    'careSchedules',
    'diagnosisJob',
    'googleEnabled',
    'identificationJob',
    'improvementRequests',
    'journalEntries',
    'me',
    'pendingPairing',
    'plant',
    'plantFacets',
    'plants',
    'plantsDue',
    'speciesAdvice',
    'speciesSuggestions',
    'suggestPlantName',
    'wateringDefault',
    'wateringEvents',
    'webPushPublicKey',
    'workerTokens',
  ] as const),
  // GraphQL mutations (tag = field name).
  ...budgets(MUTATION, [
    'addJournalEntry',
    'approvePairing',
    'blockReporter',
    'createPlant',
    'createWorkerToken',
    'deleteJournalEntry',
    'deletePlant',
    'deleteWateringEvent',
    'denyPairing',
    'diagnosePlant',
    'logCare',
    'regenerateCalendarFeedToken',
    'removeCareSchedule',
    'reportBug',
    'requestImprovement',
    'revokeWorkerToken',
    'setBugStatus',
    'setCareSchedule',
    'setImprovementStatus',
    'setPlantnetApiKey',
    'subscribeToPush',
    'unsubscribeFromPush',
    'updatePlant',
    'waterPlant',
  ] as const),
  // REST routes (tag = routeTag(method, path)).
  ...budgets(HEALTH, ['GET_health', 'GET_health_ready'] as const),
  ...budgets(FEED, ['GET_calendar_feed_token'] as const),
  ...budgets(READ, [
    'GET_images_key',
    'GET_auth_google',
    'GET_auth_google_callback',
    'GET_worker_next_job',
  ] as const),
  ...budgets(MUTATION, [
    'POST_auth_register',
    'POST_auth_login',
    'POST_auth_logout',
    'POST_auth_verify_email',
    'POST_auth_resend_verification',
    'POST_auth_forgot_password',
    'POST_auth_reset_password',
    'POST_worker_pair_start',
    'POST_worker_pair_poll',
    'POST_worker_jobs_id_result',
    'POST_worker_jobs_id_diagnosis',
    'POST_worker_jobs_id_embedding',
    'POST_worker_jobs_id_failed',
    'POST_worker_jobs_id_diagnosis_failed',
    'POST_uploads_request_identification',
    'POST_uploads_identify_plant',
    'POST_uploads_plant_image',
    'POST_uploads_bug_image',
  ] as const),
};

export type Operation = keyof typeof BUDGETS;

// "GET /calendar-feed/:token" -> "GET_calendar_feed_token": the tag of a REST route.
export const routeTag = (method: string, path: string): string =>
  `${method}_${path.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '')}`;

// Every operation, under every profile: nothing fails more than one request in a hundred.
// `p95Scale` is how far past its p95 budget a profile may go (1 everywhere but the spike,
// where the plan allows 2); the p99 budgets never move.
export const thresholdsFor = (p95Scale = 1): Record<string, string[]> => {
  const thresholds: Record<string, string[]> = {
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  };
  for (const [op, budget] of Object.entries(BUDGETS)) {
    thresholds[`http_req_duration{op:${op}}`] = [
      `p(95)<${budget.p95 * p95Scale}`,
      `p(99)<${budget.p99}`,
    ];
  }
  return thresholds;
};

// The rules behind each budget, printed in the run's report.
export const budgetRules = (): string[] =>
  [...new Set(Object.values(BUDGETS))].map(
    (budget) =>
      `p95 < ${budget.p95} ms (${budget.p95Rule}); p99 < ${budget.p99} ms (${budget.p99Rule})`,
  );
