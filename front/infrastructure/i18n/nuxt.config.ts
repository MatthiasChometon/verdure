import { buildDynamicLayers } from '../ddd/buildDynamicLayers';

const { translationFileList } = buildDynamicLayers();

export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],
  i18n: {
    baseUrl: process.env.NUXT_PUBLIC_I18N_BASE_URL ?? 'http://localhost:3001',
    defaultLocale: 'fr',
    strategy: 'prefix_except_default',
    locales: [
      { code: 'fr', language: 'fr-FR', name: 'Français', files: translationFileList('fr') },
      { code: 'en', language: 'en-US', name: 'English', files: translationFileList('en') },
    ],
    // Every message comes from a layer's translation JSON, compiled to a message function at build
    // time (`compilation` is the module's JIT default): the runtime-only build of vue-i18n is
    // enough, and the message compiler is dropped from the client bundle.
    bundle: { runtimeOnly: true, dropMessageCompiler: true },
    detectBrowserLanguage: { useCookie: true, cookieKey: 'i18n_redirected', redirectOn: 'root' },
  },
});
