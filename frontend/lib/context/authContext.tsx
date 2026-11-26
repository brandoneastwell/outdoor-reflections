"use client";

import {createContext, ReactNode, useCallback, useEffect, useRef, useState} from "react";
import {API_URL} from "@/constants/apiUrl";
import {useRouter} from "next/navigation";
import {readJsonError} from "@/lib/api/readResponse";
import {User} from "@/types/userTypes";
import type {Providers} from "@/types/authTypes";
import {SyncResponse} from "@/types/entryTypes";
import Database from "@/lib/database";
import {lockJournalEverywhere} from "@/lib/vault/encryption-session";
import {fetchAccountSettings, type AccountSettings} from "@/lib/api/accountSettings";
import {z} from "zod";

const lastAccountKey = "outdoor-reflections.last-account"; // name of localStorage entry, stores numeric ID of the last signed-in account
const syncAcknowledgements = z.array(z.object({
    id: z.string(),
    revision: z.string(),
    lastEditedAt: z.iso.datetime(),
    deletedAt: z.iso.datetime().nullish(),
}));

type AuthContextType = {
    userId: number | null;
    accountReady: boolean;
    accountSettings: AccountSettings | null;
    reloadAccountSettings: (signal?: AbortSignal) => void;
    updateCloudAi: (enabled: boolean) => Promise<void>;
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
    const [settings, setSettings] = useState<{accountId: number; value: AccountSettings} | null>(null);
    const settingsRequest = useRef(0);
    const accountSettings = settings && settings.accountId === userId ? settings.value : null;

    function setUserId(id: number | null, lockOnChange = true) {
        try {
            const previous = Number(localStorage.getItem(lastAccountKey));
            if (lockOnChange && previous > 0 && previous !== id) lockJournalEverywhere().catch(() => {});
            if (id === null) localStorage.removeItem(lastAccountKey);
            else localStorage.setItem(lastAccountKey, String(id));
        } catch {
            // Browser settings may prevent persistence of the offline account hint.
        }
        setAccountId(id);
    }
    const router = useRouter();

    useEffect(() => {
        async function loadUser() {
            try {
                if (!navigator.onLine) throw new Error("Offline");
                const signal = AbortSignal.timeout(5_000);
                let res = await me(signal);

                if (res.status === 401) {
                    const refreshRes = await refresh(signal);
                    if (!refreshRes.ok) {
                        if (refreshRes.status >= 500) throw new Error("Account service unavailable");
                        setUserId(null);
                        return;
                    }

                    // Retry the original request after refreshing
                    res = await me(signal);
                }

                if (!res.ok) {
                    if (res.status >= 500) throw new Error("Account service unavailable");
                    setUserId(null);
                    return;
                }

                const user: { id: number, email: string } = await res.json();
                setUserId(user.id);
            } catch {
                try {
                    const cachedId = Number(localStorage.getItem(lastAccountKey));
                    if (Number.isSafeInteger(cachedId) && cachedId > 0) setAccountId(cachedId);
                } catch {
                    // Without an offline account hint only local guest entries are available.
                }
            } finally {
                setAccountReady(true);
            }
        }

        loadUser();

    }, []);

    const reloadAccountSettings = useCallback((signal?: AbortSignal) => {
        if (!userId || !navigator.onLine) return;
        const requestId = ++settingsRequest.current;
        void fetchAccountSettings(signal).then(
            (value) => {
                if (!signal?.aborted && requestId === settingsRequest.current) setSettings({accountId: userId, value});
            },
            () => {
                if (!signal?.aborted && requestId === settingsRequest.current) setSettings(null);
            },
        );
    }, [userId]);

    useEffect(() => {
        const request = new AbortController();
        const loadSettings = () => reloadAccountSettings(request.signal);
        loadSettings();
        window.addEventListener("online", loadSettings);
        return () => {
            request.abort();
            window.removeEventListener("online", loadSettings);
        };
    }, [reloadAccountSettings]);

    async function updateCloudAi(enabled: boolean) {
        if (!userId) throw new Error("Sign in to change account settings.");
        const requestId = ++settingsRequest.current;
        if (!enabled) setSettings({accountId: userId, value: {cloudAiEnabled: false}});
        const value = await fetchAccountSettings(undefined, {cloudAiEnabled: enabled});
        if (requestId === settingsRequest.current) setSettings({accountId: userId, value});
    }

    async function me(signal: AbortSignal) {
        return await fetch(`${API_URL}/auth/me`, {
            credentials: "include",
            signal,
        });
    }

    async function refresh(signal?: AbortSignal) {
        return fetch(`${API_URL}/auth/refresh`, {
            method: "POST",
            credentials: "include",
            signal,
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
        await Promise.all([
            lockJournalEverywhere().catch(() => {}),
            fetch(`${API_URL}/auth/logout`, {method: "POST", credentials: "include"}),
        ]);
        setUserId(null, false);
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
        const synced_entries = await db.applySyncAcknowledgements(
            authenticatedUserId,
            syncAcknowledgements.parse(results.synced_entries),
        );
        return {...results, synced_entries};
    }

    return (
        <AuthContext.Provider value={{ userId, accountReady, accountSettings, reloadAccountSettings, updateCloudAi, setUserId, logout, login, refresh, loginWithProvider, createAccount, syncPendingEntries }}>
            {children}
        </AuthContext.Provider>
    );
}
