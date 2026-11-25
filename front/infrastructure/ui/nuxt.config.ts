export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxt/fonts'],
  app: {
    head: {
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
});
