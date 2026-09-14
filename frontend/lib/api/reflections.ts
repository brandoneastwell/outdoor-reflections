import {API_URL} from "@/constants/apiUrl";
import {SyncResponse} from "@/types/entryTypes";
import Database from "@/lib/database";

const db = new Database();

export async function syncPendingEntries(): Promise<SyncResponse | undefined> {
    const entries = await db.getAll('reflections')
    if (!entries) return;

    const entriesToSync = entries.map(entry => entry.sync_status = "pending")

    const res = await fetch(`${API_URL}/reflection/sync`, {
        credentials: "include",
        method: "POST",
        body: JSON.stringify(entriesToSync)
    })

    if (!res.ok) throw new Error("Failed to sync entries")
    const results: SyncResponse = await res.json()
    console.log(results)
    return results
}