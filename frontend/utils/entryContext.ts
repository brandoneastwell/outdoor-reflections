import {createContext, Dispatch} from "react";
import {DrawPath, Entry} from "@/types/entryTypes";
import type {EntryAiState, JournalSuggestion} from "@/types/intelligenceTypes";

type StateSetter<T> = Dispatch<T | ((previousState: T) => T)>;

type EntryContextValue = {
    entry: Entry;
    setEntry: StateSetter<Entry>;
    drawHistory: DrawPath[];
    drawColor: string;
    setDrawColor: StateSetter<string>;
    editorScale: number;
    aiState: EntryAiState;
    requestSentenceStarters: (
        currentContent: string,
        recentContent: string[],
    ) => Promise<JournalSuggestion[]>;
    clearAiSuggestions: () => void;
};

export const EntryContext = createContext<EntryContextValue>({
    entry: {
        title: "",
        content: [],
        date: "",
        drawingPaths: [],
        syncStatus: "pending",
        lastEditedAt: "",
        createdAt: "",
        id: ""
    },
    setEntry: () => {},
    drawHistory: [],
    drawColor: "#000000",
    setDrawColor: () => {},
    editorScale: 1,
    aiState: {
        status: "idle",
        suggestions: [],
        error: null,
    },
    requestSentenceStarters: async () => [],
    clearAiSuggestions: () => {},
});
