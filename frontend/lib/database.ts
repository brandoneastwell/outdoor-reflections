import {Entry} from "@/types/entryTypes";

type DBNames = 'reflections'
type DBTypes = Entry

export default class Database {
    openDB(name: DBNames): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(`${name}-db`, 1);
            let settled = false;

            request.onupgradeneeded = () => {
                const database = request.result;
                if (!database.objectStoreNames.contains(name)) {
                    database.createObjectStore(name, {
                        keyPath: "id",
                    });
                }
            };

            request.onerror = () => {
                settled = true;
                reject(request.error ?? new Error(`Failed to open ${name} database`));
            };

            request.onsuccess = () => {
                const database = request.result;

                // Allow DevTools, another tab, or a future migration to delete or
                // upgrade the database instead of leaving that request blocked.
                database.onversionchange = () => database.close();

                if (settled) {
                    database.close();
                    return;
                }

                settled = true;
                resolve(database);
            };

            request.onblocked = () => {
                if (settled) return;
                settled = true;
                reject(new Error(
                    `Opening ${name} database was blocked. Close other tabs using this app and try again.`
                ));
            };
        })
    }

    async getAll(name: DBNames): Promise<DBTypes[] | undefined> {
        const db = await this.openDB(name);

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(name, "readonly");
            const store = transaction.objectStore(name);
            const request = store.getAll();
            let entries: DBTypes[] = [];

            request.onsuccess = () => {
                entries = request.result;
            };
            transaction.oncomplete = () => {
                db.close();
                resolve(entries);
            };
            transaction.onerror = () => {
                db.close();
                reject(transaction.error ?? request.error);
            };
            transaction.onabort = () => {
                db.close();
                reject(transaction.error ?? new Error(`Reading ${name} database was aborted`));
            };
        });
    }

    async get(id: string, name: DBNames): Promise<DBTypes | undefined> {
        if (!id) throw new Error(`[${name}DB] No key provided`);

        const db = await this.openDB(name);

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(name, "readonly");
            const store = transaction.objectStore(name);
            const request = store.get(id);
            let entry: DBTypes | undefined;

            request.onsuccess = () => {
                entry = request.result;
            };
            transaction.oncomplete = () => {
                db.close();
                resolve(entry);
            };
            transaction.onerror = () => {
                db.close();
                reject(transaction.error ?? request.error);
            };
            transaction.onabort = () => {
                db.close();
                reject(transaction.error ?? new Error(`Reading ${name} database was aborted`));
            };
        });
    }

    async saveToLocalDB(obj: DBTypes, name: DBNames): Promise<IDBValidKey | undefined> {
        try {
            const db = await this.openDB(name);
            return await new Promise((resolve, reject) => {
                const transaction = db.transaction(name, "readwrite");
                const store = transaction.objectStore(name);
                const request = store.put(obj);
                let savedKey: IDBValidKey | undefined;

                request.onsuccess = () => {
                    savedKey = request.result;
                };

                transaction.oncomplete = () => {
                    db.close();
                    console.log(`Entry id=${String(savedKey)} saved to offline database`);
                    resolve(savedKey);
                };
                transaction.onerror = () => {
                    db.close();
                    reject(transaction.error ?? request.error);
                };
                transaction.onabort = () => {
                    db.close();
                    reject(transaction.error ?? new Error(`Saving to ${name} database was aborted`));
                };
            });
        } catch (error) {
            console.error("Error saving entry to offline database:", error);
        }
    }
}
