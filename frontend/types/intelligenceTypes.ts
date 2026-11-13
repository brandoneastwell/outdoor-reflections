export type SuggestionType = "sentence_starter" | "autocomplete";

export type JournalSuggestion = {
    type: SuggestionType;
    text: string;
};

export type ContentGenerationRequest = {
    currentContent: string;
    currentBlock?: string;
    recentContent: string[];
};

export type EntryAiStatus = "idle" | "loading" | "ready" | "unavailable";

export type EntryAiState = {
    status: EntryAiStatus;
    sentence_starters: string[];
    autocomplete?: string;
    targetBlockIndex: number | null;
    error: string | null;
};
