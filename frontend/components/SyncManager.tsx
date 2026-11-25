"use client";

import {useEffect} from "react";
import {useAuth} from "@/lib/context/auth";
import Database from "@/lib/database";

const db = new Database();

export default function SyncManager() {
    const {userId, syncPendingEntries, refresh} = useAuth();

    useEffect(() => {
        if (!userId) return;
        const accountId = userId;
        let cancelled = false;

        async function syncEntries() {
            try {
                await syncPendingEntries();
            } catch (error) {
                if (!(error instanceof Error) || error.message !== "Unauthorized") return;

                try {
                    const response = await refresh();
                    if (response.ok && !cancelled) await syncPendingEntries();
                } catch {
                    // Unacknowledged changes remain pending for the next sync.
                }
            }
        }

        async function retryQueuedDeletions() {
            if (!navigator.onLine) return;
            try {
                const entries = await db.getPendingRecords(accountId);
                if (!cancelled && entries.some((entry) => entry.deletedAt)) {
                    await syncEntries();
                }
            } catch {
                // An online event can retry the queue later.
            }
        }

        void retryQueuedDeletions();
        window.addEventListener("online", syncEntries);
        return () => {
            cancelled = true;
            window.removeEventListener("online", syncEntries);
        };
    }, [userId, syncPendingEntries, refresh]);

    return null;
}
