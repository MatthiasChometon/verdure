// The GraphQL endpoint is reached from three different vantage points, which
// only diverge under Docker (locally they all fall back to localhost:3000):
//   - host              : server-side (SSR) requests, overridden by GQL_HOST
//   - introspectionHost : GraphQL Codegen introspection at build/prepare time
//   - clientHost        : browser requests (must resolve from the user's machine)
// In Docker, compose passes GQL_HOST=http://back:3000/graphql (container network)
// and GQL_CLIENT_HOST=http://localhost:3000/graphql (published port).
const graphqlHost = process.env.GQL_HOST ?? 'http://localhost:3000/graphql';

export default defineNuxtConfig({
  modules: ['nuxt-graphql-client'],
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? 'http://localhost:3000',
      // Prod (behind Caddy): the browser calls the back on its own origin.
      apiSameOrigin: process.env.NUXT_PUBLIC_API_SAME_ORIGIN === 'true',
      'graphql-client': {
        clients: {
          default: {
            host: graphqlHost,
            introspectionHost: process.env.GQL_INTROSPECTION_HOST ?? graphqlHost,
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
