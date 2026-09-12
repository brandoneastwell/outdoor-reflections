import {Entry} from "@/types/entryTypes";
import Database from "@/lib/database";
import {useAuth} from "@/lib/context/auth";
const db = new Database();

export function normalizeEntryContent(content: string | string[] | undefined) {
    if (Array.isArray(content)) return content;
    if (typeof content === "string") {
        return content.length > 0 ? content.split("\n") : [""];
    }
    return [""];
}

export function normalizeEntry(entry: Entry | (Omit<Entry, "content"> & { content?: string | string[] })) : Entry {
    return {
        ...entry,
        content: normalizeEntryContent(entry.content),
    };
}

export function sortEntriesByLastUpdated(entries: Entry[])  {
    return entries.sort((a,b) => {
        return new Date(b.last_edited_at).getTime() - new Date(a.last_edited_at).getTime()
    })
}

export async function isEntryEmpty(id: string) {
    const entry = await db.get(id, "reflections")
    if (!entry) return Error("Entry not found");
    const normalizedEntry = normalizeEntry(entry);
    return normalizedEntry.content.length === 1 && normalizedEntry.content[0] === "" && normalizedEntry.title === "" && normalizedEntry.drawings.length === 0
}

export async function createEmptyEntry() {
    const curDate = new Date().toISOString();
    const user = useAuth()

    const initEntry: Entry = {
        id: crypto.randomUUID(),
        user_id: user.userId ? user.userId : undefined,
        created_at: curDate,
        last_edited_at: curDate,
        sync_status: "pending",
        updated_at: curDate,
        title: "",
        content: [""],
        date: curDate,
        drawings: []
    }

    await db.saveToLocalDB(initEntry, "reflections")
    return initEntry
}
