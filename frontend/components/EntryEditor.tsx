"use client"
import {useEffect, useState} from "react";
import type {Entry} from "@/types/entryTypes";
import {EntryContext} from "@/utils/entryContext";
import DatePicker from "@/components/DatePicker";
import DrawingArea from "@/components/DrawingArea";
import TextArea from "@/components/TextArea";
import EntryEditorSurface from "@/components/EntryEditorSurface";
import EntryEditorToolbar from "@/components/EntryEditorToolbar";
import SyncLoginPopup from "@/components/SyncLoginPopup";
import {isEntryBlank} from "@/lib/entry-editor/isEntryBlank";
import {useEntryAiSuggestions} from "@/lib/entry-editor/useEntryAiSuggestions";
import {useEntryPersistence} from "@/lib/entry-editor/useEntryPersistence";
import {useDrawingTools} from "@/lib/entry-editor/useDrawingTools";

export default function EntryEditor({ initEntry } : { initEntry: Entry }) {
    const [entry, setEntry] = useState<Entry>(initEntry);
    const {mode, drawUndo, drawRedo, toggleDrawingMode} = useDrawingTools(entry, setEntry);
    const {syncStatus, syncPopupVisible, dismissSyncPopup} = useEntryPersistence(entry, setEntry);
    const suggestions = useEntryAiSuggestions(entry, isEntryBlank(initEntry));

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="flex flex-col place-items-center aspect-3/4 w-full h-full origin-top">
            {syncPopupVisible && (
                <SyncLoginPopup open={syncPopupVisible} onDismiss={dismissSyncPopup}></SyncLoginPopup>
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
                <EntryContext value={{entry, setEntry}}>
                    <div className="flex flex-row justify-between text-lg md:text-3xl text-rose tracking-wider font-flower">
                        <DatePicker />
                    </div>
                    <EntryEditorSurface>
                        <DrawingArea focus={mode === "drawing"} />
                        <TextArea focus={mode === "text"} suggestions={suggestions} />
                    </EntryEditorSurface>
                </EntryContext>
            </div>
            <EntryEditorToolbar
                mode={mode}
                syncStatus={syncStatus}
                onUndo={drawUndo}
                onRedo={drawRedo}
                onToggleDrawingMode={toggleDrawingMode}
            />
        </div>
    )
}
