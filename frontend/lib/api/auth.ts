import {API_URL} from "@/constants/apiUrl";
import type {User} from "@/types/userTypes";
import type {Providers} from "@/types/authTypes";
import {readJsonError} from "@/lib/api/readResponse";

type AuthTokenResponse = {
    access_token: string;
    refresh_token: string;
};

export async function login(user: User): Promise<AuthTokenResponse> {
    const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(user),
    });

    if (!res.ok) throw new Error(await readJsonError(res, "Unable to sign in"));
    return (await res.json()) as AuthTokenResponse;
}

export async function createAccount(user: User): Promise<AuthTokenResponse> {
    const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(user),
    });

    if (!res.ok) throw new Error(await readJsonError(res, "Unable to create account"));
    return (await res.json()) as AuthTokenResponse;
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

