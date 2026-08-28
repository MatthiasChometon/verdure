#!/bin/sh
# verdure — o2switch self-deploy (back).
#
# Run by cron every few minutes. It PULLS main and redeploys when the branch
# advanced, so nothing ever connects INTO o2switch: no SSH from a runner, no IP to
# authorise in the firewall, no manual reconnection. The front deploys separately
# on Netlify (see .github/workflows/deploy-front.yml).
#
# One-time setup on the server (done over SSH once — see ops/README.md):
#   - a read-only deploy key so `git pull` works on the private repo;
#   - the Passenger app root pointed at this clone's `back/` dir;
#   - this cron: `*/3 * * * * /bin/sh $HOME/verdure/ops/deploy.sh >> $HOME/deploy.log 2>&1`
#
# The paths below match the documented o2switch layout; confirm them on the box.
set -eu

REPO_DIR="$HOME/verdure"                 # full monorepo clone (this file lives in it)
NODEENV="$HOME/nodevenv/apps/verdure-back/24/bin/activate"
RESTART="$REPO_DIR/back/tmp/restart.txt" # Passenger restart trigger (app root = back/)
BRANCH=main
LOCK="$HOME/.verdure-deploy.lock"

# Never let two cron ticks overlap a deploy.
exec 9>"$LOCK"
flock -n 9 || exit 0

cd "$REPO_DIR"
git fetch --quiet origin "$BRANCH"
if [ "$(git rev-parse HEAD)" = "$(git rev-parse "origin/$BRANCH")" ]; then
  exit 0 # nothing new
fi

TARGET="$(git rev-parse --short "origin/$BRANCH")"
echo "$(date -u +%FT%TZ) deploying $TARGET"
git reset --hard "origin/$BRANCH"

# Node env on PATH (pnpm via corepack).
# shellcheck disable=SC1090
. "$NODEENV"

cd "$REPO_DIR/back"
corepack pnpm install --frozen-lockfile
# Idempotent: drizzle-kit applies only migrations not yet in __drizzle_migrations.
corepack pnpm exec drizzle-kit migrate
# build:emails (vite) + nest build
corepack pnpm build

mkdir -p "$(dirname "$RESTART")"
touch "$RESTART"
echo "$(date -u +%FT%TZ) deployed $TARGET"
