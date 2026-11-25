export type DrawPath = {
    path: string;
    color: string;
};

export type SyncStatus = "synced" | "pending" | "failed";

export type Entry = {
    id: string;
    userId?: number;
    title: string;
    content: string[];
    date: string;
    drawingPaths: DrawPath[];
    syncStatus: SyncStatus;
    lastEditedAt: string;
    createdAt: string;
    deletedAt?: string | null;
}

export type EncryptedEntry = {
    id: string;
    userId?: number;
    syncStatus: SyncStatus;
    revision: string;
    lastEditedAt: string;
    deletedAt?: string | null;
    payload: {version: 1; iv: string; ciphertext: string} | null;
};

export type SyncAcknowledgement = Pick<EncryptedEntry, "id" | "revision" | "lastEditedAt" | "deletedAt">;

export type SyncResponse = {
    synced_entries: SyncAcknowledgement[];
    timestamp: string;
    service_name: string;
    status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
    duration_ms: number;
    count: { total: number; updated: number; created: number; failed: number };
    errors?: { entryId: string; error: string }[];
};
