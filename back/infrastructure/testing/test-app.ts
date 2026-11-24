import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { AppModule } from '../../app.module';
import { DATABASE, type Database } from '../database/token';
import { configureApp, createAdapter } from '../http/setup';

// A provider replaced by a stand-in: only the real boundaries (an external API,
// the object store) are ever replaced, never our own services.
export type ProviderOverride = { provide: unknown; useValue: unknown };

export type TestApp = { app: NestFastifyApplication; database: Database };

// The whole application, wired by the very same `configureApp` as production
// (pipes, filters, cookies, multipart), on the migrated test database.
export const bootTestApp = async (
  overrides: ProviderOverride[] = [],
): Promise<TestApp> => {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  for (const { provide, useValue } of overrides) {
    builder = builder.overrideProvider(provide).useValue(useValue);
  }
  const moduleFixture = await builder.compile();

  const app =
    moduleFixture.createNestApplication<NestFastifyApplication>(
      createAdapter(),
    );
  await configureApp(app);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  const database = app.get<Database>(DATABASE);
  await migrate(database, {
    migrationsFolder: 'infrastructure/database/migrations',
  });

  return { app, database };
};
