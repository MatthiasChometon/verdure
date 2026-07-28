import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './domain/**/schema.ts',
  out: './infrastructure/database/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
