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
}

export type SyncResponse = {
    synced_entries: Entry[];
    timestamp: string;
    service_name: string;
    status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
    duration_ms: number;
    count: { total: number; updated: number; created: number; failed: number };
    errors?: { entryId: string; error: string }[];
};