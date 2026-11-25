import type { Options } from 'k6/options';
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

// The expected peak is ~10 people at once; the load profile plays three times that.
const PEAK_VUS = 10;
const LOAD_VUS = PEAK_VUS * 3;

const smoke: Options = {
  scenarios: {
    users: {
      executor: 'constant-vus',
      exec: 'person',
      vus: 2,
      duration: '30s',
    },
  },
  thresholds: thresholdsFor(),
};

// Short enough for every PR (smoke 30 s + 3 min).
const load: Options = {
  scenarios: {
    users: {
      executor: 'ramping-vus',
      exec: 'person',
      stages: [
        { duration: '30s', target: LOAD_VUS },
        { duration: '2m', target: LOAD_VUS },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: thresholdsFor(),
};

// Peak x3 then a surge to x10: p95 may reach 2x the budget during it, never more.
const spike: Options = {
  scenarios: {
    users: {
      executor: 'ramping-vus',
      exec: 'person',
      stages: [
        { duration: '30s', target: LOAD_VUS },
        { duration: '10s', target: PEAK_VUS * 10 },
        { duration: '2m', target: PEAK_VUS * 10 },
        { duration: '10s', target: LOAD_VUS },
        { duration: '2m', target: LOAD_VUS },
      ],
    },
  },
  thresholds: thresholdsFor(2),
};

// Ever more people for 8 minutes: expected to find the limit, reports it.
const stress: Options = {
  scenarios: {
    users: {
      executor: 'ramping-vus',
      exec: 'person',
      stages: [{ duration: '8m', target: 400 }],
      gracefulRampDown: '0s',
    },
  },
  thresholds: thresholdsFor(),
};

// 30 minutes at the load level: a leak shows as memory climbing in the resource samples.
const soak: Options = {
  scenarios: {
    users: {
      executor: 'constant-vus',
      exec: 'person',
      vus: LOAD_VUS,
      duration: '30m',
    },
  },
  thresholds: thresholdsFor(),
};

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
