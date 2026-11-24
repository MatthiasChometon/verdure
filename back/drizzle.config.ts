import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// `generate` only diffs the schema files and never connects, so it must work
// without a database; every other command (migrate, studio) needs the URL and
// should say so rather than fail on an empty connection string.
const databaseUrl = (): string => {
  const url = process.env.DATABASE_URL;
  if (url !== undefined && url !== '') return url;
  if (process.argv.includes('generate')) return '';

  throw new Error('DATABASE_URL is required to reach the database.');
};

export default defineConfig({
  dialect: 'postgresql',
  schema: './domain/**/schema.ts',
  out: './infrastructure/database/migrations',
  dbCredentials: { url: databaseUrl() },
});
