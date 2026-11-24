export type TokenResponse = { access_token: string };
export type UserinfoResponse = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};
