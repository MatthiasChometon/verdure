#!/usr/bin/env sh
# verdure worker — builds and starts ComfyUI + api + worker. A page opens for you
# to confirm the connection on first launch. Keep this running while you use the AI.
cd "$(dirname "$0")" || exit 1
docker compose up
