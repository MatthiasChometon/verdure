# Back best practices

One verifiable rule per line. The audit in `best-practices-audit.md` checks the
code against this list.

## TypeScript

- [ ] `strict` is on in `tsconfig.json` (only `strictPropertyInitialization` is off, for decorated DTO/model classes).
- [ ] No `any`: `@typescript-eslint/no-explicit-any` is an error.
- [ ] No `as unknown as` in production code; `as` only where a library type cannot be narrowed otherwise.
- [ ] Functions are arrow functions or class methods (`func-style: expression`, `prefer-arrow-callback`).
- [ ] Every function and method has an explicit return type.
- [ ] `type` is preferred; `interface` only for class contracts.
- [ ] Imports never carry a `.js` extension.
- [ ] Types used in decorated signatures are imported with `import type` when they are type-only.
- [ ] `undefined` is the absence value; `null` only at the database and GraphQL boundary.
- [ ] One level of abstraction per function (stepdown rule); function names start with a verb.
- [ ] Comments explain a "why" the code cannot express, never the "what".
- [ ] No magic numbers: named constants at the top of the file.

## Node

- [ ] No floating promise: `@typescript-eslint/no-floating-promises` is an error; fire-and-forget is `void` plus an internal `catch`.
- [ ] A background task (cron tick, event callback) can never reject unhandled: it catches and logs.
- [ ] One failing item does not abort a batch (`Promise.allSettled`, or a per-item `catch`).
- [ ] Every outbound HTTP call has a timeout.
- [ ] Secrets are never put in a URL string; query parameters go through `params` (encoded).
- [ ] `bootstrap()` failures are caught, logged and exit with a non-zero code.
- [ ] CPU-heavy work (scrypt, sharp) uses the async API, never the sync one.

## NestJS

- [ ] `app.enableShutdownHooks()` is called so SIGTERM runs `onModuleDestroy` / `onApplicationShutdown`.
- [ ] Resources (DB pool, timers) are released in a lifecycle hook.
- [ ] Configuration is read through `ConfigService`, never `process.env` in application code.
- [ ] Every REST body and GraphQL argument is a class with class-validator decorators (the global `ValidationPipe` has `whitelist` and `forbidNonWhitelisted`).
- [ ] Controllers and resolvers only translate transport to service calls; business rules live in services.
- [ ] Domain errors are Nest HTTP exceptions (`NotFoundException`, …), never a bare `Error` for an expected case.
- [ ] Logs go through Nest `Logger` with the class name as context, never `console.*` (CLI scripts excepted).
- [ ] Shared helpers are `@Injectable` classes, injected, named after their role.

## GraphQL

- [ ] Code-first schema; `schema.gql` is generated and committed, and the contract only changes on purpose.
- [ ] Introspection is off unless explicitly enabled; the playground is off.
- [ ] Stack traces are never sent to the client (`includeStacktraceInErrorResponses: false`).
- [ ] Query depth is limited (validation rule).
- [ ] Automatic persisted queries are off (no unbounded cache).
- [ ] A `@ResolveField` that hits the database on a list type is batched (DataLoader) or joined, never N+1.
- [ ] Every query or mutation on user data is guarded and scoped by the current user id.

## PostgreSQL / Drizzle

- [ ] One table per slice in `domain/**/schema.ts`; migrations are generated with `pnpm db:generate`, never edited by hand once shipped.
- [ ] Every column used in a frequent `WHERE` (owner `user_id`, token hashes, foreign keys) is indexed.
- [ ] Queries are built with the query builder or the `sql` template (bound parameters); `sql.raw` only for constants.
- [ ] A multi-statement write that must be all-or-nothing runs in `db.transaction`.
- [ ] Every list query has a stable `ORDER BY` ending with a unique tie-break (id).
- [ ] Paginated lists count with `count(*) over()` in the same round-trip.
- [ ] A read-then-write race is closed by a constraint (`unique`, `on conflict`) or a row lock.
- [ ] The pool is closed on shutdown.

## Tests

- [ ] Tests check behaviour through the public surface (HTTP, GraphQL), not implementation details.
- [ ] Mostly integration: e2e tests boot the real `AppModule` against a dedicated test database.
- [ ] Unit tests only for pure logic (due dates, messages, mappers, parsers).
- [ ] Arrange / Act / Assert, one behaviour per test, a name that reads as a sentence.
- [ ] No mock-based test that only proves a resolver delegates to a repository.
- [ ] Every bug fix comes with a test that fails without the fix.
- [ ] Stubs and harnesses live in their own files next to the tests that use them.
- [ ] Critical paths are covered: auth, ownership scoping, validation rejections.

## Docker

- [ ] Multi-stage build; the final stage holds only what runs.
- [ ] Base image pinned to a version; installs use `--frozen-lockfile`.
- [ ] Layer cache: manifests and lockfile are copied and installed before the sources.
- [ ] The final stage runs as a non-root user (`USER node`).
- [ ] A `HEALTHCHECK` probes the running API.
- [ ] `CMD`/`ENTRYPOINT` in exec form so the process receives SIGTERM.
- [ ] `.dockerignore` excludes `node_modules`, `dist`, `.git` and every `.env` file.

## Security

- [ ] Authentication endpoints (login, register, password reset, verification) are rate limited.
- [ ] Behind a proxy, the rate limiter keys on the real client IP (`trustProxy`).
- [ ] The request body size is capped (JSON and multipart).
- [ ] CORS uses an explicit allowlist with credentials.
- [ ] Helmet sets security headers.
- [ ] The JWT secret comes from the environment and is required at boot.
- [ ] Passwords are hashed with scrypt and compared with `timingSafeEqual`.
- [ ] Auth responses never reveal whether an account exists.
- [ ] Session cookie is `httpOnly`, `Secure` when cross-site, `SameSite` set.
- [ ] Only hashes of single-use tokens are stored.
- [ ] Uploads check the MIME type and size.

## Architecture

- [ ] Vertical slices: `domain/<slice>` by business sub-domain, `infrastructure/<role>` by technical role, no `src/`.
- [ ] `infrastructure` never imports `domain` (ESLint `no-restricted-imports`).
- [ ] A slice owns its schema, model, input, repository, service and resolver.
- [ ] Repeated logic across slices is extracted once into an injectable helper.
- [ ] No `static` members except values needed inside decorators.

## Observability / 12-factor

- [ ] All configuration comes from the environment; `.env.example` lists every variable.
- [ ] Logs go to stdout through the Nest logger.
- [ ] Errors caught in background work are logged with their context, never swallowed silently.
- [ ] A health endpoint (or probe) reports the process is up.
- [ ] The process is stateless; files go through the storage abstraction.
- [ ] The same build runs in every environment; only the environment changes.
