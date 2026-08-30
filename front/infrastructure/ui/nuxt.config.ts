export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxt/fonts'],
  // Self-hosted at build time (served same-origin) so the strict CSP allows them
  // and the PWA can serve them offline. Referenced via --font-sans/--font-display.
  fonts: {
    families: [
      { name: 'Figtree', provider: 'google', weights: [400, 500, 600, 700] },
      { name: 'Fraunces', provider: 'google', weights: [400, 500, 600, 700] },
    ],
  },
  app: {
    head: {
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
});
