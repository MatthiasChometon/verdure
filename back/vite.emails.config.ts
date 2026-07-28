import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

// Compiles the Vue email templates (domain/auth/emails) into a self-contained
// CJS bundle the NestJS back loads at runtime. Run via `pnpm build:emails`.
export default defineConfig({
  plugins: [vue()],
  build: {
    ssr: 'domain/auth/emails/render.ts',
    outDir: 'domain/auth/emails/dist',
    emptyOutDir: true,
    rollupOptions: {
      output: { format: 'cjs', entryFileNames: 'render.cjs' },
    },
  },
});
