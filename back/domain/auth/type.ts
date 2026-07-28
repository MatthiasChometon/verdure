import type { User } from '../user/model';

export type Session = { user: User; token: string };
