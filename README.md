# 🌿 verdure

**A companion for indoor-plant lovers** — build your plant collection, never miss a
watering, and identify any plant from a photo. The plant recognition and the
"smart" search can run in the cloud, or **privately on your own GPU** — the app
never has to send your photos to a third party.

### ▶️ Live demo: **[verdure.mtxlab.xyz](https://verdure.mtxlab.xyz)**

Sign in with Google or an email address to try it (your garden is private to you).

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Nuxt](https://img.shields.io/badge/Nuxt%204-00DC82?style=flat-square&logo=nuxt&logoColor=white)
![Vue](https://img.shields.io/badge/Vue%203-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white)
![GraphQL](https://img.shields.io/badge/GraphQL-E10098?style=flat-square&logo=graphql&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)

---

## What it does

- **Your collection** — add each plant with a photo, name and species; browse, filter
  by genus or photo, and search. Everything is scoped to your account.
- **Watering, handled** — a per-species seasonal schedule (summer/winter intervals),
  a **"to water today"** band on the home, a full **calendar** of past waterings and
  upcoming due dates, and one-tap "watered" with optimistic UI.
- **Identify from a photo** — snap a plant and get its species. Two engines, your
  choice: **Pl@ntNet** (cloud, fast) or **your own PC** (a local GPU worker — the
  photo never leaves your machine). Bring your own Pl@ntNet key, or fall back to a
  shared one with a fair-use daily cap.
- **Meaning-aware search** — when a GPU worker is connected, search ranks results by
  semantic similarity (embeddings), not just keywords.
- **Built for real use** — installable **PWA that works offline**, French/English
  i18n, dark mode, keyboard shortcuts, full loading/empty/error states, and a
  visual-regression-tested UI.
- **Accounts** — Google OAuth and email/password with mandatory email verification
  and password reset, over a JWT httpOnly cookie.

## The interesting bit: bring-your-own-GPU AI

The public app never talks to a GPU directly. Instead, a user's own machine runs a
small worker that **long-polls a job queue** for `identify` and `embed` jobs, does
the work on its local GPU (ComfyUI: a vision model for recognition, an embedding
model for search), and posts the result back. This means the heavy, private AI runs
**on the user's hardware, behind any firewall, at zero server cost** — and the app
degrades gracefully to the cloud engine (or keyword search) when no worker is online.

## Tech stack

| Layer        | Stack |
| ------------ | ----- |
| **Frontend** | Nuxt 4 · Vue 3 · TypeScript · Nuxt UI · Tailwind CSS v4 · `@nuxtjs/i18n` · nuxt-graphql-client (typed codegen) · PWA · static generation → **Netlify** |
| **Backend**  | NestJS · Fastify · GraphQL (Apollo, code-first) · Drizzle ORM · PostgreSQL · JWT auth · Nodemailer → **o2switch** |
| **AI worker**| ComfyUI (NVIDIA GPU) · vision model for identification · embeddings for semantic search · long-poll job queue |
| **Tooling**  | pnpm monorepo · Docker (dev + prod Compose) · Vitest · Playwright (visual + e2e) · ESLint / Prettier · GitHub Actions + server-side self-deploy |

## Architecture

- **Monorepo** — `front/`, `back/`, `ai/`, one clone, one `docker compose up`.
- **Vertical-slice architecture** — each feature is a slice split into `domain/` and
  `infrastructure/`, with a strict one-way dependency (`infrastructure ↛ domain`).
  On the front, each slice is a real Nuxt **layer**; on the back, Drizzle uses one
  table per slice with auto-discovery.
- **Typed end to end** — the GraphQL schema is generated code-first on the back and
  the front's client + types are generated from it, so a breaking change is a compile
  error, not a runtime surprise.
- **Optimistic UI** — mutations update the cached query immediately and roll back on
  the reactive error, following Nuxt's `useNuxtData` / `refreshNuxtData` pattern.
- **CI/CD** — the front auto-deploys to Netlify on push to `main`; the back
  self-deploys through a server-side pull cron (see [`devops/deploy/`](./devops/deploy)), so a shared host
  behind a firewall stays fully automated.

## Run it locally

Everything comes up with one command — PostgreSQL, object storage, a mail catcher,
the API and the front, wired together:

```bash
git clone https://github.com/MatthiasChometon/verdure.git
cd verdure
docker compose up                                    # everything, incl. the AI bundle
docker compose up --scale comfyui=0 --scale ai-api=0 # skip the AI bundle (no GPU)
```

The AI bundle needs an NVIDIA GPU (container toolkit); skip it with the flags above
and identification / semantic search degrade gracefully. First boot takes a few
minutes (migrations + seeds, front codegen against the live API, model downloads).

| Service       | URL                           |
| ------------- | ----------------------------- |
| Front         | http://localhost:3666         |
| GraphQL       | http://localhost:3000/graphql |
| Mailpit inbox | http://localhost:8025         |
| MinIO console | http://localhost:9001         |
| AI API        | http://localhost:8000         |

Source is bind-mounted, so edits hot-reload both the back and the front. For
production images: `docker compose -f docker-compose.images.yml up --build`.
Working dev defaults ship out of the box; copy `.env.example` to `.env` to set a real
JWT secret or enable Google login.

## Project structure

```
verdure/
├─ front/    Nuxt app          (Nuxt UI · Tailwind · i18n · PWA)
├─ back/     NestJS API        (Fastify · Apollo GraphQL · Drizzle/Postgres)
├─ ai/       ComfyUI AI bundle (plant identification + embeddings, GPU)
└─ devops/   deployment        (Caddy · o2switch self-deploy cron)
```

## Deployment

The front is a static build on **Netlify** ([verdure.mtxlab.xyz](https://verdure.mtxlab.xyz)),
the API and PostgreSQL run on **o2switch** (`api.verdure.mtxlab.xyz`), and the AI
worker runs on the user's own GPU. See [`devops/deploy/README.md`](./devops/deploy/README.md) for the
push-to-deploy setup.

---

Built by [Matthias Chometon](https://www.linkedin.com/in/matthias-chometon-99371a177/).
