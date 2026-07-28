#!/bin/sh
# Apply pending migrations, then start the server. The reference data (nickname
# bank + species index) is seeded by the app itself on bootstrap — in the
# background and only when empty — so it must NOT be forced here: that would
# re-download the whole GBIF sweep and block startup past the healthcheck.
set -e

echo "[verdure-back] applying database migrations..."
pnpm db:migrate

echo "[verdure-back] starting: $*"
exec "$@"
