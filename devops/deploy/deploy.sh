#!/bin/sh
# verdure - o2switch self-deploy (back).
#
# Run by cron every few minutes. It PULLS main and redeploys when the branch
# advanced, so nothing ever connects INTO o2switch: no SSH from a runner, no IP to
# authorise in the firewall, no manual reconnection. The front deploys separately
# on Netlify (see .github/workflows/deploy-front.yml).
#
# A commit is deployed only once its back CI is green (see the CI gate below): the
# repo is public, so we read the commit's check-run status without a token. A
# broken commit therefore never reaches prod.
#
# Migrations run automatically: `drizzle-kit migrate` applies any new ones before
# the app restarts, so new code always meets the migrated schema. The prod drizzle
# journal was back-filled once to reflect the migrations applied by hand before this
# pipeline existed, so migrate is a safe no-op when nothing is new.
#
# One-time setup on the server - see devops/deploy/README.md.
# `set -e` only (not -u): the nodevenv `activate` script references an unbound
# CloudLinux var, which `-u` would turn into a fatal error mid-deploy.
set -e

REPO_DIR="$HOME/verdure"                 # monorepo clone (this file lives in it)
APP_DIR="$HOME/apps/verdure-back"        # the Passenger app root (unchanged)
NODEENV="$HOME/nodevenv/apps/verdure-back/24/bin/activate"
BRANCH=main
LOCK="$HOME/.verdure-deploy.lock"

# Use the read-only deploy key for every git operation (fetch/reset), not just the
# initial clone - otherwise cron's git falls back to the default key and gets
# "Permission denied (publickey)". setup-cron also persists this as core.sshCommand.
export GIT_SSH_COMMAND="ssh -i $HOME/.ssh/verdure-deploy -o StrictHostKeyChecking=accept-new -o BatchMode=yes"

# Never let two cron ticks overlap a deploy.
exec 9>"$LOCK"
flock -n 9 || exit 0

cd "$REPO_DIR"
git fetch --quiet origin "$BRANCH"
OLD=$(git rev-parse HEAD)
NEW=$(git rev-parse "origin/$BRANCH")
[ "$OLD" = "$NEW" ] && exit 0 # nothing new

echo "$(date -u +%FT%TZ) new commits $OLD..$NEW"

# --- CI gate --------------------------------------------------------------
# Only deploy a commit whose back CI is green. The repo is public, so we read
# its check-runs without a token. HEAD is left untouched while waiting/blocked,
# so the next tick re-evaluates until the CI turns green (or a fix is pushed).
# A commit that doesn't touch back/ has no ci-back run to gate on - deploy it
# (the rsync below is a no-op for the back anyway).
if git diff --quiet "$OLD" "$NEW" -- back/; then
  echo "$(date -u +%FT%TZ) no back changes - skipping CI gate"
else
  API="https://api.github.com/repos/MatthiasChometon/verdure/commits/$NEW/check-runs"
  verdict=$(curl -sf -H 'Accept: application/vnd.github+json' "$API" 2>/dev/null | python3 -c '
import sys, json
runs = json.load(sys.stdin).get("check_runs", [])
r = [c for c in runs if c["name"] == "back"]
print(r[0]["status"] + "/" + str(r[0]["conclusion"]) if r else "absent")
' 2>/dev/null) || verdict="error"
  case "$verdict" in
    completed/success)
      echo "$(date -u +%FT%TZ) ci-back green for $NEW - deploying" ;;
    completed/*)
      echo "$(date -u +%FT%TZ) ci-back not green for $NEW ($verdict) - NOT deploying"; exit 0 ;;
    *)
      echo "$(date -u +%FT%TZ) ci-back pending/unreadable for $NEW ($verdict) - waiting"; exit 0 ;;
  esac
fi

git reset --hard "$NEW"
# Mirror the source into the running app dir, keeping installed deps, secrets and
# the build/runtime dirs.
rsync -a --delete \
  --exclude=node_modules --exclude=.env --exclude=tmp \
  --exclude=dist --exclude=public \
  "$REPO_DIR/back/" "$APP_DIR/"

# shellcheck disable=SC1090
. "$NODEENV"
cd "$APP_DIR"
corepack pnpm install --frozen-lockfile
# Apply new migrations BEFORE restarting so the new code meets the new schema.
# No-op when nothing is new (the journal is seeded). DATABASE_URL from the app .env.
export DATABASE_URL="$(grep '^DATABASE_URL=' "$APP_DIR/.env" | cut -d= -f2- | tr -d '"')"
corepack pnpm exec drizzle-kit migrate
corepack pnpm exec vite build --config vite.emails.config.ts
corepack pnpm exec nest build
touch "$APP_DIR/tmp/restart.txt"
echo "$(date -u +%FT%TZ) deployed $NEW"
