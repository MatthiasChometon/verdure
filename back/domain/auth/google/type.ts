// Everything Google answers is checked before it is used.
export type TokenResponse = { access_token?: unknown };
export type UserinfoResponse = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};
