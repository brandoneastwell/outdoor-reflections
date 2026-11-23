"use client"
import {useCallback, useEffect, useRef, useState} from "react";
import {EditMode} from "@/types/customTypes";
import {DrawPath, Entry, SyncStatus} from "@/types/entryTypes";
import {EntryContext} from "@/utils/entryContext";
import Database from "../lib/database";
import DatePicker from "@/components/DatePicker";
import DrawingArea from "@/components/DrawingArea";
import TextArea from "@/components/TextArea";
import EntrySyncStatus from "@/components/EntrySyncStatus";
import BarItem from "@/components/BarItem";
import {SVG_PATHS} from "@/constants/svgPaths";
import SyncLoginPopup from "@/components/SyncLoginPopup";
import {useAuth} from "@/lib/context/auth";
import {reflectionsAiManager} from "@/lib/ai/reflectionsAiManager";
import type {EntryAiState} from "@/types/intelligenceTypes";

const db = new Database();

type AiFeature = "sentence_starter" | "autocomplete";

const logAiEligibility = (
    feature: AiFeature,
    stage: string,
    checks: Record<string, boolean>,
) => {
    const eligible = Object.values(checks).every(Boolean);
    console.debug(`[AI eligibility] ${feature}:${stage}`, {...checks, eligible});
    return eligible;
};

const isEntryBlank = (entry: Entry) => {
    return (
        entry.title.trim() === "" &&
        entry.content[0] === "" &&
        entry.drawingPaths.length === 0
    );
};

export default function EntryEditor({ initEntry } : { initEntry: Entry }) {
    const [mode, setMode] = useState<EditMode>("text");
    const [drawColor, setDrawColor] = useState<string>('#000000')
    const [drawHistory, setDrawHistory] = useState<DrawPath[]>([]);
    const [entry, setEntry] = useState<Entry>(initEntry);
    const [editorScale, setEditorScale] = useState(1);
    const [syncPopupVisible, setSyncPopupVisible] = useState(false);
    const [syncStatus, setSyncStatus] = useState<SyncStatus | "syncing">(initEntry.syncStatus ? "synced" : "pending");
    const [isOnline, setIsOnline] = useState(true);
    const [recentContent, setRecentContent] = useState<string[]>([]);
    const [focusedTextBlockIndex, setFocusedTextBlockIndex] = useState<number | null>(null);
    const [aiState, setAiState] = useState<EntryAiState>({
        autocomplete: undefined,
        status: isEntryBlank(initEntry) ? "loading" : "idle",
        sentence_starters: [],
        targetBlockIndex: isEntryBlank(initEntry) ? 0 : null,
        error: null,
    });
    const user = useAuth()

    const isFirstRender = useRef(true);
    const editorAreaRef = useRef<HTMLDivElement | null>(null);
    const latestEntryRef = useRef<Entry>(entry);
    const aiRequestRef = useRef<AbortController | null>(null);
    const aiRequestIdRef = useRef(0);
    const aiRequestTypeRef = useRef<"sentence_starter" | "autocomplete" | null>(null);
    const autocompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const focusedTextBlockIndexRef = useRef<number | null>(null);
    const initialSuggestionRequestedRef = useRef(false);
    const wasInitiallyBlankRef = useRef(isEntryBlank(initEntry));
    const editableEntryKey = [
        entry.title,
        entry.content,
        entry.date,
        entry.drawingPaths,
        entry.id
    ].join("|");

    useEffect(() => {
        latestEntryRef.current = entry;
    }, [entry]);

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
    }, [entry.id]);

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
                const storedEntries = (await db.getAll("reflections")) ?? [];
                if (cancelled) return;

                const previousContent = storedEntries
                    .filter((storedEntry) => storedEntry.id !== entry.id)
                    .filter((storedEntry) => storedEntry.content.length > 0)
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
    }, [entry.id]);

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

    useEffect(() => {
        if (isFirstRender.current) {
            window.scrollTo(0, 0);
            isFirstRender.current = false;
            return
        }

        if (isEntryBlank(latestEntryRef.current)) return;

        const saveTimeout = setTimeout(() => {
            const entryToSave: Entry = {...latestEntryRef.current, syncStatus: "pending", lastEditedAt: new Date().toISOString()};
            db.saveToLocalDB(entryToSave, "reflections");
            setEntry(entryToSave);
            syncStatus !== "syncing" && setSyncStatus("pending");
        }, 1000);

        const syncTimeout = setTimeout(async () => {
            if (entry.syncStatus === "synced") return;
            setSyncStatus("syncing");
            let syncedEntries;

            try {
                syncedEntries = await user.syncPendingEntries();
            } catch (error) {
                if (error instanceof Error && error.message === "Unauthorized") {
                    const res = await user.refresh()
                    if (!res.ok) {
                        console.warn("Unauthorized to sync entries");
                        setSyncPopupVisible(true);
                        return;
                    }

                    try {
                        syncedEntries = await user.syncPendingEntries();
                    } catch (error) {
                        console.error(error);
                    }
                }
            } finally {
                if (syncedEntries && syncedEntries.synced_entries.find((cur) => cur.id === entry.id)) {
                    setEntry((prevEntry: Entry) => ({...prevEntry, syncStatus: "synced"}));
                    setSyncStatus("synced");
                }
                else setSyncStatus("pending");
            }
        }, 15000);

        return () => {
            clearTimeout(saveTimeout);
            clearTimeout(syncTimeout);
        };
    }, [editableEntryKey])

    useEffect(() => {
        const updateScale = () => {
            const container = editorAreaRef.current;
            if (!container) return;

            const rect = container.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;

            const horizontalPadding = 24;
            const availableWidth = Math.max(320, rect.width - horizontalPadding);
            setEditorScale(Math.max(1, availableWidth / 320));
        };

        updateScale();

        const resizeObserver = new ResizeObserver(updateScale);
        if (editorAreaRef.current) {
            resizeObserver.observe(editorAreaRef.current);
        }

        return () => resizeObserver.disconnect();
    }, []);

    const drawUndo = () => {
        if (entry.drawingPaths.length === 0) return;
        setEntry((prevEntry: Entry) => ({...prevEntry, drawingPaths: prevEntry.drawingPaths.slice(0, -1)}));
        setDrawHistory((prevHistory: DrawPath[]) => [...prevHistory, entry.drawingPaths[entry.drawingPaths.length - 1]]);
    }

    const drawRedo = () => {
        if (drawHistory.length === 0) return;
        setEntry((prevEntry: Entry) => ({...prevEntry, drawingPaths: [...prevEntry.drawingPaths, drawHistory[drawHistory.length - 1]]}));
        setDrawHistory((prevHistory: DrawPath[]) => prevHistory.slice(0, -1));
    }

    return (
        <div className="flex flex-col place-items-center aspect-3/4 w-full h-full origin-top">
            {syncPopupVisible && (
                <SyncLoginPopup open={syncPopupVisible} onDismiss={() => setSyncPopupVisible(false)}></SyncLoginPopup>
            )}
            <input
                value={entry.title}
                onChange={(e) =>
                    setEntry({
                        ...entry,
                        title: e.target.value,
                    })
                }
                onClick={(e) => e.currentTarget.placeholder = ""}
                onBlur={(e) => e.currentTarget.innerText === "" ? e.currentTarget.placeholder = "untitled reflection" : null}
                maxLength={30}
                placeholder="untitled reflection"
                className="max-w-full bg-transparent text-center outline-none text-3xl sm:text-5xl md:text-6xl font-semibold font-flower tracking-wider text-black placeholder-black"
            />
            <div className="flex flex-col grow w-full max-w-2xl h-full gap-2 px-3 pb-3 pt-2 rounded-2xl mt-4">
                <EntryContext value={{
                    entry,
                    setEntry,
                    drawHistory,
                    drawColor,
                    setDrawColor,
                    editorScale,
                    aiState,
                    clearAiSuggestions,
                    focusedTextBlockIndex,
                    onTextBlockFocus: handleTextBlockFocus,
                    onTextBlockBlur: handleTextBlockBlur,
                    onTextBlockChange: handleTextBlockChange,
                }}>
                    <div className="flex flex-row justify-between text-lg md:text-3xl text-rose tracking-wider font-flower">
                        <DatePicker />
                    </div>
                    <div ref={editorAreaRef} className={"relative w-full h-full min-w-[320px] overflow-hidden flex flex-col flex-1 rounded-2xl"}>
                        <div
                            style={{
                                width: "320px",
                                height: "920px",
                                zoom: editorScale,
                            }}
                            className="relative flex overflow-hidden"
                        >
                            <DrawingArea focus={mode === "drawing"} />
                            <TextArea container={editorAreaRef} focus={mode === "text"} />
                        </div>
                    </div>
                </EntryContext>
            </div>
            <div className={"fixed w-full flex flex-row justify-center items-center my-5 bottom-0 h-20 gap-1 text-lg z-50"}>
                <div className="flex flex-row rounded-2xl border border-white/40 bg-rose/15 p-0.5 shadow-[0_8px_32px_rgba(73,88,103,0.18)] backdrop-blur-xl backdrop-saturate-150 ring-1 ring-rose/10">
                    <BarItem iconSize={22} svgPaths={SVG_PATHS.reverseIcon} label={"undo drawing tool"} onClick={() => drawUndo()} />
                    <BarItem iconSize={22} svgPaths={SVG_PATHS.forwardIcon} label={"redo drawing tool"} onClick={() => drawRedo()} />
                    <BarItem iconSize={22} svgPaths={SVG_PATHS.drawIcon} label={"draw tool"} fill={mode === "drawing" ? "#ce796b" : "#000000"} onClick={() => setMode(mode === "drawing" ? "text" : "drawing")} />
                    <EntrySyncStatus syncStatus={syncStatus} />
                </div>
            </div>
        </div>
    )
}
