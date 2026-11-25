import {cleanup, renderHook, waitFor} from "@testing-library/react";
import {IDBFactory} from "fake-indexeddb";
import {afterEach, expect, it, vi} from "vitest";
import Database from "@/lib/database";
import type {Entry} from "@/types/entryTypes";
import {useAuth} from "./auth";
import {AuthProvider} from "./authContext";

vi.mock("next/navigation", () => ({useRouter: () => ({push: vi.fn()})}));

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

it("keeps a local deletion pending when an older sync response arrives", async () => {
    vi.stubGlobal("indexedDB", new IDBFactory());
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
        expect.objectContaining({method: "POST", body: JSON.stringify([original])}),
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

    resolveStaleSync(Response.json({synced_entries: [original]}));
    await sync;

    expect(await db.get(original.id, "reflections")).toBeUndefined();
    expect(await db.getAll("reflections")).toEqual([deletion]);
});
