import { user } from './schema';

export type UserRecord = typeof user.$inferSelect;

export type GoogleProfile = {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
};

export type NewPasswordUser = {
  email: string;
  name: string;
  passwordHash: string;
  locale: string;
};
