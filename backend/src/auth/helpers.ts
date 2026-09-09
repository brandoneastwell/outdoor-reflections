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

export function getTokensFromCookie(req) {
    if (req && req.cookies) {
        return {refresh_token: req.cookies['refresh_token'], access_token: req.cookies['access_token']};
    }
    return null;
}