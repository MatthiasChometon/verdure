import { insertedRow } from '../../infrastructure/database/inserted-row';
import { type Database } from '../../infrastructure/database/token';
import { user } from './schema';

// A Google-linked, verified-by-construction account for e2e suites that need a
// signed-in person: the one place a test seeds a user, so a new required column
// is added here once instead of in every harness.
export const insertTestUser = async (
  database: Database,
  name: string,
): Promise<{ id: string }> =>
  insertedRow(
    await database
      .insert(user)
      .values({
        googleId: `google-${name}`,
        email: `${name}@test.dev`,
        name,
        avatarUrl: null,
      })
      .returning({ id: user.id }),
  );
