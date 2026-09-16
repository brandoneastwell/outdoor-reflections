import type { Request, Response } from 'express';
import type { Tokens } from './types';

export function setAuthTokenInCookies(res: Response, token: Partial<Tokens>) {
  if (token.access_token) {
    res.cookie('access_token', token.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      path: '/',
    });
  }

  if (token.refresh_token) {
    res.cookie('refresh_token', token.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      path: '/',
    });
  }
}

export function getJWTFromCookie(req: Request): string | null {
  const accessToken: unknown = req.cookies?.['access_token'];
  return typeof accessToken === 'string' ? accessToken : null;
}

export function getRefreshTokenFromCookie(req: Request): string | undefined {
  const refreshToken: unknown = req.cookies?.['refresh_token'];
  return typeof refreshToken === 'string' ? refreshToken : undefined;
}
