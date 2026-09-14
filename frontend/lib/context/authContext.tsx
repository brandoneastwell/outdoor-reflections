"use client";

import {createContext, ReactNode, useEffect, useState} from "react";
import {API_URL} from "@/constants/apiUrl";
import {useRouter} from "next/navigation";
import {readJsonError} from "@/lib/api/readResponse";
import {User} from "@/types/userTypes";
import type {Providers} from "@/types/authTypes";
import {SyncResponse} from "@/types/entryTypes";
import Database from "@/lib/database";

type AuthContextType = {
    userId: number | null;
    setUserId: (userId: number | null) => void;
    logout: () => void;
    login: (credentials: User) => any;
    refresh: () => any;
    loginWithProvider: (provider: Providers) => void;
    createAccount: (user: User) => any;
    syncPendingEntries: () => Promise<SyncResponse | undefined>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [userId, setUserId] = useState<number | null>(null);
    const router = useRouter();

    useEffect(() => {
        async function loadUser() {
            try {
                let res = await me()

                if (res.status === 401) {
                    const refreshRes = await refresh();
                    if (!refreshRes.ok) {
                        setUserId(null);
                        return;
                    }

                    // Retry the original request after refreshing
                    res = await me()
                }

                if (!res.ok) {
                    setUserId(null);
                    return;
                }

                const user: { id: number, email: string } = await res.json();
                setUserId(user.id);
            } catch(error) {
                setUserId(null);
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
        const data = await res.json();
        setUserId(data.id);
        return data;
    }

    async function logout() {
        await fetch(`${API_URL}/auth/logout`, {
            method: "POST",
            credentials: "include",
        });

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
        const data = await res.json();
        setUserId(data.id);
        return data;
    }

    async function syncPendingEntries(): Promise<SyncResponse | undefined> {
        if (!userId) throw new Error("Logged out user cannot sync entries");

        const db = new Database();
        const entries = await db.getAll('reflections')
        if (!entries) return;

        const entriesToSync = entries.filter(entry => entry.syncStatus === "pending" && entry.userId === userId)
        console.log(entriesToSync)

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
        console.log(results)
        return results
    }

    return (
        <AuthContext.Provider value={{ userId, setUserId, logout, login, refresh, loginWithProvider, createAccount, syncPendingEntries }}>
            {children}
        </AuthContext.Provider>
    );
}