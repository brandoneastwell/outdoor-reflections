export type Tokens = { access_token: string; refresh_token: string };

export type AccessTokenPayload = {
  sub: number;
  email: string;
};

export type RefreshTokenPayload = {
  sub: number;
  sid: string;
};

export type GoogleUser = {
  googleId: string;
  email: string;
  firstName?: string;
  lastName?: string;
};
