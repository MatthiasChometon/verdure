import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// The GraphQL endpoint is reached from three different vantage points, which
// only diverge under Docker (locally they all fall back to localhost:3000):
//   - host              : server-side (SSR) requests, overridden by GQL_HOST
//   - introspectionHost : GraphQL Codegen introspection at build/prepare time
//   - clientHost        : browser requests (must resolve from the user's machine)
// In Docker, compose passes GQL_HOST=http://back:3000/graphql (container network)
// and GQL_CLIENT_HOST=http://localhost:3000/graphql (published port).
const graphqlHost = process.env.GQL_HOST ?? 'http://localhost:3000/graphql';

// Types come from the versioned schema whenever it is present — a checkout and,
// once it is committed, the Netlify build — so the front compiles with no API
// running and the deployed API can keep introspection off. Only when the file
// is absent (e.g. the front's own Docker context, which excludes ../back) does
// it fall back to introspecting a reachable endpoint.
const monorepoSchema = fileURLToPath(
  new URL('../../../back/infrastructure/graphql/schema.gql', import.meta.url),
);
const schemaPath = process.env.GQL_SCHEMA ?? monorepoSchema;
const schemaSource = existsSync(schemaPath)
  ? { schema: schemaPath }
  : { introspectionHost: process.env.GQL_INTROSPECTION_HOST ?? graphqlHost };

export default defineNuxtConfig({
  modules: ['nuxt-graphql-client'],
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? 'http://localhost:3000',
      // Public origin of the site itself (Netlify), used to build absolute URLs
      // for Open Graph images. Same value as the i18n baseUrl.
      siteUrl: process.env.NUXT_PUBLIC_I18N_BASE_URL ?? 'http://localhost:3001',
      // Prod (behind Caddy): the browser calls the back on its own origin.
      apiSameOrigin: process.env.NUXT_PUBLIC_API_SAME_ORIGIN === 'true',
      'graphql-client': {
        clients: {
          default: {
            host: graphqlHost,
            ...schemaSource,
            clientHost: process.env.GQL_CLIENT_HOST ?? graphqlHost,
            // Send the auth cookie on browser requests. Needed when the front and
            // the API sit on different domains (public deploy: Netlify + o2switch),
            // where the cookie is SameSite=None; harmless when they share an origin.
            corsOptions: { mode: 'cors', credentials: 'include' },
          },
        },
      },
    },
  },
});
