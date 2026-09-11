export function setAuthTokenInCookies(res: any, token: { access_token?: string, refresh_token?: string}) {
    token.access_token && res.cookie('access_token', token.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
    });

    token.refresh_token && res.cookie('refresh_token', token.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
    });
}

export function getJWTFromCookie(req) {
    if (req && req.cookies) {
        return req.cookies['access_token'];
    }
    return null;
}