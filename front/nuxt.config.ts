import { componentsList, cssList, layerConfigTsGlobList, layerList, typesDirList } from './ddd';

export default defineNuxtConfig({
  extends: layerList,
  compatibilityDate: '2026-07-13',
  // PWA: makes the front installable on the iPhone home screen (fullscreen app
  // icon). The AI + back stay on the PC; the phone is a thin client over LAN.
  // iOS ignores the manifest for these, so they stay hand-written.
  app: {
    head: {
      link: [{ rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }],
      meta: [
        { name: 'theme-color', content: '#16a34a' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'verdure' },
      ],
    },
  },
  devtools: { enabled: process.env.NODE_ENV === 'development' },
  devServer: { port: Number(process.env.PORT) || 3001 },
  srcDir: '.',
  pages: true,
  ignore: ['**/*.test.ts'],
  // The PWA module registers a virtual module Vitest cannot resolve, so it is
  // left out of the test run.
  modules: ['@nuxt/eslint', '@vueuse/nuxt', ...(process.env.VITEST ? [] : ['@vite-pwa/nuxt'])],
  css: cssList,
  components: componentsList,
  imports: { dirs: typesDirList },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'verdure',
      short_name: 'verdure',
      description: 'Ma collection de plantes',
      lang: 'fr',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#f8fafc',
      theme_color: '#16a34a',
      icons: [
        { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      // Only the built assets are precached. Pages are server-rendered and
      // user-specific, so no navigateFallback: navigations, GraphQL, /auth and
      // /images keep going straight to the network.
      globPatterns: ['**/*.{js,css,ico,png,svg,webp,woff2}'],
      cleanupOutdatedCaches: true,
    },
  },
  vite: {
    server: {
      // Docker's Windows/WSL2 bind mounts don't deliver native file events, so
      // HMR needs polling there. Enabled only when the container asks for it.
      watch: process.env.CHOKIDAR_USEPOLLING === 'true' ? { usePolling: true } : undefined,
    },
  },
  typescript: {
    strict: true,
    typeCheck: 'build',
    tsConfig: { exclude: layerConfigTsGlobList, compilerOptions: { incremental: true } },
    nodeTsConfig: { include: layerConfigTsGlobList, compilerOptions: { incremental: true } },
  },
});
