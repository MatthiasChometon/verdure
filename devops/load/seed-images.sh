#!/usr/bin/env bash
# Writes the 20 photos of the showcase plants (seed.sql, keys 20000000-0000-4000-8000-0000000000NN)
# into the API's disk storage: a JPEG each, about the weight of a phone photo shown at card size,
# with the content-type sidecar the disk driver reads. Usage: seed-images.sh <storage dir>
set -euo pipefail
dir="$1"
mkdir -p "$dir"
for n in $(seq 1 20); do
  key=$(printf '20000000-0000-4000-8000-%012d' "$n")
  convert -size 800x800 plasma:fractal -blur 0x2 -quality 70 "$dir/$key"
  printf 'image/jpeg' > "$dir/$key.type"
done
