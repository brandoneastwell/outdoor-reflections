import {useCallback, useEffect, useRef, useState} from "react";
import Database from "@/lib/database";
import {reflectionsAiManager} from "@/lib/ai/reflectionsAiManager";
import type {Entry} from "@/types/entryTypes";
import type {EntryAiState} from "@/types/intelligenceTypes";

const db = new Database();

type AiFeature = "sentence_starter" | "autocomplete";

const logAiEligibility = (
    feature: AiFeature,
    stage: string,
    checks: Record<string, boolean>,
) => {
    const eligible = Object.values(checks).every(Boolean);
    console.log(`[AI eligibility] ${feature}:${stage}`, {...checks, eligible});
    return eligible;
};

export function useEntryAiSuggestions(entry: Entry, initiallyBlank: boolean) {
    const [isOnline, setIsOnline] = useState(true);
    const [recentContent, setRecentContent] = useState<string[]>([]);
    const [focusedTextBlockIndex, setFocusedTextBlockIndex] = useState<number | null>(null);
    const [aiState, setAiState] = useState<EntryAiState>({
        autocomplete: undefined,
        status: initiallyBlank ? "loading" : "idle",
        sentence_starters: [],
        targetBlockIndex: initiallyBlank ? 0 : null,
        error: null,
    });
    const aiRequestRef = useRef<AbortController | null>(null);
    const aiRequestIdRef = useRef(0);
    const aiRequestTypeRef = useRef<"sentence_starter" | "autocomplete" | null>(null);
    const autocompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const focusedTextBlockIndexRef = useRef<number | null>(null);
    const initialSuggestionRequestedRef = useRef(false);
    const wasInitiallyBlankRef = useRef(initiallyBlank);

    useEffect(() => {
        return () => {
            aiRequestRef.current?.abort();
            if (autocompleteTimeoutRef.current) {
                clearTimeout(autocompleteTimeoutRef.current);
            }
        };
    }, [entry.id]);

    const clearAiSuggestions = useCallback(() => {
        aiRequestIdRef.current += 1;
        aiRequestRef.current?.abort();
        aiRequestRef.current = null;
        aiRequestTypeRef.current = null;
        setAiState({
            autocomplete: undefined,
            status: "idle",
            sentence_starters: [],
            targetBlockIndex: null,
            error: null,
        });
    }, []);

    const requestContentGeneration = useCallback(async (
        type: 'sentence_starter' | 'autocomplete',
        currentContent: string,
        recentContent: string[],
        targetBlockIndex: number,
        currentTextBlock?: string,
    ): Promise<void> => {
        const requestChecks: Record<string, boolean> = {
            online: navigator.onLine,
            hasMinimumContext: recentContent.length > 1,
        };
        if (type === "autocomplete") {
            requestChecks.currentTextBlockNotEmpty = Boolean(currentTextBlock);
        }
        if (!logAiEligibility(type, "request", requestChecks)) return;

        aiRequestRef.current?.abort();

        const requestController = new AbortController();
        const requestId = aiRequestIdRef.current + 1;
        aiRequestIdRef.current = requestId;
        aiRequestRef.current = requestController;
        aiRequestTypeRef.current = type;
        setAiState({
            autocomplete: undefined,
            status: "loading",
            sentence_starters: [],
            targetBlockIndex,
            error: null,
        });

        try {
            if (type === "autocomplete") {
                if (!currentTextBlock) return;
                const completion = await reflectionsAiManager.getInlineCompletion(
                    entry.id,
                    {currentContent, currentTextBlock, recentContent},
                    requestController.signal,
                );

                if (logAiEligibility("autocomplete", "response", {
                    requestActive: !requestController.signal.aborted,
                    latestRequest: aiRequestIdRef.current === requestId,
                    targetStillFocused: focusedTextBlockIndexRef.current === targetBlockIndex,
                })) {
                    setAiState({
                        autocomplete: completion,
                        status: "ready",
                        sentence_starters: [],
                        targetBlockIndex,
                        error: null,
                    });
                }
                return;
            }

            const suggestions = await reflectionsAiManager.getSentenceStarters(
                    entry.id,
                    {currentContent, recentContent},
                    requestController.signal,
            );

            if (logAiEligibility("sentence_starter", "response", {
                requestActive: !requestController.signal.aborted,
                latestRequest: aiRequestIdRef.current === requestId,
            })) {
                setAiState({
                    autocomplete: undefined,
                    status: "ready",
                    sentence_starters: suggestions.map((suggestion) => suggestion.text),
                    targetBlockIndex,
                    error: null,
                });
            }
        } catch (error) {
            if (requestController.signal.aborted || aiRequestIdRef.current !== requestId) return;

            const message = error instanceof Error
                ? error.message
                : "AI sentence starter service is unavailable";

            setAiState({
                autocomplete: undefined,
                status: "unavailable",
                sentence_starters: [],
                targetBlockIndex,
                error: message,
            });
        } finally {
            if (aiRequestRef.current === requestController) {
                aiRequestRef.current = null;
                aiRequestTypeRef.current = null;
            }
        }
    }, [entry.id, entry.userId]);

    useEffect(() => {
        const updateOnlineStatus = () => setIsOnline(navigator.onLine);
        const handleOffline = () => {
            setIsOnline(false);
            if (autocompleteTimeoutRef.current) {
                clearTimeout(autocompleteTimeoutRef.current);
                autocompleteTimeoutRef.current = null;
            }
            clearAiSuggestions();
        };

        updateOnlineStatus();
        window.addEventListener("online", updateOnlineStatus);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", updateOnlineStatus);
            window.removeEventListener("offline", handleOffline);
        };
    }, [clearAiSuggestions]);

    useEffect(() => {
        let cancelled = false;

        const loadRecentContent = async () => {
            try {
                const storedEntries = (await db.getAll("reflections", entry.userId)) ?? [];
                if (cancelled) return;

                const previousContent = storedEntries
                    .filter((storedEntry) => storedEntry.id !== entry.id)
                    .filter((storedEntry) => storedEntry.content.join("\n").length > 20)
                    .sort((first, second) => (
                        new Date(second.lastEditedAt).getTime() - new Date(first.lastEditedAt).getTime()
                    ))
                    .map((storedEntry) => storedEntry.content
                        .map((block) => block.trim())
                        .filter(Boolean)
                        .join("\n"))
                    .filter(Boolean)
                    .slice(0, 10);

                setRecentContent(previousContent);
                if (previousContent.length <= 1 || !navigator.onLine) {
                    setAiState((currentState: EntryAiState) => ({...currentState, status: "idle"}));
                }
            } catch (error) {
                console.warn("Unable to load previous entries for AI context", error);
                if (!cancelled) {
                    setRecentContent([]);
                    setAiState((currentState: EntryAiState) => ({...currentState, status: "idle"}));
                }
            }
        };

        void loadRecentContent();
        return () => {
            cancelled = true;
        };
    }, [entry.id, entry.userId]);

    useEffect(() => {
        const firstBlockExists = entry.content.length > 0;
        const eligible = logAiEligibility("sentence_starter", "initial", {
            entryInitiallyBlank: wasInitiallyBlankRef.current,
            notAlreadyRequested: !initialSuggestionRequestedRef.current,
            firstBlockExists,
            firstBlockEmpty: firstBlockExists && entry.content[0].trim() === "",
            online: isOnline,
            hasMinimumContext: recentContent.length > 1,
        });
        if (!eligible) return;

        initialSuggestionRequestedRef.current = true;
        void requestContentGeneration("sentence_starter", "", recentContent, 0);
    }, [entry.content, isOnline, recentContent, requestContentGeneration]);

    const handleTextBlockFocus = useCallback((index: number) => {
        focusedTextBlockIndexRef.current = index;
        setFocusedTextBlockIndex(index);
    }, []);

    const handleTextBlockBlur = useCallback((index: number) => {
        if (focusedTextBlockIndexRef.current !== index) return;

        focusedTextBlockIndexRef.current = null;
        setFocusedTextBlockIndex(null);
        if (autocompleteTimeoutRef.current) {
            clearTimeout(autocompleteTimeoutRef.current);
            autocompleteTimeoutRef.current = null;
        }

        if (aiRequestTypeRef.current === "autocomplete") {
            clearAiSuggestions();
            return;
        }

        setAiState((currentState: EntryAiState) => currentState.autocomplete !== undefined
            ? {
                autocomplete: undefined,
                status: "idle",
                sentence_starters: [],
                targetBlockIndex: null,
                error: null,
            }
            : currentState
        );
    }, [clearAiSuggestions]);

    const handleTextBlockChange = useCallback((index: number, content: string[]) => {
        if (autocompleteTimeoutRef.current) {
            clearTimeout(autocompleteTimeoutRef.current);
            autocompleteTimeoutRef.current = null;
        }

        clearAiSuggestions();

        const currentBlock = content[index]?.trim() ?? "";
        if (!logAiEligibility("autocomplete", "schedule", {
            online: isOnline,
            hasMinimumContext: recentContent.length > 1,
            currentBlockNotEmpty: currentBlock.length > 0,
        })) return;

        autocompleteTimeoutRef.current = setTimeout(() => {
            autocompleteTimeoutRef.current = null;
            if (!logAiEligibility("autocomplete", "debounce_complete", {
                targetStillFocused: focusedTextBlockIndexRef.current === index,
                online: navigator.onLine,
            })) return;

            void requestContentGeneration(
                "autocomplete",
                content.join("\n"),
                recentContent,
                index,
                currentBlock,
            );
        }, 10_000);
    }, [clearAiSuggestions, isOnline, recentContent, requestContentGeneration]);

    return {
        aiState,
        clearAiSuggestions,
        focusedTextBlockIndex,
        onTextBlockFocus: handleTextBlockFocus,
        onTextBlockBlur: handleTextBlockBlur,
        onTextBlockChange: handleTextBlockChange,
    };
}
