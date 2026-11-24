import { GoogleProfile } from '../../user/type';

// Stands in for Google so the sign-in tests stay deterministic and offline:
// `outcome` is the profile Google would return, or the error it would raise.
export class GoogleStub {
  outcome: GoogleProfile | Error = {
    googleId: 'google-stub',
    email: 'stub@auth.test',
    name: 'Stub',
    avatarUrl: null,
  };

  authorizationUrl(state: string): string {
    return `https://accounts.google.test/auth?state=${state}`;
  }

  fetchProfile(): Promise<GoogleProfile> {
    return this.outcome instanceof Error
      ? Promise.reject(this.outcome)
      : Promise.resolve(this.outcome);
  }
}
