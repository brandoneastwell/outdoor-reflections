import {useEffect, useRef, useState} from "react";
import Database from "@/lib/database";
import {useAuth} from "@/lib/context/auth";
import type {Entry, SyncStatus} from "@/types/entryTypes";
import type {StateSetter} from "@/utils/entryContext";
import {isEntryBlank} from "./isEntryBlank";

const db = new Database();

export function useEntryPersistence(entry: Entry, setEntry: StateSetter<Entry>) {
    const [syncPopupVisible, setSyncPopupVisible] = useState(false);
    const [syncStatus, setSyncStatus] = useState<SyncStatus | "syncing">(entry.syncStatus);
    const user = useAuth();
    const isFirstRender = useRef(true);
    const latestEntryRef = useRef<Entry>(entry);
    const editableEntryKey = JSON.stringify([
        entry.title,
        entry.content,
        entry.date,
        entry.drawingPaths,
        entry.id
    ]);

    useEffect(() => {
        latestEntryRef.current = entry;
    }, [entry]);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return
        }

        if (isEntryBlank(latestEntryRef.current)) return;

        const saveTimeout = setTimeout(async () => {
            const entryToSave: Entry = {...latestEntryRef.current, syncStatus: "pending", lastEditedAt: new Date().toISOString()};
            if (await db.saveToLocalDB(entryToSave, "reflections") === undefined) {
                setSyncStatus("failed");
                return;
            }
            setEntry((previous: Entry) => ({...previous, syncStatus: "pending", lastEditedAt: entryToSave.lastEditedAt}));
            setSyncStatus("pending");
        }, 1000);

        const syncTimeout = setTimeout(async () => {
            if (latestEntryRef.current.syncStatus === "synced") return;
            setSyncStatus("syncing");
            let syncedEntries;

            try {
                syncedEntries = await user.syncPendingEntries();
            } catch (error) {
                if (error instanceof Error && error.message === "Unauthorized") {
                    const res = await user.refresh()
                    if (!res.ok) {
                        console.warn("Unauthorized to sync entries");
                        setSyncPopupVisible(true);
                        return;
                    }

                    try {
                        syncedEntries = await user.syncPendingEntries();
                    } catch (error) {
                        console.error(error);
                    }
                }
            } finally {
                if (syncedEntries?.synced_entries.some((cur) => cur.id === entry.id &&
                    !cur.deletedAt && (!cur.lastEditedAt || cur.lastEditedAt === latestEntryRef.current.lastEditedAt))) {
                    setEntry((prevEntry: Entry) => ({...prevEntry, syncStatus: "synced"}));
                    setSyncStatus("synced");
                }
                else setSyncStatus("pending");
            }
        }, 15000);

        return () => {
            clearTimeout(saveTimeout);
            clearTimeout(syncTimeout);
        };
    }, [editableEntryKey])

    return {
        syncStatus,
        syncPopupVisible,
        dismissSyncPopup: () => setSyncPopupVisible(false),
    };
}
