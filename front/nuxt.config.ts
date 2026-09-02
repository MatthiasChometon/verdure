import { buildDynamicLayers } from './infrastructure/ddd/buildDynamicLayers';

const { componentsList, cssList, layerConfigTsGlobList, layerList, typesDirList } =
  buildDynamicLayers();

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
  // Static host + strict CSP + offline PWA: there is no server icon route on
  // Netlify and the Iconify API is blocked by connect-src, so every icon SVG
  // must be embedded in the client build. `scan` collects the i-lucide-* names
  // used across the source, covering client-only icons (e.g. the sign-in
  // prompt's lock) that never appear in the prerendered HTML. The default scan
  // reads templates only; `.ts` is added so icons declared in a composable (the
  // account menu is built in useAccountMenu.ts) are bundled too — an unbundled
  // name renders blank under the CSP.
  icon: {
    clientBundle: {
      scan: {
        globInclude: ['**/*.{vue,jsx,tsx,ts,md,mdc,mdx}'],
        globExclude: ['node_modules', 'dist', '.output', '.nuxt'],
      },
      sizeLimitKb: 2048,
    },
  },
  pwa: {
    // No service worker in dev: dev never serves /sw.js, so the module would only
    // register a 404 and spam "No match found for /sw.js" router warnings. The
    // PWA is built and active for production/preview.
    disable: process.env.NODE_ENV !== 'production',
    registerType: 'autoUpdate',
    // injectManifest (not the default generateSW) so we own the service worker:
    // it precaches the built assets AND handles the 'push' event for watering
    // reminders. Source is infrastructure/pwa/sw.ts, compiled by the module.
    strategies: 'injectManifest',
    srcDir: 'infrastructure/pwa',
    filename: 'sw.ts',
    injectManifest: {
      // Only the built assets are precached. Pages are prerendered but
      // user-specific, so the SW adds no navigation route: navigations, GraphQL,
      // /auth and /images all keep going straight to the network.
      globPatterns: ['**/*.{js,css,ico,png,svg,webp,woff2}'],
    },
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
  },
  vite: {
    server: {
      // Docker's Windows/WSL2 bind mounts don't deliver native file events, so
      // HMR needs polling there. Enabled only when the container asks for it.
      watch: process.env.CHOKIDAR_USEPOLLING === 'true' ? { usePolling: true } : undefined,
    },
    build: {
      rollupOptions: {
        output: {
          // Split the vendor bundle along real library boundaries instead of
          // shipping one 500 kB+ chunk. Each group is independently cacheable
          // (a UI-only patch doesn't bust the i18n or GraphQL chunk) and the
          // browser downloads them in parallel. Anything unclassified falls back
          // to Nuxt's default chunking.
          manualChunks(id) {
            const path = id.replace(/\\/g, '/');
            if (!path.includes('/node_modules/')) {
              return;
            }
            if (/\/node_modules\/(@intlify|vue-i18n|@nuxtjs\/i18n)\//.test(path)) {
              return 'i18n';
            }
            if (/\/node_modules\/(reka-ui|@nuxt\/ui|tailwind-variants|@floating-ui)\//.test(path)) {
              return 'ui';
            }
            if (
              /\/node_modules\/(graphql|graphql-request|nuxt-graphql-client|ohash)\//.test(path)
            ) {
              return 'graphql';
            }
            if (/\/node_modules\/(@vue|vue|vue-router|@vueuse)\//.test(path)) {
              return 'vue';
            }
          },
        },
      },
    },
  },
  typescript: {
    strict: true,
    typeCheck: 'build',
    // The service worker is a webworker-lib module compiled separately by the PWA
    // module; keep it out of the app project so vue-tsc does not check it against
    // the DOM lib (its self/PushEvent/clients globals would conflict).
    tsConfig: {
      exclude: [...layerConfigTsGlobList, '../infrastructure/pwa/sw.ts'],
      compilerOptions: { incremental: true },
    },
    nodeTsConfig: { include: layerConfigTsGlobList, compilerOptions: { incremental: true } },
  },
});
