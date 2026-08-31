#!/bin/sh
# One-shot: wire the o2switch self-deploy cron. Idempotent — safe to re-run.
# Run once on the server: clones the repo with the deploy key, then installs the
# cron that runs devops/deploy/deploy.sh. If the deploy key is not yet authorised on GitHub
# it prints the public key to add (repo Settings -> Deploy keys, read access) and
# stops, so a second run finishes the job.
set -eu

REPO_URL="git@github.com:MatthiasChometon/verdure.git"
REPO_DIR="$HOME/verdure"
KEY="$HOME/.ssh/verdure-deploy"
CRON_CMD="/bin/sh $REPO_DIR/devops/deploy/deploy.sh >> $HOME/deploy.log 2>&1"
CRON_LINE="*/3 * * * * $CRON_CMD"

GIT_SSH_COMMAND="ssh -i $KEY -o StrictHostKeyChecking=accept-new -o BatchMode=yes"
export GIT_SSH_COMMAND

echo "== check deploy key =="
if [ ! -f "$KEY" ]; then
  ssh-keygen -t ed25519 -f "$KEY" -N '' -C 'verdure-o2switch-deploy'
fi
if ! git ls-remote "$REPO_URL" main >/dev/null 2>&1; then
  echo "!! Deploy key not authorised on GitHub. Add this key (repo -> Settings ->"
  echo "   Deploy keys -> Add, read-only), then run this script again:"
  echo "----------------------------------------------------------------"
  cat "$KEY.pub"
  echo "----------------------------------------------------------------"
  exit 1
fi
echo "key OK"

echo "== clone / update =="
if [ ! -d "$REPO_DIR/.git" ]; then
  git clone "$REPO_URL" "$REPO_DIR"
fi
cd "$REPO_DIR"
# Persist the deploy key for every later git op (cron's fetch/reset), not just now.
git config core.sshCommand "$GIT_SSH_COMMAND"
git fetch origin main
git reset --hard origin/main
chmod +x devops/deploy/deploy.sh

echo "== install cron (idempotent) =="
# Drop any prior line by the invariant script name, whatever path it used
# (…/verdure/ops/deploy.sh, …/devops/ops/deploy.sh, or today's
# …/devops/deploy/deploy.sh) — cleans a stale live line and keeps this idempotent.
( crontab -l 2>/dev/null | grep -v 'deploy.sh' ; echo "$CRON_LINE" ) | crontab -
echo "== crontab now =="
crontab -l | grep 'devops/deploy/deploy.sh' || true

echo "SETUP_DONE"
