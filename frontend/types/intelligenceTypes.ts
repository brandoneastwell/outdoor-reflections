export type JournalSuggestion = {
    type: "sentence_starter";
    text: string;
};

export type SentenceStartersRequest = {
    currentContent: string;
    recentContent: string[];
};

export type EntryAiStatus = "idle" | "loading" | "ready" | "unavailable";

export type EntryAiState = {
    status: EntryAiStatus;
    suggestions: JournalSuggestion[];
    error: string | null;
};
