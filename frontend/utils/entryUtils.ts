import {Entry} from "@/types/entryTypes";
import Database from "@/lib/database";
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

export type EntrySortField = "lastEditedAt" | "createdAt" | "date";

export function sortEntriesByDate(entries: Entry[], field: EntrySortField) {
    return entries.sort((first, second) => new Date(second[field]).getTime() - new Date(first[field]).getTime());
}

export async function isEntryEmpty(id: string, userId?: number) {
    const entry = await db.get(id, "reflections", userId)
    if (!entry) return Error("Entry not found");
    const normalizedEntry = normalizeEntry(entry);
    return normalizedEntry.content.length === 1 && normalizedEntry.content[0] === "" && normalizedEntry.title === "" && normalizedEntry.drawingPaths.length === 0
}

export async function createEmptyEntry(userId: number | null = null) {
    const curDate = new Date().toISOString();

    const initEntry: Entry = {
        id: crypto.randomUUID(),
        userId: userId ? userId : undefined,
        createdAt: curDate,
        lastEditedAt: curDate,
        syncStatus: "pending",
        title: "",
        content: [""],
        date: curDate,
        drawingPaths: []
    }

    await db.saveToLocalDB(initEntry, "reflections")
    return initEntry
}
