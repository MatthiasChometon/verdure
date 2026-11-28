export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxt/fonts'],
  // A theme only for the Nuxt UI components the app uses, not the whole library.
  ui: { experimental: { componentDetection: true } },
  app: {
    head: {
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
});
