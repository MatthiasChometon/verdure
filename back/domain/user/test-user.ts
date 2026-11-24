import { insertedRow } from '../../infrastructure/database/inserted-row';
import { type Database } from '../../infrastructure/database/token';
import { user } from './schema';

// A Google-linked, verified account (emailVerifiedAt set) for e2e suites that
// need a signed-in person. Meant to be the one place a test seeds a user; for now
// only the species harness uses it, the others are listed in the journal to adopt it.
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
        emailVerifiedAt: new Date(),
      })
      .returning({ id: user.id }),
  );
