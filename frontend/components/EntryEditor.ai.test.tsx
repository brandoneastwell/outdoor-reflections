import {act, cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {Entry} from "@/types/entryTypes";
import EntryEditor from "./EntryEditor";

const aiMocks = vi.hoisted(() => ({
    getInlineCompletion: vi.fn(),
    getSentenceStarters: vi.fn(),
}));

const databaseMocks = vi.hoisted(() => ({
    getAll: vi.fn(),
    saveToLocalDB: vi.fn(),
}));

vi.mock("@/lib/ai/reflectionsAiManager", () => ({
    reflectionsAiManager: aiMocks,
}));

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

vi.mock("motion/react", () => ({
    AnimatePresence: ({children}: {children: React.ReactNode}) => children,
    Reorder: {
        Group: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
    },
}));

vi.mock("@/components/TextAreaItem", () => ({
    default: ({line, onChange, onFocus, onBlur, onKeyDown}: {
        line: {id: string; text: string};
        onChange: (id: string, value: string) => void;
        onFocus: () => void;
        onBlur: () => void;
        onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    }) => (
        <textarea
            aria-label="entry block"
            value={line.text}
            onChange={(event) => onChange(line.id, event.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
        />
    ),
}));

vi.mock("@/components/DatePicker", () => ({default: () => null}));
vi.mock("@/components/DrawingArea", () => ({default: () => null}));
vi.mock("@/components/EntrySyncStatus", () => ({default: () => null}));
vi.mock("@/components/BarItem", () => ({default: () => null}));
vi.mock("@/components/SyncLoginPopup", () => ({default: () => null}));

const suggestions = [
    {type: "sentence_starter" as const, text: "I noticed..."},
    {type: "sentence_starter" as const, text: "Today I felt..."},
    {type: "sentence_starter" as const, text: "Next time..."},
];

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
        content: ["Rain beside the lake"],
        lastEditedAt: "2026-11-11T09:00:00.000Z",
    }),
];

async function flushEffects() {
    await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
    });
}

describe("EntryEditor AI interactions", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.stubGlobal("ResizeObserver", class ResizeObserver {
            observe() {}
            disconnect() {}
        });
        vi.spyOn(window, "scrollTo").mockImplementation(() => {});
        Object.defineProperty(navigator, "onLine", {
            configurable: true,
            value: true,
        });

        aiMocks.getInlineCompletion.mockReset().mockResolvedValue(suggestions);
        aiMocks.getSentenceStarters.mockReset().mockResolvedValue(suggestions);
        databaseMocks.getAll.mockReset().mockResolvedValue(previousEntries);
        databaseMocks.saveToLocalDB.mockReset().mockResolvedValue("current-entry");
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it("requests initial sentence starters for the existing first empty block", async () => {
        render(<EntryEditor initEntry={makeEntry()} />);
        await flushEffects();

        expect(aiMocks.getSentenceStarters).toHaveBeenCalledWith(
            "current-entry",
            {
                currentContent: "",
                recentContent: [
                    "A walk through the woods",
                    "Rain beside the lake",
                ],
            },
            expect.any(AbortSignal),
        );
    });

    it("does not request suggestions without two previous entries", async () => {
        databaseMocks.getAll.mockResolvedValue(previousEntries.slice(0, 1));

        render(<EntryEditor initEntry={makeEntry()} />);
        await flushEffects();

        expect(aiMocks.getSentenceStarters).not.toHaveBeenCalled();
        expect(aiMocks.getInlineCompletion).not.toHaveBeenCalled();
    });

    it("does not request suggestions while offline", async () => {
        Object.defineProperty(navigator, "onLine", {
            configurable: true,
            value: false,
        });

        render(<EntryEditor initEntry={makeEntry()} />);
        await flushEffects();

        expect(aiMocks.getSentenceStarters).not.toHaveBeenCalled();
    });

    it("requests inline completion after ten idle seconds while focused", async () => {
        render(<EntryEditor initEntry={makeEntry({content: ["Existing thought"]})} />);
        await flushEffects();

        const textBlock = screen.getByRole("textbox", {name: "entry block"});
        fireEvent.focus(textBlock);
        fireEvent.change(textBlock, {target: {value: "Existing thought continued"}});

        await act(async () => {
            vi.advanceTimersByTime(9_999);
        });
        expect(aiMocks.getInlineCompletion).not.toHaveBeenCalled();

        await act(async () => {
            vi.advanceTimersByTime(1);
            await Promise.resolve();
        });

        expect(aiMocks.getInlineCompletion).toHaveBeenCalledWith(
            "current-entry",
            {
                currentContent: "Existing thought continued",
                recentContent: [
                    "A walk through the woods",
                    "Rain beside the lake",
                ],
            },
            expect.any(AbortSignal),
        );
    });

    it("cancels the pending completion when the block loses focus", async () => {
        render(<EntryEditor initEntry={makeEntry({content: ["Existing thought"]})} />);
        await flushEffects();

        const textBlock = screen.getByRole("textbox", {name: "entry block"});
        fireEvent.focus(textBlock);
        fireEvent.change(textBlock, {target: {value: "Existing thought continued"}});
        fireEvent.blur(textBlock);

        await act(async () => {
            vi.advanceTimersByTime(10_000);
        });

        expect(aiMocks.getInlineCompletion).not.toHaveBeenCalled();
    });
});
