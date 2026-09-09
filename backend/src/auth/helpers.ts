export function setTokensInCookie(res: any, token: any) {
    res.cookie('access_token', token.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
    });

    res.cookie('refresh_token', token.refresh_token, {
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