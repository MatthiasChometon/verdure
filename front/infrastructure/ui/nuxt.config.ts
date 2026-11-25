export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxt/fonts'],
  // Only the components the app uses get a theme in the stylesheet: the whole
  // library is 1800 rules, which is seconds of render-blocking work on the slow
  // phone the LCP budget is measured on.
  ui: { experimental: { componentDetection: true } },
  app: {
    head: {
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
});
