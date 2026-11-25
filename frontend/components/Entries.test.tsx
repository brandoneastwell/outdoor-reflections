import {cleanup, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {Entry} from "@/types/entryTypes";
import Entries from "./Entries";
import SyncManager from "./SyncManager";

const mocks = vi.hoisted(() => ({
    getAll: vi.fn(),
    getPendingRecords: vi.fn(),
    saveToLocalDB: vi.fn(),
    syncPendingEntries: vi.fn(),
    refresh: vi.fn(),
    userId: 42 as number | null,
}));

vi.mock("@/lib/database", () => ({
    default: class Database {
        getAll = mocks.getAll;
        getPendingRecords = mocks.getPendingRecords;
        saveToLocalDB = mocks.saveToLocalDB;
    },
}));
vi.mock("@/lib/context/auth", () => ({
    useAuth: () => ({
        userId: mocks.userId,
        syncPendingEntries: mocks.syncPendingEntries,
        refresh: mocks.refresh,
    }),
}));
vi.mock("next/navigation", () => ({useRouter: () => ({push: vi.fn()})}));
vi.mock("@/components/DrawIcon", () => ({default: () => null}));

const entry: Entry = {
    id: "reflection-one",
    userId: 42,
    title: "After the rain",
    content: ["Wet leaves"],
    drawingPaths: [],
    date: "2026-11-25T09:00:00.000Z",
    createdAt: "2026-11-25T09:00:00.000Z",
    lastEditedAt: "2026-11-25T09:00:00.000Z",
    syncStatus: "synced",
};

async function chooseDelete() {
    const actions = await screen.findByLabelText("Actions for After the rain");
    fireEvent.click(actions);
    fireEvent.click(screen.getByRole("button", {name: "Delete reflection"}));
    return await screen.findByRole("alertdialog", {name: "Delete reflection?"});
}

describe("reflection deletion", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        mocks.userId = 42;
        mocks.getAll.mockResolvedValue([entry]);
        mocks.getPendingRecords.mockResolvedValue([]);
        mocks.saveToLocalDB.mockResolvedValue(entry.id);
        vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it("keeps the reflection when confirmation is cancelled", async () => {
        render(<Entries />);

        const dialog = await chooseDelete();
        expect(dialog).toHaveAccessibleDescription("“After the rain” will be permanently removed.");
        const cancel = within(dialog).getByRole("button", {name: "Cancel"});
        expect(cancel).toHaveFocus();
        fireEvent.click(cancel);
        await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
        await waitFor(() => expect(screen.getByLabelText("Actions for After the rain")).toHaveFocus());
        expect(screen.getByRole("link", {name: /After the rain/})).toBeInTheDocument();
        expect(mocks.saveToLocalDB).not.toHaveBeenCalled();
        expect(mocks.syncPendingEntries).not.toHaveBeenCalled();
    });

    it("persists a confirmed deletion before requesting sync while online", async () => {
        mocks.syncPendingEntries.mockResolvedValue({
            synced_entries: [{id: entry.id, deletedAt: new Date().toISOString()}],
        });
        render(<Entries />);

        const dialog = await chooseDelete();
        expect(mocks.saveToLocalDB).not.toHaveBeenCalled();
        expect(mocks.syncPendingEntries).not.toHaveBeenCalled();
        fireEvent.click(within(dialog).getByRole("button", {name: "Delete reflection"}));

        await waitFor(() => expect(mocks.syncPendingEntries).toHaveBeenCalledOnce());
        expect(mocks.saveToLocalDB).toHaveBeenCalledBefore(mocks.syncPendingEntries);
        expect(mocks.saveToLocalDB).toHaveBeenCalledWith(expect.objectContaining({
            id: entry.id,
            deletedAt: expect.any(String),
            syncStatus: "pending",
            content: [],
        }), "reflections");
        expect(screen.queryByRole("link", {name: /After the rain/})).not.toBeInTheDocument();
    });

    it("queues a confirmed offline deletion and retries it on reconnect", async () => {
        const online = vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
        render(<><SyncManager /><Entries /></>);

        const dialog = await chooseDelete();
        fireEvent.click(within(dialog).getByRole("button", {name: "Delete reflection"}));

        expect(await screen.findByText("Deletion will sync when you reconnect.")).toBeInTheDocument();
        expect(mocks.saveToLocalDB).toHaveBeenCalledWith(expect.objectContaining({
            id: entry.id,
            deletedAt: expect.any(String),
            syncStatus: "pending",
        }), "reflections");
        expect(mocks.syncPendingEntries).not.toHaveBeenCalled();
        expect(screen.queryByRole("link", {name: /After the rain/})).not.toBeInTheDocument();

        online.mockReturnValue(true);
        fireEvent(window, new Event("online"));

        expect(mocks.syncPendingEntries).toHaveBeenCalledOnce();
    });

    it("retries an owned deletion queued during a previous session", async () => {
        mocks.getAll.mockResolvedValue([]);
        mocks.getPendingRecords.mockResolvedValue([{...entry, deletedAt: entry.date, syncStatus: "pending"}]);
        render(<><SyncManager /><Entries /></>);

        await waitFor(() => expect(mocks.syncPendingEntries).toHaveBeenCalledOnce());
        expect(screen.queryByRole("link", {name: /After the rain/})).not.toBeInTheDocument();
    });
});
