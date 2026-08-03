# syntax=docker/dockerfile:1
#
# nuxt-graphql-client generates its types by introspecting the LIVE back, so the
# install / prepare / build steps can only run once the GraphQL API is up. They
# therefore happen at container start (see docker-entrypoint.sh), not at
# image-build time — the image only carries the source and pnpm.

FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
# node_modules lives in a named volume, so on a container recreate `pnpm build`
# runs against a pre-existing install. pnpm 11's pre-run "verify deps" would then
# try to reinstall and, finding a mismatch, abort trying to purge node_modules
# with no TTY (ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY). Skip that check and
# never block on an interactive purge confirmation — the deps are already there.
ENV npm_config_verify_deps_before_run=false npm_config_confirm_modules_purge=false
RUN corepack enable
WORKDIR /app
COPY . .

# --- dev: hot-reload; the source tree is bind-mounted by compose -----------
FROM base AS dev
ENV MODE=dev
EXPOSE 3000
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
# `--host` takes a value in nuxi: `--host --port 3000` would make it swallow
# `--port` as the hostname and read `3000` as the positional rootDir, starting
# an empty project (the app then falls back to the Nuxt welcome page). Pass an
# explicit host so both flags parse and the rootDir stays the working dir.
CMD ["pnpm", "exec", "nuxt", "dev", "--host", "0.0.0.0", "--port", "3000"]

# --- prod: build once at first boot, then serve the Nitro output -----------
FROM base AS prod
ENV MODE=prod NODE_ENV=production PORT=3000
EXPOSE 3000
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
CMD ["node", ".output/server/index.mjs"]
