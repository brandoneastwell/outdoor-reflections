"use client"
import {useEffect} from "react";
import {syncPendingEntries} from "@/lib/api/reflections";
import {useAuth} from "@/lib/context/auth";

export default function SyncManager() {
    const user = useAuth()

    async function syncEntries() {
        try {
            await syncPendingEntries();
        } catch (error) {
            const res = await user.refresh()
            if (!res.ok) {
                console.warn("Unauthorized to sync entries");
                return;
            }

            try {
                await syncPendingEntries();
            } catch (error) {
                console.error(error);
            }
        }
    }

    useEffect(() => {
        window.addEventListener("online", syncEntries);
        window.addEventListener("offline", syncEntries);
        return () => {
            window.removeEventListener("online", syncEntries);
            window.removeEventListener("offline", syncEntries);
        };
    }, []);

    return null;
}