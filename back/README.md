# verdure — back

NestJS + Fastify + GraphQL (Apollo, code-first) + Drizzle / PostgreSQL. Vertical
slices under `domain/` and `infrastructure/`.

## Requirements

- Node 20+ and [pnpm](https://pnpm.io)
- Docker (for the local services)

## Getting started

```bash
cp .env.example .env
docker compose up -d        # Postgres, MinIO, Mailpit
pnpm install
pnpm db:migrate             # apply the Drizzle migrations
pnpm start:dev              # GraphQL + REST on http://localhost:3000
```

## Local services & ports

| Service | Purpose | Port(s) | UI |
| --- | --- | --- | --- |
| Postgres | database (`verdure`, `verdure_test`) | `5432` | — |
| MinIO | S3-compatible image storage | `9000` (API), `9001` (console) | http://localhost:9001 |
| **Mailpit** | **catches dev emails (verification, reset)** | `1025` (SMTP), `8025` (inbox) | **http://localhost:8025** |
| API | GraphQL `/graphql` + REST `/auth`, `/uploads` | `3000` | — |

## Emails

Every email the app sends (email verification, password reset) goes through SMTP
env vars, so only the `.env` changes between environments:

- **dev** — `MAIL_HOST=localhost` → **Mailpit**: open **http://localhost:8025**
  to read the message and click its link. (Alt: `MAIL_HOST=ethereal` for a
  Nodemailer test account — the preview URL is printed in the server logs.)
- **prod** — Gmail SMTP: `MAIL_HOST=smtp.gmail.com`, `MAIL_PORT=465`,
  `MAIL_SECURE=true`, `MAIL_USER=<address>`, `MAIL_PASS=<app password>`.

## Scripts

```bash
pnpm start:dev        # watch mode
pnpm test             # unit tests
pnpm test:e2e         # e2e tests (dedicated verdure_test database)
pnpm typecheck        # tsc --noEmit
pnpm lint             # eslint
pnpm db:generate      # generate a migration from the schema changes
pnpm db:migrate       # apply migrations
pnpm db:studio        # Drizzle Studio
```
