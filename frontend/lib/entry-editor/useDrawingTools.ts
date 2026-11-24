import {useState} from "react";
import type {EditMode} from "@/types/customTypes";
import type {DrawPath, Entry} from "@/types/entryTypes";
import type {StateSetter} from "@/utils/entryContext";

export function useDrawingTools(entry: Entry, setEntry: StateSetter<Entry>) {
    const [mode, setMode] = useState<EditMode>("text");
    const [drawHistory, setDrawHistory] = useState<DrawPath[]>([]);

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

    const toggleDrawingMode = () => {
        setMode(mode === "drawing" ? "text" : "drawing");
    };

    return {mode, drawUndo, drawRedo, toggleDrawingMode};
}
