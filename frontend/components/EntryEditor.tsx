"use client"
import {useEffect, useRef, useState} from "react";
import {EditMode} from "@/types/customTypes";
import {DrawPath, Entry} from "@/types/entryTypes";
import {EntryContext} from "@/utils/entryContext";
import Database from "../lib/database";
import DatePicker from "@/components/DatePicker";
import DrawingArea from "@/components/DrawingArea";
import TextArea from "@/components/TextArea";
import EntrySyncStatus from "@/components/EntrySyncStatus";
import BarItem from "@/components/BarItem";
import {SVG_PATHS} from "@/constants/svgPaths";
import {syncPendingEntries} from "@/lib/api/reflections";

const db = new Database();

const isEntryBlank = (entry: Entry) => {
    return (
        entry.title.trim() === "" &&
        entry.content[0] === "" &&
        entry.drawings.length === 0
    );
};

export default function EntryEditor({ initEntry } : { initEntry: Entry }) {
    const [mode, setMode] = useState<EditMode>("text");
    const [drawColor, setDrawColor] = useState<string>('#000000')
    const [drawHistory, setDrawHistory] = useState<DrawPath[]>([]);
    const [entry, setEntry] = useState<Entry>(initEntry);
    const [editorScale, setEditorScale] = useState(1);

    const isFirstRender = useRef(true);
    const editorAreaRef = useRef<HTMLDivElement | null>(null);
    const latestEntryRef = useRef<Entry>(entry);
    const editableEntryKey = [
        entry.title,
        entry.content,
        entry.date,
        entry.drawings,
    ].join("|");

    useEffect(() => {
        latestEntryRef.current = entry;
    }, [entry]);

    useEffect(() => {
        if (isFirstRender.current) {
            window.scrollTo(0, 0);
            isFirstRender.current = false;
            return
        }

        if (isEntryBlank(latestEntryRef.current)) return;

        const saveTimeout = setTimeout(() => {
            const entryToSave: Entry = {...latestEntryRef.current, sync_status: "pending", last_edited_at: new Date().toISOString()};
            db.saveToLocalDB(entryToSave, "reflections");
            setEntry(entryToSave);
        }, 1000);

        const syncTimeout = setTimeout(async () => {
            if (entry.sync_status === "synced") return;
            let syncedEntries;

            try {
                syncedEntries = await syncPendingEntries();
            } catch (error) {
                console.warn(error);
            }

            if (syncedEntries && syncedEntries.synced_entries.find((cur) => cur.id === entry.id)) {
                setEntry((prevEntry: Entry) => ({...prevEntry, sync_status: "synced"}));
            }
        }, 10000);

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
        if (entry.drawings.length === 0) return;
        setEntry((prevEntry: Entry) => ({...prevEntry, drawings: prevEntry.drawings.slice(0, -1)}));
        setDrawHistory((prevHistory: DrawPath[]) => [...prevHistory, entry.drawings[entry.drawings.length - 1]]);
    }

    const drawRedo = () => {
        if (drawHistory.length === 0) return;
        setEntry((prevEntry: Entry) => ({...prevEntry, drawings: [...prevEntry.drawings, drawHistory[drawHistory.length - 1]]}));
        setDrawHistory((prevHistory: DrawPath[]) => prevHistory.slice(0, -1));
    }

    return (
        <div className="flex flex-col place-items-center aspect-3/4 w-full h-full origin-top">
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
                <EntryContext value={{entry, setEntry, drawHistory, drawColor, setDrawColor, editorScale}}>
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
                    <EntrySyncStatus isEntrySynced={entry.sync_status === "synced"} />
                </div>
            </div>
        </div>
    )
}
