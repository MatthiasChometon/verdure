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
  squash-merged after review. **PR #3 is never merged without Matthias's order**; the final PR
  `refactor/socle` → `main` is stacked on it and stays **open for Matthias** (merging into
  `main` deploys the back to o2switch and the front to Netlify).
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
  dedicated migration (generated, then checked against prod data with Matthias) does them all.

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
| V9  | Final pass: duplicates across slices, dead code / unused dependencies, README and docs, final PR to `main`                                                                                                               | —                   |

- [x] V1 — impl · review · ci · ok · merged (PR #4, e55bd83)
- [x] V2 — impl · review · ci · ok · merged (PR #5, 7653f78)
- [x] V3 — impl · review · ci · ok · merged (PR #7, c5304d1)
- [x] V4 — impl · review · ci · ok · merged (PR #10, d10bb94)
- [x] V5 — impl · review · ci · ok · merged (PR #17, 089f0f8)
- [x] V6 — impl · review · ci · ok · merged (PR #18, bfc44d6)
- [x] V7a — impl · review · ci · ok · merged (PR #19, 88e24a6): watering, plantCare, reminders, calendarFeed, plantJournal
- [x] V7b — impl · review · ci · ok · merged (PR #20, 1645983): ai, auth, bugReport, improvementRequest, legal + null policy + exemption block deleted
- [ ] V7c — impl · review · ci · ok · merged: `exactOptionalPropertyTypes` green with the flag on; translation blocks moved + scanner on all slices; `ci-e2e.yml` with Linux baselines, or a V9 decision with the reason
- [ ] V10 — impl · review · ci · ok · merged (after V7c)
- [ ] V8 — impl · review · ci · ok · merged
- [ ] V9 — impl · review · ci · ok · merged
- [ ] Final PR `refactor/socle` → `main` opened (stacked on PR #3), left for Matthias

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
    default. Matthias's `start-verdure` skill (outside the repo) must export
    `BIND_ADDRESS=0.0.0.0` for phone use.
- 2026-11-24 — V1 merged (PR #4): 2 review rounds, 10 findings (1 blocker: the fragment-aware depth
  limit counted introspection fields and refused `getIntrospectionQuery()`; same fix ported to menu, PR
  menu#4). Left on purpose: the `deploy.sh` env check runs after the build (limitation documented in the
  script), `docker-compose.prod.yml` (local prod-like stack) is not held to the deployed secret rules,
  `minio`/`mc` on `latest` (no tag verifiable; a fresh pull may differ from Matthias's local images).
  **Before merging to `main`, Matthias must confirm the o2switch `JWT_SECRET` is ≥ 32 characters and not
  the placeholder** (otherwise every deploy refuses to restart), and his `start-verdure` skill must export
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
- 2026-11-25 — V7b merged (PR #20, 1645983): 3 review rounds (11 findings, then 1 minor + 1 nit). Local: lint, typecheck, build, vitest 78/345 green. The branch commits carried a `Co-Authored-By` trailer despite the brief; the squash commit has none. Checklist gap found by Matthias (no `void` on promises, retry jitter, interceptors, format pipes): checklist updated, lot V10 applies it repo-wide after V7c. Next: V7c.
- 2026-11-25 — V7c (front package-wide; branch `refactor/socle-v7c`). Last owner of every V7 deferral.
  Turned on: `exactOptionalPropertyTypes` in `front/nuxt.config.ts` (`typescript.tsConfig.compilerOptions`), `nuxt typecheck` green, no `skipLibCheck` change, no `as`. Fixes: own component props and models that receive a possibly absent value now say `| undefined` (`SafetyPreview`, `Card`, `Filters` genus, `FormDialog`/`DeleteDialog` plant, `ImageField`, `Form` plant, `PollResult`); Nuxt UI props that refuse `undefined` get the prop left out instead (`UAvatar` src in `Header`, `UFormField` hint `''` in auth `Dialog`, the two number `UInput` in watering `Fields` through `daysProps`/`toDays`, `USelectMenu` through a `null`-mapping computed in `Calendar`); `usePlantsCache.test` item uses `null`; `eslint.config.ts` drops the absent keys the vue-i18n plugin types as `files?: undefined`.
  Generated GraphQL SDK (`.nuxt/gql/default.ts`, 16 + the plant/bugReport input errors): handled in `infrastructure/graphql/nuxt.config.ts`: codegen's `maybeValue: 'T | null | undefined'` (an absent input is an absent key; also feeds `InputMaybe`), plus an `app:templates` hook (`omitAbsentVariables.ts`, unit-tested) so `variables` is forwarded only when defined (graphql-request refuses a possibly undefined `variables`; same request on the wire). The hook throws if the generated text no longer contains the expected pattern, so a module upgrade fails the build instead of skipping silently; drop it once the nuxt-graphql-client SDK template is graphql-request-safe.
  Behaviour note: clearing a watering interval field now reports `undefined` (it used to leave `''` in a number model, sent to the API as an invalid Int); covered by `Fields.test.ts`. Tracking collapses only if both intervals end up empty, as before.
  Translations: the `plant.today|watering|calendar` blocks moved to `domain/watering/translation`, `plant.care` to `plantCare`, `plant.journal` to `plantJournal` (same keys, fr and en, no behaviour change). `translation.test.ts` now checks fr/en parity for every translation folder, and the scanner globs every slice under `domain/` (including `site`), so a new slice is covered without editing the list.
  `ci-e2e.yml`: decision, NOT landed, moved to V9. Reason: the only Playwright suite is the visual one (`plant list page`, 6 baselines, all `*-win32.png`); a Linux run has no baseline, and creating `*-linux.png` can only be done by a Linux render that nobody has looked at, which is a baseline made to make a run pass. Landing it here would also need CI iterations to settle fonts and `maxDiffPixelRatio`. There is no `*.e2e.test.ts` in the front. Exit condition for V9: a `workflow_dispatch` job renders the 6 images on Linux with `--update-snapshots` as an artifact (win32 files untouched), Matthias reviews them, they are committed as `*-linux.png`, then `ci-e2e.yml` runs `pnpm test:visual` on the front paths. `ci-front.yml` comment now names V9.
  Deletion candidates: none.
