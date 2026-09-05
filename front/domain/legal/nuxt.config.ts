export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      // Config, not a translated string: same in every language, and vue-i18n reads
      // an address's @ as its own linked-message syntax, breaking it otherwise.
      legalContact: process.env.NUXT_PUBLIC_LEGAL_CONTACT ?? 'contact@luzi6802.odns.fr',
    },
  },
});
