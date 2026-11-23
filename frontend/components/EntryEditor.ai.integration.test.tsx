import {act, cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {Entry} from "@/types/entryTypes";
import EntryEditor from "./EntryEditor";

const databaseMocks = vi.hoisted(() => ({
    getAll: vi.fn(),
    saveToLocalDB: vi.fn(),
}));
const fetchMock = vi.hoisted(() => vi.fn<typeof fetch>());

vi.mock("@/lib/ai/reflectionsAiManager", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/ai/reflectionsAiManager")>();
    return {
        ...actual,
        reflectionsAiManager: new actual.ReflectionsAiManager({
            baseUrl: "http://backend.test",
            fetcher: fetchMock,
        }),
    };
});

vi.mock("../lib/database", () => ({
    default: class Database {
        getAll = databaseMocks.getAll;
        saveToLocalDB = databaseMocks.saveToLocalDB;
    },
}));

vi.mock("@/lib/context/auth", () => ({
    useAuth: () => ({
        refresh: vi.fn(),
        syncPendingEntries: vi.fn(),
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

describe("EntryEditor AI backend integration", () => {
    beforeEach(() => {
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
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        vi.useRealTimers();
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
        render(<EntryEditor initEntry={makeEntry()} />);
        await flushPromises();

        const textBlock = screen.getByPlaceholderText<HTMLTextAreaElement>("How was your day?");
        fireEvent.focus(textBlock);
        await flushPromises();

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
        fireEvent.keyDown(textBlock, {key: "Tab"});
        expect(textBlock.value).toBe("I noticed...");

        fireEvent.change(textBlock, {target: {value: ""}});
        expect(textBlock).toHaveValue("");
        expect(textBlock).toHaveAttribute("placeholder", "I noticed...");
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

        const textBlocks = screen.getAllByPlaceholderText<HTMLTextAreaElement>("How was your day?");
        fireEvent.focus(textBlocks[1]);
        expect(textBlocks[1]).toHaveAttribute("placeholder", "How was your day?");

        fireEvent.blur(textBlocks[1]);
        fireEvent.focus(textBlocks[0]);
        expect(textBlocks[0]).toHaveAttribute("placeholder", "I noticed...");
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

        const textBlock = screen.getByPlaceholderText<HTMLTextAreaElement>("How was your day?");
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

    it("sends typed content and accepts the inline response returned by NestJS", async () => {
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify("beneath the trees"), {
                status: 200,
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
        fireEvent.click(screen.getByRole("button", {name: "Accept AI completion"}));
        expect(textBlock.value).toBe("Existing thought continued beneath the trees");
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
            resolveResponse?.(new Response(JSON.stringify("stale completion"), {status: 200}));
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(textBlock.value).toBe("Existing thought changed again");
        expect(screen.queryByRole("button", {name: "Accept AI completion"})).not.toBeInTheDocument();
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
        expect(screen.queryByRole("button", {name: "Accept AI completion"})).not.toBeInTheDocument();
    });
});
