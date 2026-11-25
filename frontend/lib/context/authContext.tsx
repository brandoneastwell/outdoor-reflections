"use client";

import {createContext, ReactNode, useEffect, useState} from "react";
import {API_URL} from "@/constants/apiUrl";
import {useRouter} from "next/navigation";
import {readJsonError} from "@/lib/api/readResponse";
import {User} from "@/types/userTypes";
import type {Providers} from "@/types/authTypes";
import {SyncResponse} from "@/types/entryTypes";
import Database from "@/lib/database";
import {lockJournal} from "@/lib/vault/session";

const lastAccountKey = "outdoor-reflections.last-account";

type AuthContextType = {
    userId: number | null;
    accountReady: boolean;
    setUserId: (userId: number | null) => void;
    logout: () => void;
    login: (credentials: User) => Promise<{ message: string, id: number }>;
    refresh: () => Promise<Response>;
    loginWithProvider: (provider: Providers) => void;
    createAccount: (user: User) => Promise<{ message: string, id: number }>;
    syncPendingEntries: (authenticatedUserId?: number) => Promise<SyncResponse | undefined>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [userId, setAccountId] = useState<number | null>(null);
    const [accountReady, setAccountReady] = useState(false);

    function setUserId(id: number | null) {
        if (id === null) localStorage.removeItem(lastAccountKey);
        else localStorage.setItem(lastAccountKey, String(id));
        setAccountId(id);
    }
    const router = useRouter();

    useEffect(() => {
        async function loadUser() {
            try {
                if (!navigator.onLine) throw new Error("Offline");
                let res = await me()

                if (res.status === 401) {
                    const refreshRes = await refresh();
                    if (!refreshRes.ok) {
                        if (refreshRes.status >= 500) throw new Error("Account service unavailable");
                        setUserId(null);
                        return;
                    }

                    // Retry the original request after refreshing
                    res = await me()
                }

                if (!res.ok) {
                    if (res.status >= 500) throw new Error("Account service unavailable");
                    setUserId(null);
                    return;
                }

                const user: { id: number, email: string } = await res.json();
                setUserId(user.id);
            } catch {
                const cachedId = Number(localStorage.getItem(lastAccountKey));
                if (Number.isSafeInteger(cachedId) && cachedId > 0) setAccountId(cachedId);
            } finally {
                setAccountReady(true);
            }
        }

        loadUser();

    }, []);

    async function me() {
        return await fetch(`${API_URL}/auth/me`, {
            credentials: "include",
        });
    }

    async function refresh() {
        return fetch(`${API_URL}/auth/refresh`, {
            method: "POST",
            credentials: "include",
        });
    }

    async function login(credentials: User) {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify(credentials),
        });

        if (!res.ok) throw new Error(await readJsonError(res, "Unable to sign in"));
        const data: { message: string, id: number } = await res.json();
        setUserId(data.id);
        return data;
    }

    async function logout() {
        await fetch(`${API_URL}/auth/logout`, {
            method: "POST",
            credentials: "include",
        });

        lockJournal();
        setUserId(null);
        router.push("/auth");
    }

    async function loginWithProvider(provider: Providers) {
        window.location.href = `${API_URL}/auth/${provider}`;
    }

    async function createAccount(user: User) {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify(user),
        });

        if (!res.ok) throw new Error(await readJsonError(res, "Unable to create account"));
        const data: { message: string, id: number } = await res.json();
        return data;
    }

    async function syncPendingEntries(authenticatedUserId = userId ?? undefined): Promise<SyncResponse | undefined> {
        if (!authenticatedUserId) throw new Error("Logged out user cannot sync entries");

        const db = new Database();
        const pending = await db.getPendingRecords(authenticatedUserId);
        if (!pending.length) return;
        const entriesToSync = pending.map(({id, revision, lastEditedAt, deletedAt, payload}) =>
            ({id, revision, lastEditedAt, deletedAt, payload})
        );

        const res = await fetch(`${API_URL}/reflection/sync`, {
            credentials: "include",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(entriesToSync)
        })

        if (!res.ok) {
            if (res.status === 401) {
                throw new Error("Unauthorized")
            }
            throw new Error("Failed to sync entries")
        }

        const results: SyncResponse = await res.json()
        const synced_entries = await db.applySyncAcknowledgements(authenticatedUserId, results.synced_entries);
        return {...results, synced_entries};
    }

    return (
        <AuthContext.Provider value={{ userId, accountReady, setUserId, logout, login, refresh, loginWithProvider, createAccount, syncPendingEntries }}>
            {children}
        </AuthContext.Provider>
    );
}
