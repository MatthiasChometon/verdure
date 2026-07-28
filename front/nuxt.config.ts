import { componentsList, cssList, layerConfigTsGlobList, layerList, typesDirList } from './ddd';

export default defineNuxtConfig({
  extends: layerList,
  compatibilityDate: '2026-07-13',
  devtools: { enabled: process.env.NODE_ENV === 'development' },
  devServer: { port: Number(process.env.PORT) || 3001 },
  srcDir: '.',
  pages: true,
  ignore: ['**/*.test.ts'],
  modules: ['@nuxt/eslint', '@vueuse/nuxt'],
  css: cssList,
  components: componentsList,
  imports: { dirs: typesDirList },
  vite: {
    server: {
      // Docker's Windows/WSL2 bind mounts don't deliver native file events, so
      // HMR needs polling there. Enabled only when the container asks for it.
      watch:
        process.env.CHOKIDAR_USEPOLLING === 'true' ? { usePolling: true } : undefined,
    },
  },
  typescript: {
    strict: true,
    typeCheck: 'build',
    tsConfig: { exclude: layerConfigTsGlobList, compilerOptions: { incremental: true } },
    nodeTsConfig: { include: layerConfigTsGlobList, compilerOptions: { incremental: true } },
  },
});
