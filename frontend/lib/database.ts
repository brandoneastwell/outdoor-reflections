import {Entry} from "@/types/entryTypes";

type DBNames = 'reflections'
type DBTypes = Entry

export default class Database {
    constructor() {}

    openDB(name: DBNames): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const db = indexedDB.open(`${name}-db`, 1);
            db.onupgradeneeded = () => {
                db.result.createObjectStore(name, { keyPath: "id" });
                resolve(db.result)
            };

            db.onerror = () => {
                reject(db.error);
            };

            db.onsuccess = () => {
                resolve(db.result)
            }
        })
    }

    async getAll(name: DBNames): Promise<DBTypes[] | undefined> {
        const db = await this.openDB(name);

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(name, "readonly");
            const store = transaction.objectStore(name);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async get(id: string, name: DBNames): Promise<DBTypes | undefined> {
        const db = await this.openDB(name);

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(name, "readonly");
            const store = transaction.objectStore(name);

            if (!id) return reject(`[${name}DB] No key provided`);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async saveToLocalDB(obj: DBTypes, name: DBNames): Promise<IDBValidKey | undefined> {
        try {
            const db = await this.openDB(name);
            return await new Promise((resolve, reject) => {
                const transaction = db.transaction(name, "readwrite");
                const store = transaction.objectStore(name);
                const request = store.put(obj);

                request.onsuccess = () => {
                    console.log(`Entry id=${request.result} saved to offline database`);
                    resolve(request.result);
                };

                request.onerror = () => reject(request.error);
                transaction.onerror = () => reject(transaction.error);
            });
        } catch (error) {
            console.error("Error saving entry to offline database:", error);
        }
    }


}
