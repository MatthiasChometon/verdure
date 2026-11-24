import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
  type DatabaseExecutor,
} from '../../infrastructure/database/token';
import { insertedRow } from '../../infrastructure/database/inserted-row';
import { UserMapper } from './mapper';
import { User } from './model';
import { user } from './schema';
import { GoogleProfile, NewPasswordUser, UserRecord } from './type';

@Injectable()
export class UserRepository {
  constructor(
    @Inject(DATABASE) private readonly database: Database,
    private readonly mapper: UserMapper,
  ) {}

  async findById(id: string): Promise<User | undefined> {
    const [found] = await this.database
      .select()
      .from(user)
      .where(eq(user.id, id));
    return found === undefined ? undefined : this.mapper.toModel(found);
  }

  // The user's own Pl@ntNet key (never mapped onto the User model, which only
  // exposes whether one is set), for the cloud identify path.
  async plantnetKeyOf(id: string): Promise<string | undefined> {
    const [row] = await this.database
      .select({ key: user.plantnetApiKey })
      .from(user)
      .where(eq(user.id, id));
    return row?.key ?? undefined;
  }

  async setPlantnetKey(id: string, key: string | null): Promise<void> {
    await this.database
      .update(user)
      .set({ plantnetApiKey: key })
      .where(eq(user.id, id));
  }

  // The user's UI language (never mapped onto the User model), used to localise
  // server-sent content such as push reminders. Falls back to 'fr'.
  async localeOf(id: string): Promise<string> {
    const [row] = await this.database
      .select({ locale: user.locale })
      .from(user)
      .where(eq(user.id, id));
    return row?.locale ?? 'fr';
  }

  async findByEmail(email: string): Promise<UserRecord | undefined> {
    const [found] = await this.database
      .select()
      .from(user)
      .where(eq(user.email, email));
    return found;
  }

  // Undefined when the email is already registered: the unique key decides, so
  // two concurrent sign-ups cannot both succeed.
  async createWithPassword(input: NewPasswordUser): Promise<User | undefined> {
    // emailVerifiedAt stays null: the account must be verified by email first.
    const [created] = await this.database
      .insert(user)
      .values({
        email: input.email,
        name: input.name,
        passwordHash: input.passwordHash,
        locale: input.locale,
      })
      .onConflictDoNothing({ target: user.email })
      .returning();
    return created === undefined ? undefined : this.mapper.toModel(created);
  }

  async markEmailVerified(
    id: string,
    executor: DatabaseExecutor = this.database,
  ): Promise<User | undefined> {
    const [verified] = await executor
      .update(user)
      .set({ emailVerifiedAt: sql`coalesce(${user.emailVerifiedAt}, now())` })
      .where(eq(user.id, id))
      .returning();
    return verified === undefined ? undefined : this.mapper.toModel(verified);
  }

  // Replaces the password of an account whose owner proved the address (the
  // reset link), so it also marks the email verified.
  async resetPassword(
    id: string,
    passwordHash: string,
    executor: DatabaseExecutor = this.database,
  ): Promise<User | undefined> {
    const [updated] = await executor
      .update(user)
      .set({
        passwordHash,
        emailVerifiedAt: sql`coalesce(${user.emailVerifiedAt}, now())`,
      })
      .where(eq(user.id, id))
      .returning();
    return updated === undefined ? undefined : this.mapper.toModel(updated);
  }

  // Sign-in with Google links onto the account owning the email when it already
  // exists (e.g. registered with a password first), otherwise creates one. One
  // statement, so two concurrent first sign-ins cannot collide on the email.
  async upsertByGoogleId(profile: GoogleProfile): Promise<User> {
    // Google has already verified the address, so the account is verified.
    const row = insertedRow(
      await this.database
        .insert(user)
        .values({
          googleId: profile.googleId,
          email: profile.email,
          name: profile.name,
          avatarUrl: profile.avatarUrl,
          emailVerifiedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: user.email,
          set: {
            googleId: profile.googleId,
            name: profile.name,
            avatarUrl: profile.avatarUrl,
            emailVerifiedAt: sql`coalesce(${user.emailVerifiedAt}, now())`,
          },
        })
        .returning(),
    );
    return this.mapper.toModel(row);
  }
}
