# verdure — full stack

One `docker compose up` brings up the whole app: PostgreSQL, MinIO, Mailpit, the
NestJS API and the Nuxt front, wired together. The AI bundle (ComfyUI) is part
of the stack too; it needs an NVIDIA GPU and can be skipped without one.

## Layout

Everything lives in this single repo — one clone, one `docker compose up`:

```bash
git clone https://github.com/MatthiasChometon/verdure.git
cd verdure
docker compose up
```

```
verdure/
├─ docker-compose.yml        # dev (hot-reload)
├─ docker-compose.prod.yml   # prod (built images)
├─ back/     NestJS API (Fastify + Apollo GraphQL + Drizzle/Postgres)
├─ front/    Nuxt app (Nuxt UI + Tailwind + i18n)
└─ ai/       ComfyUI AI bundle (plant identification + embeddings, GPU)
```

## Requirements

- Docker Desktop (WSL2 backend on Windows 11).
- ~4 GB free RAM for the app; the AI bundle additionally needs an NVIDIA GPU
  with the container toolkit (`docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi`).

## Run — dev

```bash
docker compose up                                    # everything, including the AI bundle
docker compose up --scale comfyui=0 --scale ai-api=0 # skip the AI bundle (no GPU)
```

The AI bundle (ComfyUI) is part of the stack and needs an NVIDIA GPU; skip it
with the scale flags above and plant identification / semantic search degrade
gracefully. First boot takes a few minutes: the back applies migrations and
seeds, the front installs its dependencies and generates its GraphQL types
against the live API, and the AI bundle downloads its models.

| Service        | URL                              |
| -------------- | -------------------------------- |
| Front          | http://localhost:3666            |
| GraphQL        | http://localhost:3000/graphql    |
| Mailpit inbox  | http://localhost:8025            |
| MinIO console  | http://localhost:9001            |
| AI API         | http://localhost:8000            |

Source is bind-mounted, so edits hot-reload both the back and the front.

## Run — prod

```bash
docker compose -f docker-compose.prod.yml up --build
```

Images bake the source; the back runs the compiled server and the front serves
its built Nitro output. The front builds once on first boot (it needs the live
API for codegen) and caches the result in a volume — remove it to force a
rebuild: `docker compose -f docker-compose.prod.yml down -v`.

## Configuration

Everything ships with working dev defaults. To enable Google login or set a real
JWT secret, copy `.env.example` to `.env` and fill it in — compose reads it
automatically.

## Without the AI bundle

Plant identification and semantic search call the AI API best-effort: when the
AI bundle is skipped (or no GPU is available) those features degrade gracefully
and the rest of the app works normally.
