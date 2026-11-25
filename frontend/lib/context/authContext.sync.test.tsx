import {webcrypto} from "node:crypto";
import {cleanup, renderHook, waitFor} from "@testing-library/react";
import {IDBFactory} from "fake-indexeddb";
import {afterEach, expect, it, vi} from "vitest";
import Database from "@/lib/database";
import type {Entry} from "@/types/entryTypes";
import {useAuth} from "./auth";
import {getVaultGeneration, lockJournal, unlockJournal} from "@/lib/vault/session";
import {AuthProvider} from "./authContext";

vi.mock("next/navigation", () => ({useRouter: () => ({push: vi.fn()})}));

afterEach(() => {
    cleanup();
    lockJournal();
    localStorage.clear();
    vi.unstubAllGlobals();
});

it("keeps a local deletion pending when an older sync response arrives", async () => {
    vi.stubGlobal("indexedDB", new IDBFactory());
    vi.stubGlobal("crypto", webcrypto);
    const key = await crypto.subtle.generateKey({name: "AES-GCM", length: 256}, false, ["encrypt", "decrypt"]);
    unlockJournal(key, getVaultGeneration());
    const db = new Database();
    const original: Entry = {
        id: "reflection-one",
        userId: 42,
        title: "After the rain",
        content: ["Wet leaves"],
        drawingPaths: [],
        date: "2026-11-25T09:00:00.000Z",
        createdAt: "2026-11-25T09:00:00.000Z",
        lastEditedAt: "2026-11-25T09:00:00.000Z",
        syncStatus: "pending",
    };
    await db.saveToLocalDB(original, "reflections");
    const [pending] = await db.getPendingRecords(42);
    const {id, revision, lastEditedAt, payload} = pending;
    expect(payload).toMatchObject({version: 1, iv: expect.any(String), ciphertext: expect.any(String)});
    expect(JSON.stringify(pending)).not.toContain(original.title);
    expect(await db.get(id, "reflections", 42)).toEqual(original);
    expect(await db.get(id, "reflections", 43)).toBeUndefined();
    lockJournal();
    await expect(db.get(id, "reflections", 42)).rejects.toThrow("Unlock");
    unlockJournal(key, getVaultGeneration());

    let resolveStaleSync!: (response: Response) => void;
    const staleResponse = new Promise<Response>((resolve) => {
        resolveStaleSync = resolve;
    });
    const fetchMock = vi.fn<typeof fetch>()
        .mockResolvedValueOnce(Response.json({id: original.userId, email: "test@example.com"}))
        .mockReturnValueOnce(staleResponse);
    vi.stubGlobal("fetch", fetchMock);

    const {result} = renderHook(useAuth, {wrapper: AuthProvider});
    await waitFor(() => expect(result.current.userId).toBe(original.userId));
    const sync = result.current.syncPendingEntries();
    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith(
        expect.stringMatching(/\/reflection\/sync$/),
        expect.objectContaining({method: "POST", body: JSON.stringify([{id, revision, lastEditedAt, payload}])}),
    ));

    const deletedAt = "2026-11-25T09:01:00.000Z";
    const deletion: Entry = {
        ...original,
        title: "",
        content: [],
        deletedAt,
        lastEditedAt: deletedAt,
    };
    await db.saveToLocalDB(deletion, "reflections");

    resolveStaleSync(Response.json({synced_entries: [{id, revision, lastEditedAt}]}));
    await sync;

    expect(await db.get(original.id, "reflections", 42)).toBeUndefined();
    expect(await db.getPendingRecords(42)).toEqual([
        expect.objectContaining({id, deletedAt, payload: null, syncStatus: "pending"}),
    ]);
});
