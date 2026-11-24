// Brand fonts, self-hosted at build time by @nuxt/fonts (served same-origin so the strict
// CSP allows them and the PWA can serve them offline). Referenced via
// --font-sans/--font-display in style/main.css.
export default defineNuxtConfig({
  fonts: {
    families: [
      { name: 'Figtree', provider: 'google', weights: [400, 500, 600, 700] },
      { name: 'Fraunces', provider: 'google', weights: [400, 500, 600, 700] },
    ],
  },
});
