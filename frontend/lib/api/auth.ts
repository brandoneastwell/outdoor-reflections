import {API_URL} from "@/constants/apiUrl";
import type {User} from "@/types/userTypes";
import type {Providers} from "@/types/authTypes";
import {readJsonError} from "@/lib/api/readResponse";


export async function login(user: User) {
    const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(user),
    });

    if (!res.ok) throw new Error(await readJsonError(res, "Unable to sign in"));
    return (await res.json());
}

export async function createAccount(user: User) {
    const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(user),
    });

    if (!res.ok) throw new Error(await readJsonError(res, "Unable to create account"));
    return (await res.json());
}

export function loginWithProvider(provider: Providers): void {
    window.location.href = `${API_URL}/auth/${provider}`;
}

export function refresh() {
    return fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
    });
}

export async function me() {
    return await fetch(`${API_URL}/auth/me`, {
        credentials: "include",
    });
}

export async function forgotPassword(email: string) {
    const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({email}),
    })

    if (!res.ok) throw new Error(await readJsonError(res, "Unable to send reset password email"));
    return (await res.json());
}

export async function resetPassword(token: string, password: string) {
    const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ password, token }),
    })

    if (!res.ok) throw new Error(await readJsonError(res, "Unable to change your password"));
    return (await res.json());
}

