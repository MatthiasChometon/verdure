# Plan — refactor `socle` (verdure)

Goal: bring the whole monorepo (back, front, ai worker, Docker, CI) up to
[`docs/best-practices.md`](../best-practices.md) — code that is simple to read, solid and
easy to evolve — **without changing what the user sees**, except for bugs found on the way
(each one with a test that fails without the fix).

Started 2026-11-24. Re-read this file before every step; tick a box only once it is verified.

## Decisions

- **D1 — Branches.** Campaign branch `refactor/socle`, created from
  `refactor/back-best-practices` (PR #3, ad4d396), so the campaign builds on the back audit of
  2026-11-01. Every lot is a branch `refactor/socle-<lot>` and a PR into `refactor/socle`,
  squash-merged after review. **PR #3 is never merged without the maintainer's order**; the final PR
  `refactor/socle` → `main` is stacked on it and stays **open for the maintainer** (merging into
  `main` deploys the back to the shared host and the front to the static host).
- **D2 — Behaviour.** Refactor only. The GraphQL contract (`schema.gql`) changes only when a
  rule requires it, and the front is updated in the same lot. Visual baselines are **never**
  updated: a visual diff is a regression to fix, or a question written in the journal.
- **D3 — Review loop.** Implementer (one agent, its lot only) → picky reviewer (separate
  agent, comments on the PR with numbered findings) → implementer fixes → reviewer re-reviews
  until LGTM → I read the diff, check CI and run the checks, then merge.
- **D4 — Errors.** Services keep throwing Nest HTTP exceptions. One global filter turns unknown
  errors into a generic 500 / GraphQL `INTERNAL_SERVER_ERROR`, maps SQLSTATE `23505` / `23503`
  to a conflict, and every GraphQL error carries a stable `extensions.code`.
- **D5 — Enums.** TS `enum` only when registered in GraphQL; `as const` unions elsewhere.
- **D6 — Scope.** Rules under "Out of scope" in the checklist are not applied.
- **D7 — One back lot at a time** (Drizzle migration numbers); back and front lots of this repo
  are not run at the same time.
- **D8 — Checks before every push**, in each touched package: `pnpm lint`, `pnpm format:check`,
  `pnpm typecheck`, `pnpm test`, `pnpm build`. Back e2e tests run in CI (Docker is off).
- **D9 — No deployment, no merge into `main`, no Docker restart.** The uncommitted change to
  `back/domain/plant/schema.ts` in `C:\projets\verdure` (main checkout) belongs to another
  session and is never touched.
- **D10 — PR #3 "later" items** are re-evaluated in V1: `trustProxy`, body limit, JWT secret
  strength (dev default allowed only outside production), DataLoader for `wateringHistory`,
  `null` → `undefined` inside the app, `upsertByGoogleId` race (`on conflict`), auth token
  writes in transactions, pinned `node:24-slim`, production-only dependencies in the image,
  genus parsing moved out of `suggestPlantName`.
- **D11 — `timestamp` → `timestamptz`** is not done inside slice lots: a generated
  `SET DATA TYPE timestamptz` has no `USING ... AT TIME ZONE 'UTC'` and would shift production
  data by the server time zone. Slice lots list their timestamp columns in the journal; one
  dedicated migration (generated, then checked against prod data with the maintainer) does them all.

## Lots

Each lot audits **every file** in its scope against the checklist, fixes, adds the missing
tests, and lists in its PR body the rules checked and what was left (with the reason).

| Lot | Scope                                                                                                                                                                                                                    | Size (ts+vue lines) |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| V1  | Back socle: `main.ts`, `app.module.ts`, `infrastructure/**`, `tsconfig`/ESLint, `Dockerfile`, compose files, `devops/`, PR #3 "later" items (D10) that live there                                                        | ~1k + config        |
| V2  | Back `domain/aiWorker`, `plant`, `plantIdentify`                                                                                                                                                                         | 4.3k                |
| V3  | Back `domain/auth`, `user`, `speciesReference`, `species`, `nickname`                                                                                                                                                    | 3.8k                |
| V4  | Back `domain/bugReport`, `watering`, `wateringReminder`, `plantCare`, `improvementRequest`, `calendarFeed`, `plantJournal`, `pushSubscription`, `adminNotice`                                                            | 5.0k                |
| V5  | Front socle: `nuxt.config.ts`, `ddd/`, `infrastructure/**`, `tsconfig`/ESLint, PR CI for the front (`ci-front.yml`)                                                                                                      | ~1.2k + config      |
| V6  | Front `domain/plant`                                                                                                                                                                                                     | 4.2k                |
| V7a | Front `domain/watering`, `plantCare`, `reminders`, `calendarFeed`, `plantJournal`                                                                                                                                        | ~2k                 |
| V7b | Front `domain/ai`, `auth`, `bugReport`, `improvementRequest`, `legal`: null policy, announced states, exemption block deleted                                                                                            | ~3k                 |
| V7c | Last owner (no further deferral): `exactOptionalPropertyTypes` on and green, translation blocks moved + scanner on every slice (incl. `domain/site`), `ci-e2e.yml` with Linux baselines or a V9 decision with the reason | —                   |
| V10 | Transverse, after V7c: no `void` on a promise (ESLint `ignoreVoid: false`), one shared retry helper with exponential backoff + full jitter (outbound idempotent calls, `usePolling`), back global interceptors (request log, timeout), front `useApi` / GraphQL interceptors (401 to sign-in, report unexpected errors once), format pipes on `calendarFeed` token, image key, auth `key` argument | repo-wide |
| V8  | `ai/` worker (Python): only the TypeScript-side contract and Docker rules apply; checked for readability, timeouts, errors                                                                                               | —                   |
| V11 | Performance: k6 suite on every API operation with failing per-operation budgets chosen from UX rules, full profiles weekly, time budgets in the back e2e tests (median + SQL query count), Playwright screen timings, Vitest timeouts and benches, Lighthouse CI budgets, AI worker latency kept in `ai/perf`; **first: the slow home page plants** (section "Performance lot") | — |
| V9  | Final pass: duplicates across slices, dead code / unused dependencies, README and docs, final PR to `main`                                                                                                               | —                   |

- [x] V1 — impl · review · ci · ok · merged (PR #4, e55bd83)
- [x] V2 — impl · review · ci · ok · merged (PR #5, 7653f78)
- [x] V3 — impl · review · ci · ok · merged (PR #7, c5304d1)
- [x] V4 — impl · review · ci · ok · merged (PR #10, d10bb94)
- [x] V5 — impl · review · ci · ok · merged (PR #17, 089f0f8)
- [x] V6 — impl · review · ci · ok · merged (PR #18, bfc44d6)
- [x] V7a — impl · review · ci · ok · merged (PR #19, 88e24a6): watering, plantCare, reminders, calendarFeed, plantJournal
- [x] V7b — impl · review · ci · ok · merged (PR #20, 1645983): ai, auth, bugReport, improvementRequest, legal + null policy + exemption block deleted
- [x] V7c — impl · review · ci · ok · merged (PR #21, c955bbc): `exactOptionalPropertyTypes` green with the flag on; translation blocks moved + scanner on all slices; `ci-e2e.yml` with Linux baselines, or a V9 decision with the reason
- [x] V10 — impl · review · ci · ok · merged (after V7c; PR #22, 6687507)
- [x] V8 — impl · review · ci · ok · merged (PR #24)
- [ ] V11 — impl · review · ci · ok · merged (after V10, parallel to V8; before V9); home page plants budget proven red then fixed
- [ ] V9 — impl · review · ci · ok · merged; also from V7c: `ci-e2e.yml` lands (Linux visual baselines reviewed by the maintainer, or a non-visual Playwright suite), or the reason is recorded
- [ ] Final PR `refactor/socle` → `main` opened (stacked on PR #3), left for the maintainer

## Performance lot (V11) — load tests and time budgets that fail

Requested by the maintainer on 2026-11-25: k6, "test as much as possible", and code tests that
**fail when something is too slow**, not just a smoke run, with budgets chosen from UX rules.
Model: `devops/load/` and `.github/workflows/load.yml` of the shop site repo (k6 2.3.0, a
replica on the runner, profiles).

### Budgets come from UX rules, not from what the code does today

A budget is what a person accepts, then split between the network, the API and the rendering.
A baseline measured on CI only checks that the budget is reachable; **if the code is slower than
the UX budget, the test is red and that is a bug to fix** (never a budget to raise).

| UX rule (source) | Threshold | Budget it gives |
| --- | --- | --- |
| Feels instantaneous (Nielsen 0.1 s; RAIL "response") | 100 ms | visible feedback after a tap or click (pressed state, skeleton, optimistic update) ≤ 100 ms |
| Interaction to Next Paint, "good" (Core Web Vitals) | 200 ms (p75) | INP ≤ 200 ms on every page; no long task > 50 ms on the main thread during an interaction |
| Doherty threshold (flow is kept) | 400 ms | a mutation (save, toggle, add) answers in p95 ≤ 400 ms end to end, API p95 ≤ 250 ms |
| Flow of thought kept (Nielsen 1 s; RAIL "load" ≤ 1 s on a warm navigation) | 1 s | main content of a screen visible ≤ 1 s after a client-side navigation; the API reads that feed it p95 ≤ 300 ms, p99 ≤ 800 ms |
| Largest Contentful Paint, "good" (Core Web Vitals) | 2.5 s (p75) | LCP ≤ 2.5 s on a cold load (Lighthouse mobile, slow 4G); FCP ≤ 1.8 s; TTFB ≤ 800 ms |
| Cumulative Layout Shift, "good" | 0.1 | CLS ≤ 0.1; every deferred block reserves its place (skeleton) |
| Attention limit (Nielsen 10 s) | 10 s | any operation over 1 s shows progress; over 10 s it runs in the background with a notification, never a blocking wait |

Under load (k6 `load` profile, expected peak × 3) the same p95 budgets hold; under `spike` p95
may reach 2× for the duration of the spike, never more; `http_req_failed` < 1 % everywhere.

### Known failure to catch first: the home page plants

The maintainer reports (2026-11-25) that **the plants take too long to appear on the home
page**. The V11 budget test for that screen (navigation to plant cards visible, budget 1 s warm,
LCP 2.5 s cold, the API read feeding it p95 <= 300 ms) **must be red on the current code**:
prove it in the PR (failing run linked), find the cause (query, N+1, image loading, waterfall of
requests, hydration, missing skeleton) and fix it in a `fix(...)` commit until the test is green.

### Work

1. **k6 suite in `devops/load/`** (TypeScript, own `package.json`, linted and typechecked in CI):
   one scenario per API operation (every GraphQL query and mutation, the REST routes (calendar feed, image upload, file storage), the identification flow with the AI worker stubbed at a fixed latency so the API itself is measured), with seeded realistic data (several accounts with
   full data, not an empty database) and per-request `check`s on the status and the body shape.
   Profiles: `smoke`, `load` (expected peak × 3), `spike`, `stress`, `soak` (30 min, watches
   memory and pool growth), `breakpoint` (ramping arrival rate until a threshold aborts: the
   maximum sustainable throughput goes in the job summary).
2. **Budgets that fail**: one `devops/load/budgets.ts` file, values from the table above, per
   operation tag: `http_req_duration{op:...}` p95 and p99, `http_req_failed` < 1 %, `checks`
   > 99 %; `abortOnFail` on the breakpoint run. Tightening is free; loosening needs the
   maintainer's OK in the PR.
3. **Realistic constraints**: the API runs on the runner held to the shared host's limits
   (1 CPU, 512 MB heap, same Node and PostgreSQL major versions, same pool size), PostgreSQL as a
   service container. **Never load the production host** (a light pass of a few requests at
   most, under the rate limit).
4. **CI** (`load.yml`, `permissions: contents: read`): on every PR touching `back/**`, `front/**`
   or `devops/load/**`: `smoke` + a short `load` (≤ 5 min), red on any threshold breach. Weekly
   cron (Monday 03:00 UTC) + `workflow_dispatch`: `load`, `spike`, `stress`, `soak`,
   `breakpoint`, report as an artifact, summary in `$GITHUB_STEP_SUMMARY`.
5. **Time budgets in the code tests** (they fail when too slow):
   - back e2e: a shared helper measures each operation over N >= 10 calls on seeded data and
     asserts the **median** under its UX budget; one budget test per operation;
   - deterministic proxies wherever they exist: the **number of SQL queries** per request is
     constant whatever the number of rows (N+1 guard, counted through the Drizzle logger), lists
     are paginated or bounded, hot queries use their index (`EXPLAIN` asserted on the largest
     tables);
   - `pg_stat_statements` on the CI PostgreSQL; the 10 slowest statements of the load run in the
     job summary;
   - Vitest: explicit `testTimeout` / `hookTimeout` per config so a hung or slow test fails;
     `vitest bench` on the hot pure functions with a stored baseline;
   - front, Playwright on the built app with seeded data and CPU throttling ×4: for each main
     screen, time from navigation to its main content visible (user timing marks), budget 1 s
     warm / LCP 2.5 s cold; INP of the main interactions <= 200 ms; skeleton visible <= 100 ms;
   - front, **Lighthouse CI on the runner only** (never locally: it saturates the dev machine)
     on the main pages: LCP, CLS, TBT < 200 ms, total JS and image weight budgets, all blocking.
6. **Anti-flake rules**: no timing assertion on a single sample; CI re-runs a failed timing test
   once before reporting; a budget that flakes twice in a week is investigated (real slowness or
   a wrong budget), never silently raised.
7. The PR lists every operation and screen with its budget, the UX rule behind it and the
   measured value, plus the breakpoint throughput. Every budget the current code misses is a
   separate `fix(...)` commit (slow query, missing index, N+1, waterfall of requests, heavy
   render), with the budget test proven red before the fix.

## Journal

- 2026-11-24 — Worktree `C:\projets\verdure-socle` on `refactor/socle`. Back checklist of PR #3
  merged into the monorepo checklist `docs/best-practices.md` (the old
  `back/docs/best-practices.md` is removed; the 2026-11-01 audit stays in `back/docs/`). Plan
  written.

- 2026-11-24 — V1 (back socle, PR `refactor/socle-v1`).
  Turned on: env validation in `bootstrap()` (`infrastructure/config/env.ts`, only what is
  already `getOrThrow`, so nothing new is required in prod; the public placeholder JWT secret is
  refused when `NODE_ENV=production`); global exception filter + stable GraphQL
  `extensions.code` (`infrastructure/errors/`); fragment-aware depth limit replacing
  `graphql-depth-limit`; `configureApp`/`createAdapter` (`infrastructure/http/setup.ts`) with an
  explicit body limit; `abortOnError: false`; `/health` liveness vs `/health/ready` readiness;
  compose support ports on 127.0.0.1, healthchecks on `/health/ready`, prod compose requires
  `JWT_SECRET`; `noImplicitOverride`; ESLint `no-non-null-assertion`; `drizzle.config.ts`
  without `!`; complete `.env.example`.
  Deferred: `noUncheckedIndexedAccess` (45 errors, almost all in `domain/`) -> last back slice
  lot; `trustProxy` (changes `req.protocol` used by `ImageUrl`, prod proxy chain unproven);
  pinned minio/mailpit image tags and Node patch version (exact versions not verifiable
  offline); `pnpm audit --prod` in CI (`ci-back.yml`, out of V1 scope); prod-only deps in the
  image (drizzle-kit needs `node_modules` for the entrypoint migrations); post-restart health
  poll in `devops/deploy/deploy.sh`.
  For V2-V4 (domain): domain harnesses (`aiWorker`, `auth/emailAndPassword`, `bugReport`,
  `plant`, `species`, `pushSubscription` e2e) still hand-wire the app instead of `configureApp`
  - `ErrorsInfrastructureModule`; DataLoader for `wateringHistory`; `upsertByGoogleId` race
    (`on conflict`); auth token transactions; `null` -> `undefined`; genus parsing out of
    `suggestPlantName`; `config.get` + `Number(...) || default` reads in domain.
    Deletion candidates: none.
    V1 review follow-up (PR #4): the placeholder/length-floor (32) JWT checks apply only under
    Passenger (the real deployment), not on `NODE_ENV`, since the local prod-like compose stacks
    run `NODE_ENV=production` with a throwaway secret; `deploy.sh` runs the same validation
    (`dist/infrastructure/config/check.js`) on the real `.env` before `touch restart.txt`.
    `node` pinned to `24.22.3-slim` and `mailpit` to `v1.34.0` (bump on purpose). `minio`/`mc`
    stay on `latest`: the images are no longer listed by the Docker Hub API, so no tag could
    be verified. `plantnet.service.ts` keeps `null` (its `{ species: string | null }` result
    is a contract used by `domain/`): lots V2-V4. API/front ports: `BIND_ADDRESS`, loopback by
    default. The maintainer's local start script (outside the repo) must export
    `BIND_ADDRESS=0.0.0.0` for phone use.
- 2026-11-24 — V1 merged (PR #4): 2 review rounds, 10 findings (1 blocker: the fragment-aware depth
  limit counted introspection fields and refused `getIntrospectionQuery()`; same fix ported to menu, PR
  menu#4). Left on purpose: the `deploy.sh` env check runs after the build (limitation documented in the
  script), `docker-compose.prod.yml` (local prod-like stack) is not held to the deployed secret rules,
  `minio`/`mc` on `latest` (no tag verifiable; a fresh pull may differ from the maintainer's local images).
  **Before merging to `main`, the maintainer must confirm the production `JWT_SECRET` is ≥ 32 characters and not
  the placeholder** (otherwise every deploy refuses to restart), and the local start script must export
  `BIND_ADDRESS=0.0.0.0` for phone use.

- 2026-11-24 — V2 (back `domain/aiWorker`, `domain/plant`, `domain/plantIdentify`, PR `refactor/socle-v2`).
  Turned on: `bootTestApp` (`infrastructure/testing/test-app.ts`) boots `AppModule` through
  `configureApp` + `createAdapter`, used by the plant and aiWorker harnesses and the new
  plantIdentify e2e; `insertedRow` (`infrastructure/database/inserted-row.ts`) narrows
  `insert ... returning()`, so every `noUncheckedIndexedAccess` site of the three slices is fixed
  (checked with `tsc --noUncheckedIndexedAccess`; the flag itself stays OFF until V4);
  `PLANTNET_SHARED_DAILY_LIMIT`, `AI_WORKER_LONG_POLL_MS` and `AI_WORKER_POLL_INTERVAL_MS`
  validated at boot as positive integers (`positiveIntegerSetting`, replaces `Number(...) ||
default`); `null` -> `undefined` inside the slices and in `plantnet.service.ts` (null stays in REST
  bodies, GraphQL fields and DB columns); `JobKind` is an `as const` union (D5), `FailReason` and
  `PairingStatus` replace bare strings, typed columns (`$type`, no migration) remove the status
  casts; genus parsing lives in `PlantGenus`; five-parameter embedding calls take one object;
  plant files no longer repeat the folder name; mock-based `save/resolver.test.ts` and the two
  plantIdentify controller tests became e2e tests.
  Fixed: pairing token handed to a single concurrent poll; a late or repeated report can no longer
  overwrite a finished recognition job (UPDATE guarded on pending/processing).
  Timestamp columns for D11 (not converted): `plant.createdAt`; `recognitionJob.createdAt`,
  `updatedAt`; `workerPairing.createdAt`, `expiresAt`; `workerToken.createdAt`, `lastSeenAt`
  (`plantnetSharedUsage.day` is a `date`, not an instant).
  Left on purpose: `forwardRef` between plant and watering/speciesReference modules (a real
  cycle, untangling is a cross-slice change); `wateringHistory` has no DataLoader because it is only
  resolved on the single-plant `plant` query, never on a list; `NicknameRepository.pick` and
  `SpeciesReconciler.reconcile` still return `null` (lot V3, `domain/nickname`, `domain/species`);
  `UserRepository.plantnetKeyOf` still returns `null` (V3, `domain/user`); user seeding helpers in
  harnesses stay per slice until V3 offers a shared one.
  Deferred null types: the service returns `RecognitionJob` / `DiagnosisJob` and the
  `failReason`, `species`, `diagnosis` fields stay `| null` because they are GraphQL models mirroring
  nullable columns (V4 when the GraphQL models are reviewed); `PlantNickname`/`SpeciesReconciler`
  as above. Converted at the repository boundary: `ClaimedJob`, `completeEmbedding`,
  `applyEmbeddingResult`, `PlantEmbeddingText.description`.
  Still to adopt `bootTestApp` (V3/V4): `species/harness`, `auth/emailAndPassword/harness`,
  `bugReport/harness`, `pushSubscription/subscribe.e2e.test.ts`.
  Worker REST bodies (`result`, `diagnosis`, `embedding`) are validated by class-validator DTOs.
  Deletion candidates: none.
- 2026-11-24 — V2 merged (PR #5): 2 review rounds, 12 findings. Two bugs fixed with fail-first proven
  (throwaway draft PR #6, closed): a pairing token handed to several concurrent polls; a late or repeated
  worker report overwriting a finished job (photo removed twice, diagnosis/embedding applied twice).
  Worker REST bodies validated (DTOs match `ai/worker/app.py`). Left: `SubmitEmbeddingInput` accepts `[]`
  (the worker never sends it; `@ArrayNotEmpty` can come with V8).

- 2026-11-24 — V3 (back `domain/auth`, `user`, `speciesReference`, `species`, `nickname`, PR `refactor/socle-v3`).
  Turned on: tokens spent by one `DELETE ... RETURNING` inside the transaction of the write they
  authorise (`AuthTokenRepository.spend`, `DatabaseExecutor`), issuing replaces the previous token in a
  transaction, sign-up decided by the unique key (the global filter answers 409), Google sign-in as a
  single `upsertByGoogleId` statement (`on conflict`); login equalised for unknown and Google-only
  accounts (`pretendToVerify`, decoy built at boot); Google OAuth calls capped at 5 s (`HttpModule.register`),
  4xx other than 408/429 -> 401, transport/timeout/408/429/5xx -> 503 with a code-only log, non-HTTP errors
  logged with their cause and rethrown as they were, `access_token` validated; callback reads `code` and
  `state` as named `@Query` params through `PlainTextPipe` (refuses arrays), state compared in constant
  time and its cookie cleared by an interceptor before validation, so every outcome (400 included) clears
  it; account e-mails (sign-up, resend, reset) go through `AuthMailer`: queued after the response with a
  15 s timeout, failure logged, never a 500 after the row exists, same synchronous work whether or not
  the address is registered; `spend` checks expiry in SQL (`expiresAt > now()`, an expired token is left
  in place until the next issue replaces it); `species` and `auth` harnesses on
  `bootTestApp`, shared `insertTestUser` (`domain/user/test-user.ts`); `null` -> `undefined` for
  `reconcile`, `pick`, `plantnetKeyOf` (REST bodies keep their null); `SpeciesSuggestionService`
  extracted from the resolver with a validated args class; one `entryOf` / `localise` helper for the
  three speciesReference catalogs; `reconciler.test.ts` (mocked our own repository) became an e2e suite;
  `tsc --noUncheckedIndexedAccess` is clean for the five slices (flag still OFF until V4).
  Fixed (each with a test): unverified-address squatter keeps a working password after the owner signs in
  with Google; Google callback accepted a repeated `state` and compared it with `!==`; Google answers
  trusted without `email_verified` (behaviour change: sign-in now requires a verified address); login
  timing revealed registered emails; catalog lookups returned `Object.prototype` members for a species
  named `constructor` / `__proto__`; nickname bank emptied by a failed chunk and `"<name> undefined"`
  rows for a language with no decorating word.
  Timestamp columns for D11 (not converted): `user.createdAt`, `user.emailVerifiedAt`,
  `authToken.expiresAt`, `authToken.createdAt`, `species.createdAt`, `nickname.createdAt`.
  Left on purpose: `auth_token` has no foreign key to `user` and no unique key on (userId, type)
  (needs a migration, issuing replaces in a transaction instead); residual risk: a squatter's password
  survives when the real owner verifies through the e-mail link rather than Google; `register` still
  answers 409 for a known address (enumeration by response, pre-existing); an e-mail queued in the
  process is lost if the process dies before sending (the person asks again); two concurrent `issue`
  calls can leave two live links (no unique key); the two seeder CLI
  entry points keep `console.error` for a fatal boot failure outside the Nest logger.
  Remaining null types: `User.avatarUrl`, `GoogleProfile.avatarUrl`, `setPlantnetKey(string | null)`,
  GraphQL `string | null` arguments (V4 with the GraphQL models). Harnesses still inserting users inline
  (instead of `insertTestUser`, which now sets `emailVerifiedAt`; only the species harness uses it so far,
  the others are to adopt it): `plant`, `aiWorker`, `bugReport`, `pushSubscription`, `plantIdentify`
  (V4 for the last three, V2 slices left as is).
  Deletion candidates: none.
- 2026-11-24 — V3 merged (PR #7): 3 review rounds, 18 findings. Bugs fixed with fail-first proven on probes #8/#9:
  squatter password kept after a Google sign-in, repeated `state` accepted, Google `email_verified` ignored
  (**behaviour change: Google sign-in now needs a verified Google address**), login timing revealing addresses,
  token burnt by a failed write / redeemable twice, catalog lookups hitting Object.prototype, nickname bank emptied
  on a failed chunk, "<name> undefined" nicknames, auth mails turning an SMTP failure into a 500. Shutdown drains run
  in `beforeApplicationShutdown` (the pool closes in `onModuleDestroy`). Residual points: see the V3 implementer entry.
- 2026-11-24 — Correction to the V3 entry: `beforeApplicationShutdown` runs AFTER every `onModuleDestroy`
  (`@nestjs/core` nest-application-context.js), so the V3 `AuthMailer` drain does not keep the pool open.
  Handed to V4: shared background-task registry awaited by the database module before ending the pool (menu M4 design).
- 2026-11-24 — V4 implementer entry (back slices bugReport, watering, wateringReminder, plantCare,
  improvementRequest, calendarFeed, plantJournal, pushSubscription, adminNotice). Turned on:
  `noUncheckedIndexedAccess` (whole package), every back harness on `bootTestApp` / `insertTestUser`,
  a global `BackgroundTasks` registry drained by the database module before the pool ends (Nest runs
  `onModuleDestroy` ahead of `beforeApplicationShutdown`; a shutdown e2e covers it), strict REMINDER_* env.
  Bugs fixed (each its own commit with a test): admin announcements ran inside the request and could
  fail or hang it; calendar-feed token upsert race; reminder rounds could overlap, one failing user stopped
  the round, unbounded fan-out; push endpoint accepted any URL (SSRF); journal `imageKey` any string and a
  storage hiccup failing a done deletion; startup seeders were fire-and-forget past the pool end.
  Review round 1 also fixed here: the plant embedding write now runs through the registry, the shutdown drain has a
  30 s ceiling (abandoned tasks logged), stored push endpoints are re-checked in `send()` and the call has a 10 s
  timeout, the aiWorker long poll stops on shutdown (held polls answer empty, the pool ends after the last one).
  Owned by V7 (front `ai` / `auth` lots, which update the callers): the remaining `null` GraphQL types
  (`User.avatarUrl`, `GoogleProfile.avatarUrl`, `setPlantnetKey(string | null)`, `string | null` args, the
  RecognitionJob / DiagnosisJob nullable models, `setImprovementStatus.requestedBy`): changing them breaks the
  contract the front reads. Upload keys have no owner (`FileStorageService.upload` returns a bare UUID). V4 closes the journal hole without
  a migration: a journal entry refuses a key already used by another user's entry or plant, and removing an entry
  deletes the file only when no entry or plant still references the key. Owned by V9 (back final pass): the full
  fix, keys prefixed by owner in the upload controllers (bugReport, plantIdentify, aiWorker) with a data migration
  of the stored keys, and the same check for plant and bug-report images. The reference check after a journal delete
  is a known non-atomic window, harmless once keys are owned.
  Timestamp columns for D11 (not converted): `bugReport.createdAt`,
  `reportBlock.blockedAt`, `improvementRequest.createdAt`, `wateringEvent.createdAt`, `careSchedule.createdAt`,
  `calendarFeedToken.createdAt`, `journalEntry.createdAt`, `pushSubscription.createdAt`. Missing `userId`
  foreign keys: `push_subscription`, `watering_event`, `care_schedule`, `journal_entry`. Also left:
  GraphQL context inputs/models duplicated between bugReport and improvementRequest,
  static constraints classes.
  Deletion candidates: none.
- 2026-11-24 — V4 merged (PR #10): 4 review rounds, 18 findings, probes #11-#16 all closed. Back socle of verdure
  is done. Shutdown: `BackgroundTasks` registry drained by the database module (30 s logged ceiling), covers V3's
  auth mails. Security fixes: push endpoint SSRF (allow-list + re-check on send), another user's image key could be
  attached then deleted (refused; file kept while referenced; key-prefix-by-owner → V9). Next: V5 (front socle + CI).
- 2026-11-24 — V5 implemented (branch `refactor/socle-v5`). Front socle audited against the checklist.
  Turned on: `ci-front.yml` (PR gate: lint, format:check, `nuxt typecheck`, unit tests, build;
  `contents: read`, pnpm from `packageManager`, lockfile cache, triggers on `front/**`, the GraphQL schema and the
  workflow itself); strict TS flags `noUncheckedIndexedAccess`, `noImplicitOverride`, `noImplicitReturns`,
  `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters` (template refs moved to `useTemplateRef` in
  bugReport Dialog, plant Card/Toolbar/ImageField/mes-plantes, plantJournal Form and `useReveal`; 0 unused code found) (Nuxt 4 already sets `strict`); type-aware ESLint (no-floating-promises,
  no-misused-promises, no-explicit-any, no-non-null-assertion, no-unnecessary-type-assertion, only-throw-error,
  switch-exhaustiveness-check, consistent-type-imports); `.gitattributes` `* text=auto eol=lf` (Windows autocrlf made
  `format:check` fail locally on 280 files); Vitest `testTimeout` 15 s (the first mount of each test file takes 4.5-6 s on a cold Nuxt environment; slowest: plantJournal Timeline 6.0 s, Form 4.9 s, plant SafetyBadge 4.9 s; about 25 files affected, so global rather than per-file).
  Brand content out of infrastructure: `infrastructure/seo` → `domain/site`, `AmbientFoliage` + brand tokens
  (`style/tokens.css`) → `domain/site` (tag `<SiteAmbientFoliage>`), `sw.ts` → `domain/reminders/pwa`.
  Deferred, counts for V6/V7: `exactOptionalPropertyTypes` 26 errors (generated GraphQL types and Nuxt UI props);

  Domain exemption (one block in `eslint.config.ts`, V7 deletes it): no-non-null-assertion 9,
  no-misused-promises 1, no-unnecessary-type-assertion 1, no-floating-promises 1. Infrastructure: 0 left.
  Lint-disable comments added: none. Deletion candidates: none. CSP kept as is: the duckdns host is still used by
  `domain/ai` (download link) and the AI worker; `fonts.gstatic.com` stays until V9 checks the fonts.
  Left out of CI on purpose: Playwright visual and e2e suites (win32-only baselines, Chromium + preview server).
  Owner: V7, which adds `ci-e2e.yml` with Linux baselines; a baseline is never updated to make a run pass.
  `pnpm audit --prod` is NOT a CI step: it reports 140 advisories (18 low, 46 moderate, 70 high, 6 critical, mostly
  nuxt/nitro 4.4 → 4.6.4); upgrading is owned by V9 (dependencies pass), which then adds the step. V9 also aligns `deploy-front.yml` (Node 24, workflow
  `permissions: contents: read`).
  Not caught by the linter, for V7: `domain/plant/collection/components/List.vue:144` has a template `:ref="(instance: any) => ..."`
  (`no-explicit-any` does not read template expressions).
  `domain/site` owns the brand: design tokens and fonts (`style/tokens.css`, `nuxt.config.ts`), SEO strings, favicons and
  PWA/OG images (`translation/`, `public/`), the ambient foliage. Generic base CSS (Tailwind imports, cursor, focus,
  skip-link) stays in `infrastructure/ui/style/main.css`, the Tailwind root, which imports the brand file through the
  `#brand-tokens` alias (`discoverBrandTokens`, glob `domain/**/style/tokens.css`). The alias is needed because Tailwind only
  processes `@theme` inside the file that imports `tailwindcss`: a first split with two entry files left `@theme` raw in the
  output (default green, no Fraunces), caught by the visual suite. Visual suite run locally after the fix: 6/6 pass, no
  baseline touched (`pnpm test:visual` hangs on `nuxt preview` under Windows; ran `node .output/server/index.mjs` on port 3777 then `playwright test`). Next brand asset goes in `domain/site`.
  `domain/reminders/pwa/sw.ts` keeps the generic precache half (`precacheAndRoute`, cleanup, `skipWaiting`) on purpose:
  one file, one worker scope. Three places to keep in sync: `pwa.srcDir`/`filename` and the `tsConfig.exclude` entry in
  `nuxt.config.ts`, and the `ignores` entry in `eslint.config.ts`. `sw.ts` is excluded from vue-tsc (webworker lib vs DOM)
  and from type-aware ESLint; it is only compiled by the PWA build.
  `deploy-front.yml` untouched (no `permissions` block, Node 22): see the V9 note above.

- 2026-11-25 — V5 merged (PR #17, squash 089f0f8). 2 review rounds, 8 findings + 2 nits: useTemplateRef + noUnused* on, generic base CSS kept in infrastructure, brand tokens/fonts in domain/site via a `#brand-tokens` alias that throws unless exactly one `domain/**/style/tokens.css` exists (Tailwind only processes `@theme` in the importing file), measured 15 s test timeout, CI tests before typecheck. Local: lint, 33 files / 123 tests, typecheck, build OK (format:check fails locally only through CRLF checkout, green in CI). Next: V6.
- 2026-11-25 — V6 (front `domain/plant`, branch `refactor/socle-v6`).
  Turned on: no dynamic i18n key left (Footer, header nav, SafetyBadge, CareSheetCard, ImageField messages); `translation.test.ts` checks fr/en parity, rejects any non-literal lookup (t, $t, obj.t, $i18n.t, te, tm; variable, concatenation, template), checks every used key in fr and en against all layers (it found a missing `accessibility.skip`: defined in `infrastructure/accessibility`, now in scope), and tests its own scanner.
  `List.vue` navigation moved to `usePlantGridNavigation` (template `any` gone, `void nextTick`); module-level `isTyping` → `useIsTyping`; poll loop shared in `usePolling`; plants cache key/shape shared in `usePlantsCache`;
  failure reasons typed (`IdentifyFailReason`), `RecognitionStatus` enum instead of string literals; `MobileMenu` split from `Header`. Internal absence is `undefined` (props, models, identify/diagnosis/advice).
  New announced states (tested, each test fails without the role): `role="alert"` on diagnosis offline/failed, delete failure, save failure, the two page load errors; one persistent `role="status"` region in ImageField for the identification messages (present before any failure). Burger `aria-expanded`; active nav item computed once in `useHeaderNav`. Corrupted `localStorage` mode → cloud (tested).
  `usePolling` stops when its scope is disposed (tested). Script-safe (no auto-import): `usePolling`. Not script-safe: `useIsTyping`, `usePlantGridNavigation`, `usePlantsCache`, `useHeaderNav`.
  ESLint domain exemption: plant share is now 0 (its single `no-floating-promises` fixed); V7 deletes the block once the other slices clear their share.
  Done in review: the Select "all" sentinel is a named constant (`ALL_FILTER`), filter state is `undefined`, mapped only at the Select.
  Deferred, owner V7 (`domain/watering`): `Form.vue` refs `summerDays`/`winterDays`/`lastWateredOn` and `suggestPlantName ?? null` stay `null` because they feed `watering/components/Fields.vue` models; `useNeedsCareSort.ts:23` and `analysis/components/detail/DetailHero.vue:10` keep `WateringStatus | null` because `watering/composables/useWateringStatus.ts` returns `null`. Exit: `useWateringStatus` returns `undefined` and the Fields models are `undefined`-based, then these plant files drop `null`. Also V7: `User.avatarUrl` null, `setPlantnetKey` and job models (exit: boundary mapping).
  `exactOptionalPropertyTypes` stays off. Measured with it on, plant only (12 in production files, 4 in tests): usePlantIdentification.ts 2, Header.vue 1, List.vue 1, usePlantCollection.ts 2, Form.vue 2, FormDialog.vue 1, mes-plantes.vue 3; SafetyPreview.test 2, Card.test 1, usePlantsCache.test 1. Outside plant: auth/Dialog.vue 1, plantCare Section.vue 1, useCareSchedules.ts 1, watering Calendar.vue 1, Fields.vue 2; generated `.nuxt/gql/default.ts` 16, eslint config 1 (owner V7; all are `undefined` passed to an optional prop or `InputMaybe`, fixed by the flag-aware prop types).
  Deletion candidates: none.
- 2026-11-25 — V6 merged (PR #18, squash bfc44d6). 2 review rounds, 11 findings + 3 nits: role=alert/status on every error state with tests that fail without them, ALL_FILTER + undefined filter state, translation scanner hardened (all lookup forms, every layer), usePolling stops with its scope, identification/diagnosis outcomes tested, burger aria-expanded. Local: lint, 46 files / 186 tests, typecheck, build OK. Handed to V7: watering nulls (files + exit condition in the V6 entry), exactOptionalPropertyTypes 12 prod + 4 test errors in plant, ESLint exemption remaining in auth 1, legal 1, plantCare 5, reminders 2, watering 2. Next: V7.
- 2026-11-25 — V7a (front `domain/watering`, `plantCare`, `reminders`, `calendarFeed`, `plantJournal`, plus their `plant` consumers; branch `refactor/socle-v7a`).
  Turned on: internal absence is `undefined` in the five slices (`null` only at the GraphQL input, with a comment, and where a generated type returns it); no dynamic i18n key (`Badge`, `TypeRow`, `useCareTypes`, `useJournalKinds` use literal `t()` calls); `translation.test.ts` now scans the five slices too; no `!` left in them.
  Paris days: `useParisDay` (`isoOf`, `todayIso`, `daysBetween`, `addDays`) and `useWateringSeason` replace the machine-zone `new Date()` arithmetic (watering status, calendar reminder, calendar grid, form default dates, plant page, `usePlantsCache`); calendar days are formatted in UTC, instants in Europe/Paris (`TypeRow`, journal `Entry`/`Timeline`).
  New announced states (each test fails without its role): `role="alert"` on Today load error (new retry button) and failed watering, Calendar failed log/remove, care `Section` load and action failure, reminders enable/disable failure, calendarFeed load and regenerate failure, journal load error, add error, failed deletion (new message); one persistent `role="status"` region in the calendar feed dialog for "link regenerated".
  Bugs fixed (file:function in the PR body): journal dates are now Europe/Paris (`Entry.vue` `formattedDate`, `Timeline.vue` `formatDate`); disabling reminders when the back refused the unsubscribe was silent (`unsubscribeError` never read); Paris-day and month-grid errors around midnight Paris on a UTC machine; calendar-feed token is now URL-encoded; service-worker notification click only opens a same-origin path; invalid VAPID key no longer throws in `atob`.
  ESLint domain exemption: watering 2, plantCare 5, reminders 2, plantJournal 0, calendarFeed 0, plant 0 before; all 0 now. The block now only covers `ai`, `auth`, `bugReport`, `improvementRequest`, `legal` (auth 1 `no-misused-promises`, legal 1 `no-unnecessary-type-assertion`); `site` is 0. Owner V7b: fix those two and delete the block.
  `exactOptionalPropertyTypes` stays off (measured with it on, not committed). My slices: watering 3, plantCare 2 before; plantCare 0 now, watering 3 left (`Fields.vue` 2, `Calendar.vue` 1) because Nuxt UI's `UInput`/`USelectMenu` `modelValue` accepts `null`, not `undefined`. Owner V7b, exit: a typed wrapper or `?? null` at those three props, then flip the flag. Other errors with the flag on belong to `plant`, `auth`, generated `.nuxt/gql` and `eslint.config.ts`: V7b.
  Deliberate `| null`: `WateringInfo` in `useWateringCalendarReminder.ts` mirrors the generated query type (the plant comes straight from GraphQL); it is read with `?? undefined` on the first line.
  Deferred, owner V7b: `User.avatarUrl`, `setPlantnetKey` and job-model nulls (ai/auth slices), exit: `grep -rn '\bnull\b' front/domain/{ai,auth}` only returns GraphQL-boundary lines (commented); moving the `plant.today|watering|calendar|care|journal` message blocks from `domain/plant/translation` into each slice's `translation/` folder (same keys, no behaviour change), exit: each slice owns its blocks and the scanner globs all slices.
  Deletion candidates: none.
- 2026-11-25 — V7 split into V7a and V7b (5.9k lines, too big for one PR). V7a merged (PR #19, squash 88e24a6): 2 review rounds, 14 findings (safeAppPath //host, exact Paris-day assertions, Calendar tests, mutation proof of the zone fix). Local: lint, typecheck, vitest 59 files / 281 tests, build OK. Next: V7b (owners and exit conditions in the V7a entry).
- 2026-11-25 — V7b (front `domain/ai`, `auth`, `bugReport`, `improvementRequest`, `legal`; branch `refactor/socle-v7b`). V7 is now split in three: V7a merged, V7b (this one: slices, nulls, ESLint), V7c (flag, translation moves, e2e), stacked after V7b merges.
  Turned on: internal absence is `undefined` in the five slices (`AuthUser` maps `me`/`avatarUrl` at the boundary; `null` is only sent to the API, commented: plantnet key removal; the one `!== null` left is the object type guard in legal `Document.vue`); no dynamic i18n key (`useActivateContent` returns literal-`t()` functions, legal `Document.vue` uses a literal map per document); the scanner now covers these five slices and accepts a namespace read (`tm('legal')`); the ESLint domain exemption block is deleted (every domain slice lints under the strict rules); fr copy moved to tutoiement in the five slices.
  New announced states (each test fails without its role): auth dialog resend failure (new message `auth.dialog.resendError`), verify-email and reset-password status/alert, pair page lookup error with retry button, approve/deny alert, worker token revoke failure alert, plantnet key saved status and error alert, bug report and improvement dialogs (status on success, alert on failure), both admin inboxes: load error alert with retry, loading skeleton with status text, alert when a moderation action failed. Persistent `role="status"` regions are always in the DOM.
  Bugs fixed: resending the verification mail reported success even when the call failed (`useAuthForm.resend`); moderation clicks in both admin inboxes failed silently; `useWorkerStatusRefresh` listeners and timers are now owned by the caller's scope (vueuse `useEventListener`/`useTimeoutFn`/`useIntervalFn`, stopped with the scope); admin dates are rendered in Europe/Paris; `usePairing` refuses a repeated `?code=` parameter instead of joining the values.
  Note: vueuse 10's `useEventListener` registers in a post-flush watcher, so tests `await nextTick()` before stopping a scope.
  Deferred to V7c, owner V7c: (1) `exactOptionalPropertyTypes` on for the front package. Known errors with it on: plant production usePlantIdentification.ts 2, Header.vue 1, List.vue 1, usePlantCollection.ts 2, Form.vue 2, FormDialog.vue 1, mes-plantes.vue 3; plant tests SafetyPreview.test 2, Card.test 1, usePlantsCache.test 1; watering Fields.vue 2, Calendar.vue 1 (Nuxt UI modelValue takes null, not undefined); auth Dialog.vue 1; generated .nuxt/gql/default.ts 16; eslint config 1. Exit: `nuxt typecheck` green with the flag on, generated types handled by a justified approach (not a blanket skipLibCheck). (2) Moving the `plant.today|watering|calendar|care|journal` message blocks into each slice's `translation/`. Exit: each slice owns its blocks and the scanner globs every slice. (3) `ci-e2e.yml` with Linux baselines, or an explained deferral to V9 if it would require updating baselines (a baseline is never updated to make a run pass).
  Deletion candidates: none.

### V7b review round

- V7c is the last owner of `exactOptionalPropertyTypes` and of `ci-e2e.yml`: no further deferral. Errors measured with the flag on in V7b slices: `auth/Dialog.vue` (hint `undefined` on a Nuxt UI prop), `bugReport/Dialog.vue` (`imageKey`), plus the `plant`, `watering` and ESLint config ones listed above.
- `legal` stays in vouvoiement on purpose (a legal text); the other slices use "tu".
- Added tests: composable state (`useAuthForm`, `useWorkerTokens`, `usePairing`, both admin composables), the two feedback Dialogs. `resendFailed` is now cleared by `reset`/`setView`.
- `domain/site` added to the translation scanner globs.
- 2026-11-25 — V7b merged (PR #20, 1645983): 3 review rounds (11 findings, then 1 minor + 1 nit). Local: lint, typecheck, build, vitest 78/345 green. The branch commits carried a `Co-Authored-By` trailer despite the brief; the squash commit has none. Checklist gap found by the maintainer (no `void` on promises, retry jitter, interceptors, format pipes): checklist updated, lot V10 applies it repo-wide after V7c. Next: V7c.
- 2026-11-25 — V7c (front package-wide; branch `refactor/socle-v7c`). Last owner of every V7 deferral.
  Turned on: `exactOptionalPropertyTypes` in `front/nuxt.config.ts` (`typescript.tsConfig.compilerOptions`), `nuxt typecheck` green, no `skipLibCheck` change, no `as`. Fixes: own component props and models that receive a possibly absent value now say `| undefined` (`SafetyPreview`, `Card`, `Filters` genus, `FormDialog`/`DeleteDialog` plant, `ImageField`, `Form` plant, `PollResult`); Nuxt UI props that refuse `undefined` get the prop left out instead (`UAvatar` src in `Header`, `UFormField` hint `''` in auth `Dialog`, the two number `UInput` in watering `Fields` through `daysProps`/`toDays`, `USelectMenu` through a `null`-mapping computed in `Calendar`); `usePlantsCache.test` item uses `null`; `eslint.config.ts` drops the absent keys the vue-i18n plugin types as `files?: undefined`.
  Generated GraphQL SDK (`.nuxt/gql/default.ts`, 16 + the plant/bugReport input errors): handled in `infrastructure/graphql/nuxt.config.ts`: codegen's `maybeValue: 'T | null | undefined'` (an absent input is an absent key; also feeds `InputMaybe`), plus an `app:templates` hook (`omitAbsentVariables.ts`, unit-tested) so `variables` is forwarded only when defined (graphql-request refuses a possibly undefined `variables`; same request on the wire). The hook throws if the generated text no longer contains the expected pattern, so a module upgrade fails the build instead of skipping silently; drop it once the nuxt-graphql-client SDK template is graphql-request-safe.
  Behaviour note: clearing a watering interval field now reports `undefined` (it used to leave `''` in a number model, sent to the API as an invalid Int); covered by `Fields.test.ts`. Tracking collapses only if both intervals end up empty, as before.
  Translations: the `plant.today|watering|calendar` blocks moved to `domain/watering/translation`, `plant.care` to `plantCare`, `plant.journal` to `plantJournal` (same keys, fr and en, no behaviour change). `translation.test.ts` now checks fr/en parity for every translation folder, and the scanner globs every slice under `domain/` (including `site`), so a new slice is covered without editing the list.
  `ci-e2e.yml`: decision, NOT landed, moved to V9. Reason: the only Playwright suite is the visual one (`plant list page`, 6 baselines, all `*-win32.png`); a Linux run has no baseline, and creating `*-linux.png` can only be done by a Linux render that nobody has looked at, which is a baseline made to make a run pass. Landing it here would also need CI iterations to settle fonts and `maxDiffPixelRatio`. There is no `*.e2e.test.ts` in the front. Exit condition for V9: a `workflow_dispatch` job renders the 6 images on Linux with `--update-snapshots` as an artifact (win32 files untouched), the maintainer reviews them, they are committed as `*-linux.png`, then `ci-e2e.yml` runs `pnpm test:visual` on the front paths. `ci-front.yml` comment now names V9.
  Deletion candidates: none.
- 2026-11-25 — V7c merged (PR #21, c955bbc): 2 review rounds (1 major: codegen `maybeValue` instead of a text rewrite; 3 minor; 2 nits). Local: lint, typecheck, build, vitest 80 files / 350 tests green. All front deferrals closed except `ci-e2e.yml`, now owned by V9. Next: M8 (menu), then V10.
- 2026-11-25 — The maintainer asked to go faster: from now on one implementer per repo runs in parallel (menu and verdure have separate worktrees and branches), still one lot at a time per repo. V10 started alongside menu M8.
- 2026-11-25 — V10 (transverse, back + front; branch `refactor/socle-v10`).
  Turned on: `@typescript-eslint/no-floating-promises` with `ignoreVoid: false` in back and front; every `void promise` is now awaited or ends in a `.catch()` that logs (back, Nest Logger) or reports through `useErrorReporting` (front) with a context string.
  One retry helper per package (back `infrastructure/http/retry.ts`, front `infrastructure/api/utils/backoff.ts`): exponential backoff, full jitter, max attempts, delay cap, `Retry-After`. Used by GBIF search and the Google userinfo read (back), by ofetch reads (408/429/502/503/504) and by `usePolling` (front). Not used, on purpose: the Google code exchange (single-use code), PlantNet identify (quota), `AiService.embed` (not idempotent from the worker's view).
  Back interceptors: response log (method, route, status, duration, no token/cookie/body/query), global timeout with `@SkipTimeout()` on uploads, PlantNet identify, the AI worker long poll and the job request controller; the exception filter logs a GraphQL failure once.
  Front interceptors: 401 / UNAUTHENTICATED clears the `auth-me` data and goes home with a same-origin `?redirect=` (verdure signs in through a dialog, not a page), then `useSignInRedirect` returns to it; unexpected errors reported once (WeakSet); no component or composable handled API errors on its own, so nothing was removed there.
  Format pipes with e2e tests: `calendarFeed` token, `file-storage` image key (UUID), auth `plantnetKey` argument.
  Global timeout: checked every GraphQL mutation, none calls an external service or runs long in the request (mail, push and embedding run in background tasks), so none carries `@SkipTimeout()`; the handler is not cancelled on a 408. The GraphQL client hands over no error object, so an aborted call cannot be told from one with no answer (unlike the REST interceptor).
  Deferred to V9 (final pass, owner), exit condition: `useErrorReporting` forwards to an error tracker (Sentry) and the single `console.error` line is replaced. The back retry helper and the front backoff are two copies (no shared package between back and front); exit: V9 either merges them into a shared workspace package or records why two copies stay.
  Deletion candidates: none.
- 2026-11-25 — V11 (performance; branch `refactor/socle-v11`, PR #23).
  Home page plants, failing first: `back/domain/plant/list/performance.e2e.test.ts` seeds 40 other accounts (1.6M waterings). At that volume latency alone was still green (125 ms, under its budget): the latency budget was NOT the red proof. The red proof is the rows-read guard: run 45636574115 failed with 1 651 280 tuples read for one call against a limit of 18 000 (the guard counts tuples, not milliseconds). Cause: `latest_watering` grouped the waterings of ALL accounts on every plant read. Fix: filter by `user_id` before `group by`. Median `plantsDue` 125.2 to 5.1 ms, `plants` 123.8 to 3.8 ms; about 1 800 tuples per call (30 pages measured 28, limit 60).
  Back guards (the timing tests of `performance.e2e.test.ts` are guards against a later regression, not proof of the fix: the proof is the rows-read run above, red then green): one median-of-11 e2e per operation with the UX budget, EXPLAIN index assertion and cross-account `lastWateredOn` test per `latest.query` caller, N+1 SQL-count guard and `pg_stat_statements`.
  Load (`devops/load`, `.github/workflows/load.yml`): k6 on every operation (72, coverage test), profiles smoke, load, spike (2x, justified), stress, soak, breakpoint. Think time follows arrival-rate arithmetic: peak 10 people, one visit per 5 s = 2 visits/s = 22 requests/s. Breakpoint about 24 visits/s (266 requests/s, 121 people at once), margin x12; stress at 80 visits/s: p95 `plants` 14 066 ms. Budgets never loosened.
  Front: warm navigation to the plants median 1298 to 423 ms, cold 816 ms. Lighthouse CI job (blocking, budgets LCP 2.5 s, CLS 0.1, TBT 200 ms unchanged; median of 5 runs per page). LCP 1.4-1.7 s passes. Causes fixed: 21 modulepreloads removed, entry script deferred to after load, forced synchronous layout in Reveal removed (IntersectionObserver only), dialogs mounted on first open, decoration mounted in separate idle tasks, legal pages not hydrated, assets pre-compressed, legal sections with `content-visibility: auto`. Tried and reverted: splitting the `ui` chunk (TBT 600), lazy footer (TBT worse), `@source not` and `componentDetection` (no effect), a build without the `ui` chunk (no gain in a CPU profile at x4).
  Lighthouse measures production-like answers: the job starts the API on port 3000 (where the front looks on localhost) with its seeded database, and audits two passes, same budgets: the public pages (/en, /conditions) and the signed-in account (`lighthouserc.signedin.cjs`: session cookie of the seeded account load1, which owns 20 plants with photos; the home page and one plant page). Not the cause: the failed `auth-me` call of an API that is down (measured with Playwright at CPU x4, API refused versus answering: same long tasks; the CPU profile puts `reportError` at 2-4 ms). A guard for that path was tried (a differential long-task test) and removed: with a 100 ms busy loop added in `reportError` (confirmed present in the bundle and executed) it stayed green, because the hydration tasks of about 600 ms swamp the difference; a test that cannot be shown red is not kept; the icons (107 lucide icons, 32.7 KB, already the scanned set); i18n (one file per locale); the startup plugins. The late task at about 3 s that every page shows is native style, layout and paint after hydration of the whole app; the largest chunk (514 550 bytes, reka-ui and Nuxt UI) is hydration cost.
  Real cause of the red TBT, measured: the result follows the speed of the GitHub runner, not the code. The job prints a CPU benchmark index per run (Lighthouse `benchmarkIndex`). Same head ee417d7, 6 runs (5 dispatched side by side + the pull request run), median TBT in ms per page (public /en, public /conditions, signed-in /en, plant page) with the benchmark index:
    - bench 4000 (2 runs): 190, 180, 190, 120 and 200, 200, 180, 130 (green);
    - bench 3400: 200, 220, 200, 160 (/conditions red);
    - bench 2950: 210, 210, 220, 190 (red by 10-20 ms);
    - bench 2400 (2 runs): 370, 350, 330, 450 and 380, 350, 350, 340 (red).
    The runner pool is about 1.7x apart, TBT is 1.9x apart: the budget of 200 ms passes only on the fast machines and the pages sit on it there. The budget is unchanged; what remains is to halve the hydration work (the whole app hydrates), which this lot did not achieve. Signed-in pages: LCP passes (1.5 s); the plant page also fails CLS (median 0.14-0.40), the skeleton that precedes the plant is not the height of the content.
  Images: card, journal and today thumbnails are `loading="lazy"` with `decoding="async"`; uploads are downscaled to 1280 px and WebP when the browser encodes it, so AVIF is not a further gain worth a server transcoder here.
  Deferred, owner V9: only the Vitest bench (needs a stable machine, noisy on shared runners; the median-of-11 e2e per operation already guards the same budgets).
- 2026-11-25 — V8 (`ai/` worker and api, Python; branch `refactor/socle-v8`).
  Turned on: tests for the worker, the api and the api's latency (`ai/tests`, `ai/perf/test_api_overhead.py` against a fake ComfyUI, CPU only), run by the new `ci-ai.yml` (pytest + `docker build` of api and worker); live-GPU latency budgets that fail (identify median < 5 s and slowest < 10 s, embed median < 1 s, from the UX rules of the performance lot; the live tests still skip when no stack is up).
  Fixed: a failed report to the back killed the worker loop (reports now retry transient errors with backoff + full jitter, then log; a job that raises no longer stops the loop); the api slept 1 s before its first history poll (now 100 ms, 700 ms saved per job); bad Content-Length / non-object body / non-base64 image answered 500 or dropped the connection (now 400); failures swallowed in the api are logged.
  Docker: pinned `python:3.12.13-slim-bookworm`, non-root user, api `HEALTHCHECK` and worker `depends_on: service_healthy`, `restart: unless-stopped`, port through `${BIND_ADDRESS:-127.0.0.1}`, `.dockerignore`. The `api` image no longer runs as root, so on-demand mode (`COMFY_CONTAINER`, Docker socket) needs `group_add` in compose (not used by any compose file here).
  Contract: `SubmitEmbeddingInput` refuses `[]` (`@ArrayNotEmpty`, e2e test proven red on a throwaway branch), the item deferred by V2. Review round 1: body size cap (413) and negative length (400), queue read once a second, transport-only retry honouring Retry-After, crashed job reported failed, token fsync.
  Deferred (owner, exit condition):
  - `ai/comfyui/Dockerfile` (root user, unpinned `git clone` of ComfyUI and custom nodes, unpinned CUDA wheels): owner V9; exit: built with Docker + GPU using pinned tags/commits and a non-root user, models volume ownership checked. Not verifiable here without Docker.
  - A `processing` job whose result never arrives (worker killed, back unreachable after retries) stays `processing` (back, not V8 scope; the worker now reports a crashed job failed): owner V9; exit: a sweep or `updated_at` timeout fails stale jobs, with a test.
  - `ai/native/tray.py` (Windows tray UI) not audited: owner V9; exit: read against the checklist (timeouts, swallowed errors, token handling) or recorded as out of scope with the reason.
  - Live-GPU latency tests (`ai/perf/test_identify_perf.py`) skip when no stack is up, so CI never runs them: owner the maintainer; exit: `pytest ai/perf` with the stack warmed before each release, result noted in the release PR (no self-hosted runner).
  - Api CORS `*` and the `0.0.0.0` bind inside the container stay: the local app calls the api from the browser and the container needs the wildcard bind; host exposure is governed by `BIND_ADDRESS` (default 127.0.0.1). Owner V9; exit: only if the api is ever exposed beyond localhost, replace `*` by an allowlist.
  - Worker bundle tgz (`worker-bundle/build.ps1`) is generated and untracked: maintainer action at release (rebuild so the shipped bundle carries the new api and worker); owner the maintainer.
  - Base images pinned by patch tag, not digest (optional): exit: add `@sha256:` pins if a Dependabot/Renovate setup is added.
  Deletion candidates: none.
  - V11 round 3 (calibration, plant page, real sign-in). CPU throttling is calibrated on the host: `front/lighthouse-calibrate.cjs` takes the median `environment.benchmarkIndex` of 3 calibration runs and sets `cpuSlowdownMultiplier = benchmarkIndex / 437.5`, 437.5 = 1750 / 4 (Lighthouse `docs/throttling.md`, "Benchmarking CPU Power" and "Calibrating the CPU slowdown": the default 4x moves a high-end desktop, benchmarkIndex 1500-2000, midpoint 1750, to a mid-tier mobile, Moto G4, benchmarkIndex 125-800). Every runner then emulates the same mid-tier mobile; the budget stays 200 ms. Measured on aef3ce8 (6 runs, public /en, /conditions, signed-in /en and plant, median TBT in ms; benchmarkIndex -> multiplier): 2425 -> 5.5: 607/623/612/650; 2940 -> 6.7: 486/523/464/504; 2956 -> 6.8: 448/416/470/465; 2915 -> 6.7: 468/421/484/517; 2420 -> 5.5: 619/553/557/611; 2344 -> 5.4: 499/512/505/518. All red: on a mid-tier mobile the home page blocks the main thread for 450-650 ms, so the code fix is to reduce hydration cost, not to loosen the budget.
  - Plant page: the signed-in pass never was signed in (an `extraHeaders` cookie left the pages on the "Your garden is private" view, so its CLS 0.14-0.40 was the footer jumping when the skeleton gave way to the short sign-in prompt, and its TBT was that of a signed-out page). Now `lighthouse-signin.cjs` (lhci `puppeteerScript`) checks that the API accepts the token and stores the cookie. The skeleton (`DetailSkeleton.vue`) now reserves the final boxes (photo, 36/40 px title, 28 px species, 28 px headings with gap-6, min-height on the care rows and the schedules), the photo has width/height, and the page shows the skeleton while the first fetch is `idle`. `plant.perf.test.ts` asserts CLS < 0.1 on staggered answers. Signed in, at 9.2x (benchmarkIndex 4028): CLS passes, public TBT 631/605, signed-in /en TBT 771, plant page TBT 3040 ms and LCP 10.1 s (real, to reduce).

##### V11 round 4, step 1: plant page (medians of 5 on the calibrated runner, bench about 2400, 5.6x)

- Diagnosis from the lhr of run 45700064509 (plant page, signed in): the LCP element was the header "EN" button, not the photo (photo `img` already loaded at 0.4 s, so no `lcp-lazy-loaded` issue); LCP 1.2-1.5 s, only one run in five hit 6-10 s. TBT came from script evaluation after the data arrived: the page fetched `wateringEvents` for the whole collection (804 KB of JSON, then filtered one plant client-side) and mounted seven sections with their own queries.
- Step 1a (commit "scope the plant page's watering events to the plant"): `wateringEvents(plantId)` optional argument (back, schema, e2e test), the plant page's calendar has its own cache key, hero photo `fetchpriority="high"`. Payload 804 KB to 5 KB. Plant TBT median 3040 ms (9.2x) / 2700 ms (5.6x, run 45701742925) before the next step.
- Step 1b (commit "mount the sections below the fold only when they near the viewport"): new `UiAnimationDefer` renders diagnosis, journal, history and calendar (and their queries) only when within 300 px of the viewport. Run 45703409354: plant TBT 3100 / 1080 / 1230 / 1070 / 1150 ms, median 1150 ms (from 2700 ms), LCP 1.5 s, CLS unchanged (the deferred blocks are below the fold).
- Floor: the public `/conditions` (static content, no query) still measures TBT 560-640 ms at 5.6x. Its real main-thread tasks total about 200 ms (largest 76 ms, then 36, 26, 21), so one 9 ms real task already costs 50 ms simulated. The Nuxt/Vue/i18n boot is the floor of every page; the 200 ms budget at this reference needs the shared shell to shrink first (step 3), before the plant page's remaining 550 ms above that floor can matter.

##### V11 round 4, step 3 analysis: the shell floor of /conditions (local CPU profile, no throttling)

- Method: production build served on port 3796, Chromium via CDP `Profiler` at 412x823, `/conditions` loaded then 2.5 s idle (script in the session scratchpad, not committed). Non-idle main-thread time is about 200 ms; by script: Vue runtime chunk 91 ms, UI chunk (reka-ui, Nuxt UI, embedded icons; 514 KB) 58 ms, i18n chunk 33 ms, page and plugins under 20 ms. The self-time per function is flat (largest single function 7-11 ms), so there is no hotspot to remove: it is module evaluation and hydration of the whole app.
- At 5.6x, 200 ms of real main-thread time is about 1,100 ms simulated before the 50 ms-per-task discount; the measured TBT of 560-640 ms is that. Halving the JS would still leave about 300 ms; the 200 ms budget on this reference is only reachable by shipping no script on a page (e.g. a `noScripts` route rule for the static legal pages), which also disables the header menu and sign-in button there. That is a product decision, left to the maintainer; the budget and the reference are unchanged.

### V11 round 4, step 3 experiments (local proxy: simulated TBT at 2.8x, median of 9, /conditions)

- Baseline 308-359 ms (noise about 50 ms between identical runs).
- Font CSS variants (no size-adjusted fallback faces 347, no `local()` sources 315): inside the noise, not kept.
- `LazyPlantHeader hydrate-on-idle` plus `LazyPlantFooter hydrate-on-visible`: 364-396 ms, no gain, reverted.
- First task is Layout/UpdateLayoutTree of about 60 ms before any script (body hidden: 0 layout), so the floor is the rendered DOM and CSS, not hydration.

### V11 round 5 (icons as inline SVG, runner profile)

- `icon.mode: 'svg'` (commit "render icons as inline SVG"): the default css mode scanned every cssRule on the first icon (about 20 ms real). Runner profile: the hydration microtask went from 80-107 ms to 57-63 ms. Lighthouse TBT medians of 5 (CI run 45715818405): /conditions 470 ms (was 540-600), /en 530-720 ms, plant page 830 ms (was 940-1150). Kept. All four pages still above the 200 ms budget.
- Removing the `ui` manualChunk: worse (sim 477 vs 308-359 baseline, 92 chunks). Reverted. Nuxt UI theme restricted to used components was already tried (c5f867a, reverted in e73ae56).
- Remaining sources on the runner at 1x for /conditions: first Layout/UpdateLayoutTree about 25 ms, entry module evaluation about 11 ms, plugin phase task about 26 ms, `__asyncHydrate` about 57-63 ms (useAuth queries, Header with UButton/ULink, router and i18n plugins), final layout about 16 ms. Entry CSS is 218 KB, of which 176 KB is utilities (mostly the Nuxt UI theme classes) and 18 KB is 48 font-face rules.

### V11 round 6 (fonts, chunks, deferred work) — CI Lighthouse TBT, median of 5

The runner speed varies from run to run (benchmarkIndex 2500-3100, cpuSlowdown 5.7-6.8), so differences under about 15 % are noise.

| Commit | /en | /conditions | /en signed-in | plant page | Decision |
|---|---|---|---|---|---|
| SVG icons (45715818405) | 530-720 | 470 | n/a | 830 | kept |
| latin font subset only, 48 to 24 @font-face (45718586734) | 510 | 480 | 650 | 1380 | kept (entry CSS 218 to 208 KB), no measurable TBT effect |
| session queries when idle (same run) | | | | | reverted: no change in the 57 ms hydration task |
| narrower `ui` chunk (reka-ui and Nuxt UI no longer forced into one chunk, 45719748899) | 480 | 450 | 660 | 1140 | kept, small gain on /conditions |
| header hydrate-on-idle + footer hydrate-on-visible (45720810026) | 510 | 440 | 670 | 1560 | reverted: no gain, plant worse |
| both reverts (45721863084) | 570 | 500 | 670 | 1030 | head |

The hydration microtask is still one task of about 57 ms real (about 350 ms at the calibrated slowdown, of which about 300 ms counts as blocking). Lazily hydrating the header did not shorten it, so the cost is spread over many small components and the plugin phase rather than a few heavy ones.

### V11 state for the maintainer (Lighthouse stays blocking, budgets unchanged)

CI Lighthouse TBT, median of 5, last runs (cpuSlowdown calibrated on benchmarkIndex, 5.1-6.8 depending on the runner):

| Page | TBT | Budget |
|---|---|---|
| /en (public) | 510-580 ms | 200 ms |
| /conditions | 460-520 ms | 200 ms |
| /en signed in (20 plants) | 600-670 ms | 200 ms |
| plant page signed in | 980-1050 ms (one run in five about 1.6 s) | 200 ms |

CLS and LCP are within budget (LCP 1.2-2.0 s). Earlier work in this lot: plant payload 804 KB to 5 KB, the plant page 2700 to about 1000 ms.

Shell floor: `/conditions` renders its text with `hydrate-never`, so no page content is hydrated, and it still measures 460-520 ms. The cost is the shell, one hydration task of about 57 ms real (about 350 ms at the calibrated slowdown; about 300 ms of it counts as blocking): UApp, router, i18n and color-mode plugins, header, footer. Measured and reverted for no gain: session queries on idle, header hydrate-on-idle and footer hydrate-on-visible, Nuxt UI theme limited to used components. Kept: SVG icons, latin font subset, narrower `ui` chunk, first-row photos eager.

Plant page long tasks (run 45723341771, first run, cpuSlowdown 5.1): entry chunk 717 ms at 3.5 s (the post-auth render of hero, bio, care sheet and care section in one task), unattributable 436 ms at 4.2 s, 209, 187, 152 and 99 ms. They come from the post-auth client render of the page body. Deferring the bio and care groups behind `UiAnimationDefer` was not done: they sit near the top of the page, so a 12 rem placeholder would risk CLS.

Options for the maintainer, described neutrally:
1. `noScripts` on the legal pages: those pages would ship no JavaScript, so their TBT would be near 0; they would lose client-side navigation, the theme toggle and the header menu on those pages.
2. A hosting change from static prerender to server rendering for the authenticated pages: the signed-in pages could then arrive rendered and their body would not need client rendering after the auth query; it needs a Node host for the front and session forwarding to the API.
3. A reference or budget change: change the CPU calibration reference or the TBT budget for the Lighthouse job, which would make the job pass with the code as it is.

### V11 round 7 (maintainer decision: no hosting change, budgets unchanged)

Decision received: the front stays a static prerendered site; budgets stay (TBT 200 ms, LCP 2.5 s, CLS 0.1). Runner speed moved between runs (cpuSlowdown 5.1, 5.6, 7.8), so a run is compared with the public `/en` of the same run.

| Step | Commit | CI result |
|---|---|---|
| Legal pages ship no hydration script (`routeRules` `noScripts` on the six legal paths) | 6c65f43 | `/conditions` TBT 480 to 0 ms in 5 of 5 runs (run 45767894352); the served HTML has no module script, no modulepreload, only the 1 KB inline color-mode script; text unchanged. Header menu and theme toggle do nothing on those pages; links are full page loads. `/en` 570-610, signed-in `/en` 680-780 and plant page 1270 at cpuSlowdown 7.8 |
| Plant list renders 6 cards at once, the rest in idle periods | a35bc2b, reverted f9095ad | no gain: signed-in `/en` 810-930 ms against 640-730 for public `/en` in the same run (before: +120 ms over public, now +190); idle callbacks fire at their timeout while the page is busy. Reverted |

Items of the list that were already in place or already measured, so no new commit:
- Plant catalogue and translations in the entry chunk: not there. The catalogue comes from the API after the auth query; the entry chunk (205 KB) is Vue, router, Nuxt and reka-ui code. The profile of round 5 lists no data module.
- i18n: `@nuxtjs/i18n` already loads one file per locale (`/_i18n/<hash>/<locale>/messages.json`, 26 KB, fetched at runtime), messages are compiled at build.
- Only the Nuxt UI components in use: `ui.experimental.componentDetection` is on (367c1db) and `@source not` was tried (no effect, round 4).
- Below-the-fold hydration: legal text `hydrate-never`, plant page heavy sections behind `UiAnimationDefer`, header menu and dialogs mounted on first use; lazy header and footer hydration tried and reverted (round 6).
- Non-critical plugins: there is no monitoring or analytics plugin in the front; the client plugins left (worker status, session expiry, GraphQL credentials and errors, dynamic host) are the 26 ms plugin phase and cannot be removed; the idle `useAuth` queries were tried and reverted (round 6).

What remains red, with the measured cause per page (budget 200 ms):
- `/en` public (570-730 ms depending on the runner): the shell, one hydration task of about 57 ms real (UApp, router, i18n and color-mode plugins, header, footer), 350 ms at the calibrated slowdown; the floor measured on `/conditions` before noScripts was 460-520 ms.
- `/en` signed in (650-930 ms): shell plus the client render of 20 cards after the auth query (about +120 ms over public `/en`).
- plant page (980-1500 ms): shell plus the client render of its body after the auth query: one 700 ms task, one 430 ms, then 209, 187, 152 ms (run 45723341771).
The job stays blocking and red for those three pages. No `continue-on-error`, no budget change.

### V11 round 8 (plant idle sections, signed-in cards, shell breakdown)

- Plant page: bio and care sections each render in an idle turn of their own, space reserved (`UiAnimationIdle`, hero stays synchronous). Run 45771667708 (x6.7): TBT 900-1010 ms against 900-1160 ms at x6.2 before, about 25% less once the slowdown is normalised; the 790 ms entry-chunk task is gone; CLS 0.000. Still red: remaining tasks 414 (unattributable), 273, 180, 164, 149 ms.
- Signed-in /en, 20 cards: first row at once, each later card in an idle turn of its own, space reserved (run 45772932480, x8.1: public 560-630, signed-in 650-710, plant 760-980). Run 45773854109 ran at x9.1 and is not comparable in absolute terms (public 600-680, signed-in 830-1000, plant 1100-1370). No clear gain from idle batching on this page, either by rows or by cards: the cost sits in the shell, not the cards. Still red.
- Public /en shell, per script (run 45770244964, x6.2): Script Evaluation 1168 ms, Other 853, Style and Layout 133, GC 50, Parse HTML and CSS 49, Script Parsing and Compilation 11. Top three: (1) unattributable scripting 817 ms (async hydration microtask plus plugin phase), (2) the `/en` document with its inline scripts (424 ms, 115 scripting) and the "Other" category, (3) entry chunk CBOl8CPh.js (160 ms, 141 scripting). Parse and compile is only 11 ms, so nothing evaluates at import time: no import-time module, icon set, locale data or eager plugin left to remove. Still red.
- /conditions: TBT 0 ms in 5 of 5 runs (noScripts).
- front-timings: the warm navigation test failed (1105-1244 ms against 1000) because it started from /confidentialite, which now ships no script, so the click became a full page load. It now starts from /mes-plantes: run 45773854109 warm median 431 ms, cold 1129 ms. Budget and test thresholds unchanged.
- Runner CPU calibration varies between runs (x5.1 to x9.1), so compare pages inside the same run only.

### V11 round 9: fixed CPU slowdown x4 (maintainer approval 2026-11-26, PageSpeed Insights reference)

Lighthouse uses `cpuSlowdownMultiplier: 4` fixed (a fixed x4 is the maintainer's agreement of 2026-11-26, not a CI choice), as PageSpeed Insights does, instead of the multiplier calibrated on benchmarkIndex (x5 to x9 depending on the runner). `lighthouse-calibrate.cjs` and its CI step are removed. TBT 200 ms, LCP 2.5 s and CLS 0.1 budgets are unchanged. Results at x4 are recorded below once CI has run.

Results at x4 (run 45778454024, budgets TBT 200 ms, LCP 2.5 s, CLS 0.1; median of 5, range; CLS assertions pass):
- Public /en: TBT 250 ms (220-260, plus one cold first run at 2470 ms with benchmarkIndex 594, outside the median), LCP 1.7 s (1.4-1.7). Red by 50 ms.
- /conditions: TBT 0 ms (0-0), LCP 1.5 s. Green.
- Signed-in /en: TBT 270 ms (260-360), LCP 1.5 s (1.2-1.5). Red by 70 ms.
- Plant page: TBT 340 ms (290-370, plus one run at 1320 ms), LCP 1.5 s (1.2-1.5). Red by 140 ms.
The CPU benchmark is now about 2950 on every run, so runs are comparable. The first run of each job can be an outlier (cold runner); the median ignores it.

### V11 round 10 (x4): parallel plant queries, resized photos, CPU profile of the plant page

- Plant collection (`/mes-plantes`): plants and facets are requested on mount, in parallel with `me`, instead of after its answer (test: both requests are out while the user is still unknown; a signed-out refusal is swallowed). Gain: one API round trip before the cards.
- Photos: `GET /images/:key?w=480|960|1280` serves a WebP copy made on first request and stored beside the original under a derived key (no migration, lazy backfill, the process stays stateless; `remove` deletes the variants too). Card, plant hero and today band use `srcset`. Test: card copy of a 3000x2000 JPEG is at most 60 KB and under a tenth of the original size.
- CPU profile of the plant page at x4 (local sampling profiler, mocked API): `useParisDay` was the top function with 195 ms self time, because every card and badge built a new `Intl.DateTimeFormat`. One shared formatter now.
- Result, run 45783922729 (runner benchmarkIndex about 3500, faster than the 2950 of run 45778454024, so not comparable in absolute terms; run 45780636085 on a 2430 runner measured /en 370-410, signed-in 450, plant 570-670): /en TBT 200 ms (190-210), signed-in /en 200 ms (200-210), plant page 250 ms (180-340), /conditions 0, LCP 1.4-1.5 s everywhere.

### V11 round 11: hardening of the image variants, measurement notes

- Variants on a shared host: sharp opens the input with `limitInputPixels` 40 MP and `sequentialRead`; one decode and resize at a time (serial queue); concurrent first requests for the same key and width share one in-flight promise; a refused or failing picture falls back to the original. The variant is reachable only through the original's key (derived UUID, no listing), so access is that of the original. Tests: shared promise (3 concurrent reads, 2 storage reads), peak concurrency 1 over 3 resizes, 8000x6000 picture over the limit serves the original.
- sharp 0.35.3 prebuilt `@img/sharp-linux-x64` (glibc) declares `engines.node >=20.9.0`; production image is `node:24.22.3-slim` (Debian, glibc), so the glibc binary matches (musl is not used). CI uses Node 24.
- Parallel queries gain: front-timings measures `/` (today band, `plants-due`, already requested in parallel), so it cannot see the `/mes-plantes` change; the gain is one API round trip (`me` latency) before the cards, asserted by the unit test on request order, not by a timing test.
- TBT on slow runners (benchmarkIndex about 2400): no new cut in this round. A cut needs a CPU profile, which needs a local build, forbidden during the RAM quiet period; no cut without a measured profile.
- Production correction: the host is CloudLinux 8 (glibc 2.28) with Passenger and Node 24.18.1, deps installed by `devops/deploy/deploy.sh`. `@img/sharp-libvips-linux-x64` 1.3.2 requires glibc >= 2.28 (met, SSE4.2 needed); lockfile has the glibc optional entries, pnpm selects them by os/cpu/libc. sharp now loads lazily (`infrastructure/image-processing/sharp.ts`) and falls back to the original image with one warning (also for plant identification).
- TBT cuts measured with a CPU profile at x4 (unminified sourcemapped build, mocked API, taken under the machine lock): (1) `useParisDay` computes the Paris offset by arithmetic instead of constructing an `Intl.DateTimeFormat` with a time zone: `getParisFormatter` 226-232 ms self on the plant page, absent after (an Intl oracle test covers the DST changes 2024-2032); (2) `icon.collections: ['lucide']`: `useResolvedName` about 143 ms inclusive on `/en` (per-icon scan of 220 collections), 1 ms after. Left: `initTailwindMerge` 68 ms, i18n messages compile (`translate` about 145 ms incl on the plant page), generic hydration; no cut tried on them yet. No budget touched.
- Local replay (no GitHub run, maintainer decision), machine lock held 13:18: back lint/typecheck/unit (351) and back e2e on Postgres 5433 (33 files, 285 tests) pass; front lint, typecheck, unit (456) pass. Not replayed: k6 smoke/load and the signed-in Lighthouse (they need an API on port 3000, which a foreign process holds; I do not kill it) and no k6 run at all. Conditions were also under the 2 GB / 25% CPU rule only partly (free RAM 2.3-4.6 GB, CPU 8-34%).
- This machine is 2-2.5x slower than a CI runner (Lighthouse benchmarkIndex about 1400 against 2400-3500), so absolute numbers here are not comparable: Playwright front-timings cold median 2434 ms (budget 2500, pass), warm 1344-2232 ms (budget 1000, fail here; CI run 45773854109 gave 431 ms; SPA navigation confirmed, same test at CPU x1 gives 341 ms); Lighthouse public `/conditions` TBT 0, LCP 1518; `/` TBT 1167, LCP 4149 here, which is not a CI result (the API on 3000 is not the load replica). These numbers do not prove a pass or a regression; a CI-comparable verdict needs a quiet runner-like machine.
- CPU slowdown calibrated on the machine (maintainer decision, replaces the fixed 4 for local runs; budgets unchanged): `slowdown = max(1, 4 * benchmarkIndex / REFERENCE_BENCHMARK_INDEX)`, benchmarkIndex = median of 3 Lighthouse warm-up runs, REFERENCE_BENCHMARK_INDEX = 2950 (middle of the CI runners seen, 2400-3500, rounds 3 and 10-11 of this plan), so x4 on a CI runner and about x1.9 on this PC (about 1400). One helper `front/infrastructure/perf/cpu-slowdown.cjs` (unit tested) feeds Lighthouse (`lighthouse-throttling.cjs`) and Playwright (`index.perf.test.ts`); multiplier and benchmarkIndex are logged in each run and in each Lighthouse report.

### V11 calibrated local measurements (26/11, machine about 2x slower than CI, cpu multiplier x2.1-2.2, benchmarkIndex 1546-1623, 3.4 GB free)
- Lighthouse medians of 5: `/` TBT 369 / LCP 3824 / CLS 0; `/conditions` TBT 0 / LCP 1518 / CLS 0 (pass); signed-in `/en` TBT 371 / LCP 4355 / CLS 0; plant page TBT 416 / LCP 4783 / CLS 0.123.
- LCP diagnosis: observed FCP 0.2-0.9 s, observed load 0.15-0.5 s (paint is not late after load); simulated FCP 1.2-2.3 s then LCP on the h1/span, so the gap comes from the simulated CPU-bound hydration, not from the network.
- Playwright front-timings with `--retries=0`: 3 passed, home cold median 1288 ms, warm median 581 ms, plant page CLS 0.000.
- k6 (API pinned on one core, 512 MB): smoke and load p95 all within budget; p99 crossed on identify_plant (smoke) and on login, register, reset-password, verify-email, identify_plant (load), the scrypt/upload paths on a machine about 2x slower than CI.

### V11 k6 p99 audit (26/11)
- Password hashing is asynchronous (`promisify(crypto.scrypt)` in `back/domain/auth/emailAndPassword/password.service.ts`, no `scryptSync`); `identify_plant` converts the photo with sharp's async `toBuffer()` (640 px max, `back/infrastructure/identification/service.ts`). Nothing blocks the event loop.
- Both run on the libuv thread pool (4 threads) while the replica API is pinned on one core: on a machine about 2x slower than CI the p99 of login, register, reset-password, verify-email and identify_plant crosses its budget (p95 holds). No code bug found; budgets unchanged, to be confirmed on the CI-class runner.

## V11 follow-up (signed-in replay, i18n)

- `i18n.bundle.runtimeOnly + dropMessageCompiler` breaks every page in a prod build (500 "unhandled node type: 0"): reverted, not retried.
- Plant page CLS 0.123 was an artifact of a signed-out replay (skeleton 2731 px replaced by the 722 px sign-in prompt). Truly signed in (build with `GQL_HOST` and back port aligned): CLS 0.001, no reservation needed.
- Local calibrated medians (cpu x2.1-2.2, machine about 2x slower than CI): `/` TBT 819 (benchmark 1560), signed-in `/en` TBT 395 (benchmark 786-963), plant TBT 542 / LCP 1244 / CLS 0.001 (benchmark 845-992). TBT dispersion on identical code: `/` 291 vs 819 ms with a stable benchmarkIndex, so TBT deltas below about 2x are not attributable.
- tailwind-merge idle pre-warm not measured: the dispersion is larger than any expected gain.

## V11 review fixes

- CI pins `VERDURE_CPU_SLOWDOWN=4` in the Lighthouse/perf job (`.github/workflows/load.yml`); the benchmarkIndex calibration stays local only.
- `cpu-slowdown.cjs` throws a clear error when the benchmark (or a hand-set slowdown) is not a finite positive number, instead of exporting NaN; covered by tests.
- Commit messages of the branch carry no assistant trailer (history rewritten).

## V11 signed-in TBT cuts

- Lighthouse CI runs 9 times per page (was 5), assertion still on the median, budget unchanged at 200 ms. Job time 10 min 20 s (limit 25).
- d4c54e2: account-menu entries are translated only when the avatar is reached for (about 10 `t()` calls, the runtime message compiler, 10-15 ms at x2, signed-in only).
- 33e9c00 and the previous commit: the due-plants band mounts 4 cards then 3 per macrotask (`useProgressiveCount`); the watering history builds one `Intl.DateTimeFormat` and mounts 6 rows then 6 per macrotask.
- Finding: the runner is not stable. The same job reports benchmarkIndex about 4000-4400 on one run and about 2400 on the next, so a fixed x4 gives TBT 200-240 ms on a fast runner and 360-560 ms on a slow one (run 45886659252: public `/en` 368, signed-in `/en` 418, plant 560, 9 runs each). Medians of different runs are not comparable; a before/after needs the same benchmarkIndex.
- A tailwind-merge pre-warm plugin was measured locally and dropped: the cost is the per-component merge, not the init.
- Local ABBA (calibrated, 9 runs per side, benchmark 850-930) measured the progressive lists slower (signed-in `/en` 299 to 340 ms, plant 357 to 461 ms): removed in 366ea32, the single date formatter stays.
- CI run 45896494923 (366ea32, benchmarkIndex median about 4300, 9 runs per page, `LH-SUMMARY`): `/en` (public and signed-in, 18 runs) TBT median 160 ms (138-402), plant 166 ms (94-198), `/conditions` 0 ms; budget 200 ms met. Same runner speed class before the cuts (run 45884548275, benchmarkIndex 4000-4400, 5 runs): 217, 217, 276 ms. Only runs with a similar benchmarkIndex (within 10 percent) are compared; the 2400 runner of run 45886659252 gave 368, 418, 560 ms at the same x4.
- CI run 45897999454 (a6e3446, benchmarkIndex median 2965-3007): `/en` 234 ms (18 runs, 178-277), plant 272 ms (222-362), `/conditions` 0 ms. Red at x4 on a slow runner; the same code is green on a fast one.
- Structural profile of the plant page (local, signed-in, rate 4, sourcemaps on): runtime-core 600 ms and reactivity 250 ms of 2244 ms busy, tailwind-merge+tailwind-variants about 100 ms, `useComponentProps` 70 ms, vue-i18n message compiler 31 ms. The profile is diffuse: no single hot spot above 5 percent.
- i18n: translation JSON is already precompiled to AST at build (`{t:0,b:{...}}` in the locale chunk). The 31 ms is the AST to function step on the first `t()` of each key: `@intlify/unplugin-vue-i18n` hardcodes `jit: true`, so only `runtimeOnly` could drop it, and that broke every page (192008991b reverted in f9de00b). No config switch left.
- Cut tried and dropped: `ui.tv.twMerge: false` in `app.config.ts`. Local ABBA (benchmark 1600-2000, 9 runs per side): signed-in `/en` 214 to 210 ms, plant 184 to 165 ms, inside the run-to-run range, and removing the merge risks class conflicts that the visual baselines would have to catch. Not committed.
- 268517e: `UiSkeleton` (plain div, no tv/merge) replaces `USkeleton` everywhere. Local ABBA plant TBT: no measurable gain (head 410, skeleton 420 ms), kept as it removes instances.
- a7a628a: locale head links (hreflang) and og/twitter meta are computed on the server only; title/description stay reactive. Local ABBA plant TBT 410 to 377 ms (-33).
- 0ae8b51: the Google-enabled flag (used only by the sign-in dialog) is fetched on idle instead of at mount. Not measurable alone.
- Combined local ABBA at the same session (plant, 5 runs, x4): base 477 ms, with the three cuts 316 ms (-160). Anonymous and signed-in `/en` are under 200 ms locally on both sides.
- CI run 46038333611 (af429a7, benchmarkIndex median 2771-2782, slow runner): `/en` 304 ms (18 runs, 260-463), plant 337 ms (248-474), `/conditions` 0. Not comparable with a6e3446 (benchmark about 2965, 234/272): the runner is 7 percent slower and TBT is very sensitive to it.
- Profile after the cuts (plant, rate 4): the largest block (about 580 ms) is `Button.vue` 90, `Link.vue` 77, `tv` and tailwind-variants about 160-200 together; the hydration block is `entry.js`, `useCalendarFeed` setup, unhead, vue-i18n.
- Cut tried and dropped: memoising `tv()` definitions per config (patch of `@nuxt/ui` `utils/tv.js`). Local ABBA plant 414 to 490 ms (worse) and the profile block unchanged (577 vs 597 ms): the cost is the per-call class computation, not the definition build. Reverted.
- Not done: replacing `UButton`/`ULink` by styled HTML in Header and DetailHero, chunked list rendering with `shallowRef` (a first chunking was already measured slower, 366ea32).
- Header (burger, account trigger, sign-in) and DetailHero (water button): plain `<button>` with the exact Nuxt UI ghost/neutral/subtle/solid classes, `UIcon` kept for the icons. Local ABBA (4 runs per side, benchmark 4100-4500 on both): plant TBT 486 to 333 ms (-150), `/en` not affected. Visual regression (6 baselines) unchanged, 49 chrome/analysis tests pass.
- Green CI runs, with the runner speed (the budget is not moved): run 46051476530 (e7575f9, benchmarkIndex about 4144-4167) `/en` 160, plant 130, `/conditions` 0; run 46055510630 (40a83d4, benchmarkIndex 4323-4412) `/en` 133, plant 116, `/conditions` 0. Both are fast runners: at benchmarkIndex about 2800 the code before the button cut gave 304/337 ms, so the margin is what the next cuts buy.
- Review fixes: the head tags that depend on the language (canonical, hreflang, `og:url`, `og:locale`) are patched in place on the client when the language or the route changes (`syncLocaleHead`, tested); the Google flag is also requested when the sign-in dialog opens before idle, its place is reserved by a skeleton, and a failed request is logged (tested); `UiPlainButton` replaces four copies of the button classes and is compared with the Nuxt UI theme in a test; `UiSkeleton` has tests and its radius check handles prefixed and partial-corner classes.
- 163cc6a: `UiPlainButton` also covers xs, soft and solid neutral/error; used in the care rows (`TypeRow`), journal entries and plant cards. Fresh profile before it (plant, rate 4, local): the biggest block still lists `Button.vue` 73 ms, `Link.vue` 61 ms and tv/tailwind-merge about 150 ms. Visual tests unchanged (no baseline touched). CI numbers: see the next line.
- CI run 46063937624 (163cc6a) is RED on a slow runner: benchmarkIndex median 2412 (`/en`, 18 runs) and 2374 (plant), `/en` TBT 374 ms (330-418), plant 440 ms (376-555), `/conditions` 0 at 2481. The same code is green at benchmarkIndex about 4300 (133/116 ms), so TBT is far from linear in runner speed (about 3x for a 1.8x slower runner) and the cuts so far buy margin only on fast runners. The budget stays at 200 ms; the V11 box stays unticked.

### V11, round 12: calibrated x4 in CI (maintainer decision of 2026-11-27)

The fixed x4 of 2026-11-26 is replaced by a calibrated x4, because a GitHub runner's speed varies from 2400 to 4500 between jobs and TBT is not linear in it (run 46063937624: 374/440 ms at benchmarkIndex about 2400, 133/116 ms at 4300 for the same code).

- `cpuSlowdown = max(1, 4 * benchmarkIndex / REFERENCE_BENCHMARK_INDEX)`, one helper (`front/infrastructure/perf/cpu-slowdown.cjs`) for the local machine, Lighthouse and the Playwright perf tests; the pin `VERDURE_CPU_SLOWDOWN: '4'` is removed from the Lighthouse job. `VERDURE_CPU_SLOWDOWN` can still force a value by hand.
- REFERENCE_BENCHMARK_INDEX = 2950 (corrected 2026-11-27 on the maintainer's convention: median benchmarkIndex of the CI runners, so a median runner gets the plain 4x of PageSpeed; same constant as dibartolomeo). Measured on 24 LH-SUMMARY lines of runs 45888582762, 45896494923, 45897999454, 45903054152, 46038333611, 46051476530, 46055510630, 46063937624, 46065167875, 46069237805: median about 2980, within 10 % of 2950, so 2950 is kept. The first choice, 1750 from the Lighthouse doc "CPU Throttling" (range 1500-2000), dates from old Chrome versions and gave 7x on runners (run 46069237805: TBT 500/0/616 at benchmarkIndex about 3300, factor 7.2-7.5). Factors now: 1.9 at 1400 (this PC), 3.25 at 2400, 5.8 at 4300.
- The benchmarkIndex is the median of 3 warm-up Lighthouse runs; if one is more than 15 % from the median, the measure is redone once and the second is kept (warning logged if still noisy). Tested in `cpu-slowdown.test.ts`.
- `LH-SUMMARY` now also prints the factor applied (`cpuSlowdown`) and the free RAM of the runner when the summary runs.
- Back timing tests are not CPU-throttled (no browser): the factor applies to Lighthouse and Playwright perf only; the k6 and timing checks of the back keep their own budgets.
- Hydration cut (same round): the page is client-rendered (`server: false`, no HTML to hydrate lazily), so the equivalent of `hydrate-on-visible` is not rendering: `UiAnimationDefer` (renders when it nears the viewport, place reserved) replaces `UiAnimationIdle` for the bio and care sections of the plant page and for the cards after the first row of the list (`now` renders the first row at once). Arrow-key navigation to a card that has not rendered yet does nothing until it is scrolled near. Local AB (not ABBA, cold side first, calibrated 3.2, 3 runs): signed-in `/en` 817 to 610 ms, plant 270 to 299 ms: inside the noise on the plant page, not proven. CI decides.

- Header cuts: the colour-mode toggle is a plain button (both icons, `dark:` variant) and the account menu mounts at idle (or at the first click, opened as it mounts). Playwright perf (CLS, first click on the care section, home cold/warm) passed under the lock at benchmarkIndex 1970 (x2.67).
- Follow-up to V11, not done here: the RAM/CPU conditioning of the runner will also apply to the back timing tests, through a probe/factor helper arriving with dibartolomeo lot P1.
