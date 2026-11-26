import type {EncryptedEntry, Entry, SyncAcknowledgement} from "@/types/entryTypes";
import {decryptJson, encryptJson} from "@/lib/vault/crypto";
import {requireJournalKey} from "@/lib/vault/encryption-session";
import {z} from "zod";

type DBName = "reflections";
const entryContent = z.object({
    title: z.string(),
    content: z.array(z.string()),
    date: z.string(),
    createdAt: z.string(),
    drawingPaths: z.array(z.object({path: z.string(), color: z.string()})),
});

function entryContext({id, userId, revision, lastEditedAt}: EncryptedEntry) {
    return JSON.stringify(["outdoor/entry/v1", id, userId ?? null, revision, lastEditedAt]);
}

async function decryptEntry(record: EncryptedEntry, key: CryptoKey): Promise<Entry> {
    if (!record.payload || record.payload.version !== 1) throw new Error("Invalid encrypted reflection");
    const data = entryContent.parse(await decryptJson(key, record.payload, entryContext(record)));
    const {id, userId, syncStatus, lastEditedAt} = record;
    return {...data, id, userId, syncStatus, lastEditedAt};
}

export default class Database {
    private openDB(name: DBName): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(`${name}-encrypted-db`, 1);
            let blocked = false;
            request.onupgradeneeded = () => request.result.createObjectStore(name, {keyPath: "id"});
            request.onerror = () => reject(request.error);
            request.onblocked = () => {
                blocked = true;
                reject(new Error("Journal storage is blocked by another tab."));
            };
            request.onsuccess = () => {
                const database = request.result;
                database.onversionchange = () => database.close();
                if (blocked) database.close();
                else resolve(database);
            };
        });
    }

    private async transaction<T>(
        name: DBName,
        mode: IDBTransactionMode,
        run: (store: IDBObjectStore, result: (value: T) => void) => void,
    ): Promise<T> {
        const db = await this.openDB(name);
        try {
            return await new Promise<T>((resolve, reject) => {
                const transaction = db.transaction(name, mode);
                let result: T;
                transaction.oncomplete = () => resolve(result);
                transaction.onabort = () => reject(transaction.error ?? new Error("Journal storage transaction aborted."));
                run(transaction.objectStore(name), (value) => { result = value; });
            });
        } finally {
            db.close();
        }
    }

    private readAll(name: DBName) {
        return this.transaction<EncryptedEntry[]>(name, "readonly", (store, result) => {
            const request = store.getAll();
            request.onsuccess = () => result(request.result);
        });
    }

    async getAll(name: DBName, userId?: number): Promise<Entry[]> {
        const key = requireJournalKey();
        const records = await this.readAll(name);
        return Promise.all(records.filter((record) => !record.deletedAt && record.userId === userId)
            .map((record) => decryptEntry(record, key)));
    }

    async get(id: string, name: DBName, userId?: number): Promise<Entry | undefined> {
        const key = requireJournalKey();
        const record = await this.transaction<EncryptedEntry | undefined>(name, "readonly", (store, result) => {
            const request = store.get(id);
            request.onsuccess = () => result(request.result);
        });
        if (record && !record.deletedAt && record.userId === userId) return decryptEntry(record, key);
    }

    async getPendingRecords(userId: number): Promise<EncryptedEntry[]> {
        return (await this.readAll("reflections")).filter((entry) =>
            entry.userId === userId && entry.syncStatus === "pending"
        );
    }

    async saveToLocalDB(entry: Entry, name: DBName): Promise<IDBValidKey | undefined> {
        try {
            const key = requireJournalKey();
            const {id, userId, syncStatus, lastEditedAt, deletedAt, title, content, date, createdAt, drawingPaths} = entry;
            const record: EncryptedEntry = {
                id, userId, syncStatus, lastEditedAt, deletedAt,
                revision: crypto.randomUUID(),
                payload: null,
            };
            if (!deletedAt) {
                const data = await encryptJson(key, {title, content, date, createdAt, drawingPaths}, entryContext(record));
                record.payload = {version: 1, ...data};
            }

            return await this.transaction<IDBValidKey | undefined>(name, "readwrite", (store, result) => {
                const read = store.get(id);
                read.onsuccess = () => {
                    const existing: EncryptedEntry | undefined = read.result;
                    if (existing?.deletedAt ||
                        (existing?.userId !== undefined && existing.userId !== userId) ||
                        (existing && !deletedAt && existing.lastEditedAt > lastEditedAt)) {
                        result(undefined);
                        return;
                    }
                    const write = store.put(record);
                    write.onsuccess = () => result(write.result);
                };
            });
        } catch {
            return undefined;
        }
    }

    async applySyncAcknowledgements(userId: number, acknowledgements: SyncAcknowledgement[]) {
        return this.transaction<SyncAcknowledgement[]>("reflections", "readwrite", (store, result) => {
            const applied: SyncAcknowledgement[] = [];
            result(applied);
            for (const acknowledgement of acknowledgements) {
                const read = store.get(acknowledgement.id);
                read.onsuccess = () => {
                    const existing: EncryptedEntry | undefined = read.result;
                    if (!existing || existing.userId !== userId) return;

                    if (acknowledgement.deletedAt) {
                        store.put({
                            ...existing,
                            revision: acknowledgement.revision,
                            lastEditedAt: acknowledgement.lastEditedAt,
                            deletedAt: acknowledgement.deletedAt,
                            syncStatus: "synced",
                            payload: null,
                        });
                    } else if (!existing.deletedAt && existing.revision === acknowledgement.revision) {
                        store.put({...existing, syncStatus: "synced"});
                    } else {
                        return;
                    }
                    applied.push(acknowledgement);
                };
            }
        });
    }
}
