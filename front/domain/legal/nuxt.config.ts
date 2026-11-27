// The legal pages are static text: their prerendered HTML ships without any script, so the
// browser neither downloads nor runs the app on them. Links to other pages are full loads.
const legalPaths = [
  '/conditions',
  '/confidentialite',
  '/mentions-legales',
  '/en/terms',
  '/en/privacy',
  '/en/legal-notice',
];

export default defineNuxtConfig({
  routeRules: Object.fromEntries(legalPaths.map((path: string) => [path, { noScripts: true }])),
  runtimeConfig: {
    public: {
      // Config, not a translated string: same in every language, and vue-i18n reads
      // an address's @ as its own linked-message syntax, breaking it otherwise.
      legalContact: process.env.NUXT_PUBLIC_LEGAL_CONTACT ?? 'contact@luzi6802.odns.fr',
    },
  },
});
