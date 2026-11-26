import {webcrypto} from "node:crypto";
import {act, cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {Entry} from "@/types/entryTypes";
import {getVaultGeneration, lockJournal, unlockJournal} from "@/lib/vault/encryption-session";
import EntryEditor from "./EntryEditor";

const databaseMocks = vi.hoisted(() => ({
    getAll: vi.fn(),
    saveToLocalDB: vi.fn(),
}));
const fetchMock = vi.hoisted(() => vi.fn<typeof fetch>());
const syncPendingEntries = vi.hoisted(() => vi.fn());

vi.mock("@/lib/ai/reflectionsAiManager", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/ai/reflectionsAiManager")>();
    return {
        ...actual,
        reflectionsAiManager: new actual.ReflectionsAiManager({
            baseUrl: "http://backend.test",
        }),
    };
});

vi.mock("../lib/database", () => ({
    default: class Database {
        getAll = databaseMocks.getAll;
        saveToLocalDB = databaseMocks.saveToLocalDB;
    },
}));

const consent = vi.hoisted(() => ({enabled: true, read: vi.fn()}));
vi.mock("@/lib/api/accountSettings", () => ({fetchAccountSettings: consent.read}));

vi.mock("@/lib/context/auth", () => ({
    useAuth: () => ({
        userId: 42,
        accountSettings: {cloudAiEnabled: consent.enabled},
        refresh: vi.fn(),
        syncPendingEntries,
    }),
}));

vi.mock("@dnd-kit/react", () => ({
    DragDropProvider: ({children}: {children: React.ReactNode}) => children,
    DragOverlay: ({children}: {children: React.ReactNode}) => children,
}));

vi.mock("@dnd-kit/react/sortable", () => ({
    useSortable: () => ({
        ref: vi.fn(),
        handleRef: vi.fn(),
        isDragging: false,
        isDropTarget: false,
    }),
    isSortable: () => true,
}));

vi.mock("@/components/DatePicker", () => ({default: () => null}));
vi.mock("@/components/DrawingArea", () => ({default: () => null}));
vi.mock("@/components/EntrySyncStatus", () => ({default: () => null}));
vi.mock("@/components/BarItem", () => ({default: () => null}));
vi.mock("@/components/SyncLoginPopup", () => ({default: () => null}));

const makeEntry = (overrides: Partial<Entry> = {}): Entry => ({
    id: "current-entry",
    userId: 42,
    title: "",
    content: [""],
    date: "2026-11-13T09:00:00.000Z",
    drawingPaths: [],
    syncStatus: "pending",
    lastEditedAt: "2026-11-13T09:00:00.000Z",
    createdAt: "2026-11-13T09:00:00.000Z",
    ...overrides,
});

const previousEntries = [
    makeEntry({
        id: "previous-one",
        content: ["A walk through the woods"],
        lastEditedAt: "2026-11-12T09:00:00.000Z",
    }),
    makeEntry({
        id: "previous-two",
        content: ["Rain falling beside the quiet lake"],
        lastEditedAt: "2026-11-11T09:00:00.000Z",
    }),
];

async function flushPromises() {
    await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
    });
}

describe("EntryEditor integration", () => {
    beforeEach(() => {
        consent.enabled = true;
        consent.read.mockReset().mockResolvedValue({cloudAiEnabled: true});
        vi.useFakeTimers();
        vi.stubGlobal("ResizeObserver", class ResizeObserver {
            observe() {}
            disconnect() {}
        });
        vi.spyOn(window, "scrollTo").mockImplementation(() => {});
        vi.spyOn(console, "debug").mockImplementation(() => {});
        Object.defineProperty(navigator, "onLine", {
            configurable: true,
            value: true,
        });
        databaseMocks.getAll.mockReset().mockResolvedValue(previousEntries);
        databaseMocks.saveToLocalDB.mockReset().mockResolvedValue("current-entry");
        fetchMock.mockReset();
        syncPendingEntries.mockReset();
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it("keeps journal text off the network unless cloud AI consent is present and current", async () => {
        consent.enabled = false;
        const {unmount} = render(<EntryEditor initEntry={makeEntry()} />);
        await flushPromises();
        const block = screen.getByPlaceholderText("How was your day?");
        fireEvent.focus(block);
        fireEvent.change(block, {target: {value: "Private draft"}});
        await act(async () => vi.advanceTimersByTimeAsync(10_000));
        expect(databaseMocks.getAll).not.toHaveBeenCalled();
        expect(consent.read).not.toHaveBeenCalled();
        expect(fetchMock).not.toHaveBeenCalled();
        unmount();

        consent.enabled = true;
        consent.read.mockResolvedValue({cloudAiEnabled: false});
        render(<EntryEditor initEntry={makeEntry()} />);
        await flushPromises();
        expect(consent.read).toHaveBeenCalledOnce();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("starts saving a pending edit before locking the journal", async () => {
        vi.stubGlobal("crypto", webcrypto);
        const key = await crypto.subtle.generateKey({name: "AES-GCM", length: 256}, false, ["encrypt", "decrypt"]);
        unlockJournal(key, getVaultGeneration());
        try {
            render(<EntryEditor initEntry={makeEntry({content: ["First draft"]})} />);
            await flushPromises();
            fireEvent.change(screen.getByPlaceholderText("How was your day?"), {target: {value: "Updated draft"}});
            expect(databaseMocks.saveToLocalDB).not.toHaveBeenCalled();
            await act(async () => lockJournal());
            expect(databaseMocks.saveToLocalDB).toHaveBeenCalledWith(
                expect.objectContaining({content: ["Updated draft"], syncStatus: "pending"}),
                "reflections",
            );
        } finally {
            lockJournal();
        }
    });

    it("saves an edit to a synced entry locally before syncing it after 15 seconds", async () => {
        const original = makeEntry({content: ["Existing thought"], syncStatus: "synced"});
        const revisedContent = "Existing thought revised";
        syncPendingEntries.mockResolvedValue({
            synced_entries: [{...original, content: [revisedContent]}],
        });
        render(<EntryEditor initEntry={original} />);
        await flushPromises();

        fireEvent.change(screen.getByPlaceholderText("How was your day?"), {
            target: {value: revisedContent},
        });
        await act(async () => vi.advanceTimersByTimeAsync(1_000));
        expect(databaseMocks.saveToLocalDB).toHaveBeenCalledWith(
            expect.objectContaining({id: original.id, content: [revisedContent], syncStatus: "pending"}),
            "reflections",
        );
        await act(async () => vi.advanceTimersByTimeAsync(13_999));
        expect(syncPendingEntries).not.toHaveBeenCalled();
        await act(async () => vi.advanceTimersByTimeAsync(1));
        expect(syncPendingEntries).toHaveBeenCalledTimes(1);
    });

    it("renders and accepts sentence starters returned by NestJS", async () => {
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify([
                {type: "sentence_starter", text: "I noticed..."},
                {type: "sentence_starter", text: "Today I felt..."},
                {type: "sentence_starter", text: "Next time..."},
            ]), {
                status: 200,
                headers: {"Content-Type": "application/json"},
            }),
        );
        const {container} = render(<EntryEditor initEntry={makeEntry()} />);

        expect(container.querySelector('textarea[name="content"]'))
            .toHaveAttribute("placeholder", "");

        await flushPromises();

        const textBlock = screen.getByPlaceholderText<HTMLTextAreaElement>("I noticed...");
        expect(textBlock).not.toHaveFocus();

        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringMatching(/\/reflection\/current-entry\/intelligence\/sentence-starters$/),
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({
                    currentContent: "",
                    recentContent: [
                        "A walk through the woods",
                        "Rain falling beside the quiet lake",
                    ],
                }),
            }),
        );

        expect(textBlock).toHaveAttribute("placeholder", "I noticed...");
        expect(textBlock).toHaveValue("");
        expect(screen.getByTestId("sentence-starter-ghost")).toHaveTextContent("I noticed...");
        expect(textBlock).toHaveAccessibleDescription("Tab to accept AI suggestion");
        fireEvent.focus(textBlock);
        fireEvent.keyDown(textBlock, {key: "Tab"});
        expect(textBlock.value).toBe("I noticed...");
        expect(screen.queryByTestId("sentence-starter-ghost")).not.toBeInTheDocument();

        fireEvent.change(textBlock, {target: {value: ""}});
        expect(textBlock).toHaveValue("");
        expect(textBlock).toHaveAttribute("placeholder", "I noticed...");
        fireEvent.keyDown(textBlock, {key: "Escape"});
        expect(screen.queryByTestId("sentence-starter-ghost")).not.toBeInTheDocument();
        expect(textBlock).toHaveAttribute("placeholder", "How was your day?");
    });

    it("shows sentence starters only for the first empty block", async () => {
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify([
                {type: "sentence_starter", text: "I noticed..."},
                {type: "sentence_starter", text: "Today I felt..."},
                {type: "sentence_starter", text: "Next time..."},
            ]), {status: 200}),
        );

        render(<EntryEditor initEntry={makeEntry({content: ["", ""]})} />);
        await flushPromises();

        const firstTextBlock = screen.getByPlaceholderText<HTMLTextAreaElement>("I noticed...");
        const secondTextBlock = screen.getByPlaceholderText<HTMLTextAreaElement>("How was your day?");
        fireEvent.focus(secondTextBlock);
        expect(secondTextBlock).toHaveAttribute("placeholder", "How was your day?");

        fireEvent.blur(secondTextBlock);
        fireEvent.focus(firstTextBlock);
        expect(firstTextBlock).toHaveAttribute("placeholder", "I noticed...");
    });

    it("removes the sentence starter ghost text when the user types", async () => {
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify([
                {type: "sentence_starter", text: "I noticed..."},
                {type: "sentence_starter", text: "Today I felt..."},
                {type: "sentence_starter", text: "Next time..."},
            ]), {status: 200}),
        );

        render(<EntryEditor initEntry={makeEntry()} />);
        await flushPromises();

        const textBlock = screen.getByPlaceholderText<HTMLTextAreaElement>("I noticed...");
        fireEvent.focus(textBlock);
        expect(textBlock).toHaveAttribute("placeholder", "I noticed...");

        fireEvent.change(textBlock, {target: {value: "My"}});
        expect(textBlock).toHaveValue("My");
        expect(textBlock).toHaveAttribute("placeholder", "How was your day?");
    });

    it("keeps the default placeholder when sentence starters are unavailable", async () => {
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({message: "AI sentence starter service is unavailable"}), {
                status: 503,
                headers: {"Content-Type": "application/json"},
            }),
        );

        render(<EntryEditor initEntry={makeEntry()} />);
        await flushPromises();

        const textBlock = screen.getByPlaceholderText<HTMLTextAreaElement>("How was your day?");
        fireEvent.focus(textBlock);
        expect(textBlock).toHaveValue("");
        expect(textBlock).toHaveAttribute("placeholder", "How was your day?");
    });

    it("shows the default placeholder after finding insufficient context", async () => {
        databaseMocks.getAll.mockResolvedValue(previousEntries.slice(0, 1));

        const {container} = render(<EntryEditor initEntry={makeEntry()} />);
        expect(container.querySelector('textarea[name="content"]'))
            .toHaveAttribute("placeholder", "");

        await flushPromises();

        expect(screen.getByPlaceholderText("How was your day?"))
            .toHaveValue("");
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("shows the JSON suggestion as ghost text after ten seconds and commits it with Tab", async () => {
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({suggestion: "beneath the trees"}), {
                status: 200,
                headers: {"Content-Type": "application/json"},
            }),
        );
        render(<EntryEditor initEntry={makeEntry({content: ["Existing thought"]})} />);
        await flushPromises();

        const textBlock = screen.getByPlaceholderText<HTMLTextAreaElement>("How was your day?");
        fireEvent.focus(textBlock);
        fireEvent.change(textBlock, {target: {value: "Existing thought continued"}});

        await act(async () => vi.advanceTimersByTimeAsync(9_999));
        expect(fetchMock).not.toHaveBeenCalled();
        expect(screen.queryByTestId("inline-completion-ghost")).not.toBeInTheDocument();

        await act(async () => vi.advanceTimersByTimeAsync(1));

        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringMatching(/\/reflection\/current-entry\/intelligence\/inline-completion$/),
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({
                    currentContent: "Existing thought continued",
                    currentTextBlock: "Existing thought continued",
                    recentContent: [
                        "A walk through the woods",
                        "Rain falling beside the quiet lake",
                    ],
                }),
            }),
        );

        expect(textBlock.value).toBe("Existing thought continued");
        expect(screen.getByTestId("inline-completion-ghost"))
            .toHaveTextContent("Existing thought continued beneath the trees");
        expect(textBlock).toHaveAccessibleDescription("Tab to accept AI suggestion");

        await act(async () => vi.advanceTimersByTimeAsync(4_000));
        expect(textBlock.value).toBe("Existing thought continued");
        expect(screen.getByTestId("inline-completion-ghost")).toBeInTheDocument();

        fireEvent.keyDown(textBlock, {key: "Tab"});
        expect(textBlock.value).toBe("Existing thought continued beneath the trees");
        expect(screen.queryByTestId("inline-completion-ghost")).not.toBeInTheDocument();
        expect(textBlock).not.toHaveAccessibleDescription();
    });

    it("ignores an inline response after the user types again", async () => {
        let resolveResponse: ((response: Response) => void) | undefined;
        fetchMock.mockImplementation(() => new Promise<Response>((resolve) => {
            resolveResponse = resolve;
        }));

        render(<EntryEditor initEntry={makeEntry({content: ["Existing thought"]})} />);
        await flushPromises();

        const textBlock = screen.getByPlaceholderText<HTMLTextAreaElement>("How was your day?");
        fireEvent.focus(textBlock);
        fireEvent.change(textBlock, {target: {value: "Existing thought continued"}});
        await act(async () => vi.advanceTimersByTime(10_000));
        expect(fetchMock).toHaveBeenCalledOnce();

        fireEvent.change(textBlock, {target: {value: "Existing thought changed again"}});
        await act(async () => {
            resolveResponse?.(Response.json({suggestion: "stale completion"}));
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(textBlock.value).toBe("Existing thought changed again");
        expect(screen.queryByTestId("inline-completion-ghost")).not.toBeInTheDocument();
    });

    it("keeps editing available when the backend rejects inline completion", async () => {
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({message: "AI inline completion service is unavailable"}), {
                status: 503,
                headers: {"Content-Type": "application/json"},
            }),
        );

        render(<EntryEditor initEntry={makeEntry({content: ["Existing thought"]})} />);
        await flushPromises();

        const textBlock = screen.getByPlaceholderText<HTMLTextAreaElement>("How was your day?");
        fireEvent.focus(textBlock);
        fireEvent.change(textBlock, {target: {value: "Existing thought continued"}});
        await act(async () => {
            vi.advanceTimersByTime(10_000);
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(textBlock).toHaveValue("Existing thought continued");
        expect(textBlock).not.toBeDisabled();
        expect(screen.queryByTestId("inline-completion-ghost")).not.toBeInTheDocument();
    });
});
