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
    requestContentGeneration: (
        type: 'sentence_starter' | 'autocomplete',
        currentContent: string,
        recentContent: string[],
        targetBlockIndex: number,
    ) => Promise<JournalSuggestion[]>;
    clearAiSuggestions: () => void;
    focusedTextBlockIndex: number | null;
    onTextBlockFocus: (index: number) => void;
    onTextBlockBlur: (index: number) => void;
    onTextBlockChange: (index: number, content: string[]) => void;
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
        sentence_starters: [],
        targetBlockIndex: null,
        error: null,
    },
    requestContentGeneration: async () => [],
    clearAiSuggestions: () => {},
    focusedTextBlockIndex: null,
    onTextBlockFocus: () => {},
    onTextBlockBlur: () => {},
    onTextBlockChange: () => {},
});
