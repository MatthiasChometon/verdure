import type { Options, Scenario } from 'k6/options';
import { thresholdsFor } from './budgets.ts';

export type Profile =
  'smoke' | 'load' | 'spike' | 'stress' | 'soak' | 'breakpoint';

export const PROFILES: readonly Profile[] = [
  'smoke',
  'load',
  'spike',
  'stress',
  'soak',
  'breakpoint',
];

export const isProfile = (name: string): name is Profile =>
  (PROFILES as readonly string[]).includes(name);

// The load model, from the plan ("expected peak ~ 10 people at once"), with no think time to
// tune: people arrive at a rate, as they do in life (an open model), and a slow API cannot
// slow the arrivals down.
//
//   one visit      = the 11 requests of `person` in api.ts (a home page, the collection, a
//                    plant, the calendar, a watering)
//   one person     = starts a visit every 5 s while using the app (Nielsen's 10 s attention
//                    limit: past it the person does something else, so 5 s is active use)
//   expected peak  = 10 people x 1 visit / 5 s          =  2 visits/s =  22 requests/s
//   load profile   = peak x 3 (the plan)                =  6 visits/s =  66 requests/s
//   spike surge    = peak x 10                          = 20 visits/s = 220 requests/s
//   stress end     = 400 people                         = 80 visits/s = 880 requests/s
//
// The first PR run used 30 users looping with a 1 s pause: 30 visits/s, 15x the intended
// load and not a person. Looping users with a 5 s pause give the same 6 visits/s as the
// load profile above, so moving to arrival rates changes the model, not the demand.
const PEAK_PEOPLE = 10;
const VISIT_EVERY_S = 5;
const PEAK_RATE = PEAK_PEOPLE / VISIT_EVERY_S;
const LOAD_RATE = PEAK_RATE * 3;
const SPIKE_RATE = PEAK_RATE * 10;
const STRESS_RATE = 400 / VISIT_EVERY_S;

// A visit lasts about a second on the replica: VUs are the visits in flight.
const vusFor = (rate: number): { preAllocatedVUs: number; maxVUs: number } => ({
  preAllocatedVUs: Math.ceil(rate * 2),
  maxVUs: Math.ceil(rate * 20),
});

type Stage = { duration: string; target: number };

const seconds = (duration: string): number => {
  const [, amount = '0', unit = 's'] = /^(\d+)([sm])$/.exec(duration) ?? [];
  return Number(amount) * (unit === 'm' ? 60 : 1);
};

const total = (stages: Stage[]): string =>
  `${stages.reduce((sum, stage) => sum + seconds(stage.duration), 0)}s`;

// People: the visits of `person`, at a rate that follows the stages.
const people = (startRate: number, stages: Stage[]): Scenario => ({
  executor: 'ramping-arrival-rate',
  exec: 'person',
  startRate,
  timeUnit: '1s',
  stages,
  ...vusFor(Math.max(...stages.map((stage) => stage.target))),
});

// The rest of the API, for the whole run: one operation per arrival, taken in turn, so each
// of the ~75 operations is measured about every 7 s; the AI worker's jobs, one flow per second
// from a worker of its own (its jobs are claimed in order, so they never share an account).
const everyOperation = (duration: string): Record<string, Scenario> => ({
  operations: {
    executor: 'constant-arrival-rate',
    exec: 'operation',
    rate: 10,
    timeUnit: '1s',
    duration,
    preAllocatedVUs: 20,
    maxVUs: 100,
  },
  worker: {
    executor: 'constant-arrival-rate',
    exec: 'workerFlow',
    rate: 1,
    timeUnit: '1s',
    duration,
    preAllocatedVUs: 1,
    maxVUs: 1,
  },
});

const options = (
  stages: Stage[],
  startRate: number,
  p95Scale = 1,
): Options => ({
  scenarios: {
    users: people(startRate, stages),
    ...everyOperation(total(stages)),
  },
  thresholds: thresholdsFor(p95Scale),
});

const smoke = options([{ duration: '30s', target: PEAK_RATE }], PEAK_RATE);

// Short enough for every PR (smoke 30 s + 3 min).
const load = options(
  [
    { duration: '30s', target: LOAD_RATE },
    { duration: '2m', target: LOAD_RATE },
    { duration: '30s', target: 0 },
  ],
  PEAK_RATE,
);

// Peak x3 then a surge to x10. Plan, "Under load": "under `spike` p95 may reach 2x for the
// duration of the spike, never more", hence a p95 scale of 2; p99 stays at its budget.
const spike = options(
  [
    { duration: '30s', target: LOAD_RATE },
    { duration: '10s', target: SPIKE_RATE },
    { duration: '2m', target: SPIKE_RATE },
    { duration: '10s', target: LOAD_RATE },
    { duration: '2m', target: LOAD_RATE },
  ],
  PEAK_RATE,
  2,
);

// Ever more people for 8 minutes: expected to find the limit, which `report.mjs` prints as
// the number of people at the first threshold breach.
const stress: Options = {
  scenarios: {
    users: people(LOAD_RATE, [{ duration: '8m', target: STRESS_RATE }]),
  },
  thresholds: thresholdsFor(),
};

// 30 minutes at the load level: a leak shows as memory climbing in the resource samples.
const soak = options(
  [
    { duration: '1m', target: LOAD_RATE },
    { duration: '28m', target: LOAD_RATE },
    { duration: '1m', target: 0 },
  ],
  PEAK_RATE,
);

// An ever higher arrival rate until a threshold aborts the run: the last rate held is the
// maximum sustainable throughput, written to the job summary.
const breakpoint: Options = {
  scenarios: {
    users: {
      executor: 'ramping-arrival-rate',
      exec: 'person',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 1000,
      stages: [{ duration: '10m', target: 500 }],
    },
  },
  thresholds: {
    http_req_failed: [
      { threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '20s' },
    ],
    'http_req_duration{op:plants}': [
      { threshold: 'p(95)<1000', abortOnFail: true, delayAbortEval: '20s' },
    ],
  },
};

export const optionsOf = (profile: Profile): Options =>
  ({ smoke, load, spike, stress, soak, breakpoint })[profile];
