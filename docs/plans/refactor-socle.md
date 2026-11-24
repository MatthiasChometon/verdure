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

## Lots

Each lot audits **every file** in its scope against the checklist, fixes, adds the missing
tests, and lists in its PR body the rules checked and what was left (with the reason).

| Lot | Scope | Size (ts+vue lines) |
| --- | --- | --- |
| V1 | Back socle: `main.ts`, `app.module.ts`, `infrastructure/**`, `tsconfig`/ESLint, `Dockerfile`, compose files, `devops/`, PR #3 "later" items (D10) that live there | ~1k + config |
| V2 | Back `domain/aiWorker`, `plant`, `plantIdentify` | 4.3k |
| V3 | Back `domain/auth`, `user`, `speciesReference`, `species`, `nickname` | 3.8k |
| V4 | Back `domain/bugReport`, `watering`, `wateringReminder`, `plantCare`, `improvementRequest`, `calendarFeed`, `plantJournal`, `pushSubscription`, `adminNotice` | 5.0k |
| V5 | Front socle: `nuxt.config.ts`, `ddd/`, `infrastructure/**`, `tsconfig`/ESLint, PR CI for the front (`ci-front.yml`) | ~1.2k + config |
| V6 | Front `domain/plant` | 4.2k |
| V7 | Front `domain/watering`, `ai`, `auth`, `plantJournal`, `plantCare`, `bugReport`, `reminders`, `improvementRequest`, `calendarFeed` | 5.9k |
| V8 | `ai/` worker (Python): only the TypeScript-side contract and Docker rules apply; checked for readability, timeouts, errors | — |
| V9 | Final pass: duplicates across slices, dead code / unused dependencies, README and docs, final PR to `main` | — |

- [ ] V1 — impl · review · ci · ok · merged
- [ ] V2 — impl · review · ci · ok · merged
- [ ] V3 — impl · review · ci · ok · merged
- [ ] V4 — impl · review · ci · ok · merged
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
  + `ErrorsInfrastructureModule`; DataLoader for `wateringHistory`; `upsertByGoogleId` race
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
