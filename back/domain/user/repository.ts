import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../infrastructure/database/token';
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

  async findByEmail(email: string): Promise<UserRecord | undefined> {
    const [found] = await this.database
      .select()
      .from(user)
      .where(eq(user.email, email));
    return found;
  }

  async createWithPassword(input: NewPasswordUser): Promise<User> {
    // emailVerifiedAt stays null: the account must be verified by email first.
    const [created] = await this.database
      .insert(user)
      .values({
        email: input.email,
        name: input.name,
        passwordHash: input.passwordHash,
        locale: input.locale,
      })
      .returning();
    return this.mapper.toModel(created);
  }

  async markEmailVerified(id: string): Promise<void> {
    await this.database
      .update(user)
      .set({ emailVerifiedAt: new Date() })
      .where(eq(user.id, id));
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.database
      .update(user)
      .set({ passwordHash })
      .where(eq(user.id, id));
  }

  // Sign-in with Google links onto the account owning the email when it already
  // exists (e.g. registered with a password first), otherwise creates one.
  async upsertByGoogleId(profile: GoogleProfile): Promise<User> {
    // Google has already verified the address, so the account is verified.
    const existing = await this.findByEmail(profile.email);
    if (existing !== undefined) {
      const [linked] = await this.database
        .update(user)
        .set({
          googleId: profile.googleId,
          name: profile.name,
          avatarUrl: profile.avatarUrl,
          emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
        })
        .where(eq(user.id, existing.id))
        .returning();
      return this.mapper.toModel(linked);
    }

    const [created] = await this.database
      .insert(user)
      .values({
        googleId: profile.googleId,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
        emailVerifiedAt: new Date(),
      })
      .returning();
    return this.mapper.toModel(created);
  }
}
