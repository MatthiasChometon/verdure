# verdure-ai

Isolated, GPU-accelerated AI bundle for the [verdure](https://github.com/MatthiasChometon/verdure-back) back.
Clone it and `docker compose up` — nothing to install by hand (models download
themselves on first boot).

A single ComfyUI runtime runs both pipelines the app needs, natively on the GPU,
with the model weights in its shared `models/` store (a persisted volume):

- **`nomic-embed-text-v1.5`** — text embeddings (768-dim) for semantic search,
  via the `VerdureEmbed` node
- **`Qwen2.5-VL-3B`** — vision model for plant identification, via the
  `ComfyUI-QwenVL` node

Each AI is just a JSON workflow + a route in the api — the ComfyUI runtime and
its model store are shared, nothing is duplicated.

## Requirements (host)

- Docker (with the NVIDIA container runtime / WSL2 GPU support)
- An NVIDIA GPU + driver — verify with:
  ```
  docker run --rm --gpus all nvidia/cuda:12.4.0-base-ubuntu22.04 nvidia-smi
  ```

## Run

```
docker compose up
```

The first boot pulls ~3.5 GB of Ollama models into a named volume; later boots
are instant.

> Note: on an 8 GB GPU the vision model needs the VRAM to itself — do not run a
> heavy generative ComfyUI at the same time as an identification.

## Services

| service | role |
| --- | --- |
| `comfyui` | shared GPU runtime + model store, runs the pipelines |
| `api` | HTTP wrapper the back calls (`/identify`, `/embed`, `/health`) |
