"use client";

import {createContext, ReactNode, useEffect, useState} from "react";
import {API_URL} from "@/constants/apiUrl";
import {refresh} from "@/lib/api/auth";
import {useRouter} from "next/navigation";

type AuthContextType = {
    userId: number | null;
    setUserId: (userId: number | null) => void;
    logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [userId, setUserId] = useState<number | null>(null);
    const router = useRouter();

    useEffect(() => {
        async function loadUser() {
            try {
                let res = await fetch(`${API_URL}/auth/me`, {
                    credentials: "include",
                });

                if (res.status === 401) {
                    const refreshRes = await refresh();
                    if (!refreshRes.ok) {
                        setUserId(null);
                        return;
                    }

                    // Retry the original request after refreshing
                    res = await fetch(`${API_URL}/auth/me`, {
                        credentials: "include",
                    });
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

    async function logout() {
        await fetch(`${API_URL}/auth/logout`, {
            method: "POST",
            credentials: "include",
        });

        setUserId(null);
        router.push("/auth");
    }

    return (
        <AuthContext.Provider value={{ userId, setUserId, logout }}>
            {children}
        </AuthContext.Provider>
    );
}