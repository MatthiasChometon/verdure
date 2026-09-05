import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// SSR (host), Codegen introspection (introspectionHost) and the browser
// (clientHost) only diverge under Docker — overridable via GQL_HOST/GQL_CLIENT_HOST.
const graphqlHost = process.env.GQL_HOST ?? 'http://localhost:3000/graphql';

// Prefer the versioned schema file (works with no API running); fall back to
// introspecting a reachable endpoint only when it's absent (e.g. front-only Docker).
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
            // Needed cross-domain (Netlify + o2switch, cookie is SameSite=None);
            // harmless when front and API share an origin.
            corsOptions: { mode: 'cors', credentials: 'include' },
          },
        },
      },
    },
  },
});
