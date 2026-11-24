export type TokenResponse = { access_token: string };
export type UserinfoResponse = {
  sub: string;
  email: string;
  name: string;
  picture?: string;
};
