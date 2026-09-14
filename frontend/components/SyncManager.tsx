"use client"
import {useEffect} from "react";
import {syncPendingEntries} from "@/lib/api/reflections";

async function syncEntries() {
    try {
        await syncPendingEntries();
    } catch (error) {
        console.error(error);
    }
}

export default function SyncManager() {

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