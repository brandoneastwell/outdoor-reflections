type RememberedJournalKey = {
    key: CryptoKey;
    vaultSalt: string;
    lockToken: string | null;
    expiresAt: number;
};

async function runKeyRequest<T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("outdoor-reflections-browser-unlock", 1);
        let blocked = false;
        request.onupgradeneeded = () => request.result.createObjectStore("keys");
        request.onerror = () => reject(request.error);
        request.onblocked = () => {
            blocked = true;
            reject(new Error("Browser unlock storage is blocked."));
        };
        request.onsuccess = () => {
            const database = request.result;
            database.onversionchange = () => database.close();
            if (blocked) database.close();
            else resolve(database);
        };
    });

    try {
        return await new Promise<T>((resolve, reject) => {
            const transaction = db.transaction("keys", mode);
            const request = run(transaction.objectStore("keys"));
            transaction.oncomplete = () => resolve(request.result);
            transaction.onabort = () => reject(transaction.error ?? new Error("Browser unlock storage failed."));
        });
    } finally {
        db.close();
    }
}

export function readRememberedKey(): Promise<RememberedJournalKey | undefined> {
    return runKeyRequest("readonly", (store) => store.get("journal"));
}

export function writeRememberedKey(record: RememberedJournalKey) {
    return runKeyRequest("readwrite", (store) => store.put(record, "journal"));
}

export function deleteRememberedKey() {
    return runKeyRequest("readwrite", (store) => store.delete("journal"));
}
