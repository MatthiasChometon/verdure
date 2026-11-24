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

| Lot | Scope                                                                                                                                                             | Size (ts+vue lines) |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| V1  | Back socle: `main.ts`, `app.module.ts`, `infrastructure/**`, `tsconfig`/ESLint, `Dockerfile`, compose files, `devops/`, PR #3 "later" items (D10) that live there | ~1k + config        |
| V2  | Back `domain/aiWorker`, `plant`, `plantIdentify`                                                                                                                  | 4.3k                |
| V3  | Back `domain/auth`, `user`, `speciesReference`, `species`, `nickname`                                                                                             | 3.8k                |
| V4  | Back `domain/bugReport`, `watering`, `wateringReminder`, `plantCare`, `improvementRequest`, `calendarFeed`, `plantJournal`, `pushSubscription`, `adminNotice`     | 5.0k                |
| V5  | Front socle: `nuxt.config.ts`, `ddd/`, `infrastructure/**`, `tsconfig`/ESLint, PR CI for the front (`ci-front.yml`)                                               | ~1.2k + config      |
| V6  | Front `domain/plant`                                                                                                                                              | 4.2k                |
| V7  | Front `domain/watering`, `ai`, `auth`, `plantJournal`, `plantCare`, `bugReport`, `reminders`, `improvementRequest`, `calendarFeed`                                | 5.9k                |
| V8  | `ai/` worker (Python): only the TypeScript-side contract and Docker rules apply; checked for readability, timeouts, errors                                        | —                   |
| V9  | Final pass: duplicates across slices, dead code / unused dependencies, README and docs, final PR to `main`                                                        | —                   |

- [x] V1 — impl · review · ci · ok · merged (PR #4, e55bd83)
- [x] V2 — impl · review · ci · ok · merged (PR #5, 7653f78)
- [x] V3 — impl · review · ci · ok · merged (PR #7, c5304d1)
- [x] V4 — impl · review · ci · ok · merged (PR #10, d10bb94)
- [ ] V5 — impl · review · ci · ok · merged
- [ ] V6 — impl · review · ci · ok · merged
- [ ] V7 — impl · review · ci · ok · merged
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
