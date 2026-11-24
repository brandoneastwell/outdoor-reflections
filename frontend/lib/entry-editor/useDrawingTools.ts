import {useState} from "react";
import type {Dispatch, SetStateAction} from "react";
import type {EditMode} from "@/types/customTypes";
import type {DrawPath, Entry} from "@/types/entryTypes";

export function useDrawingTools(entry: Entry, setEntry: Dispatch<SetStateAction<Entry>>) {
    const [mode, setMode] = useState<EditMode>("text");
    const [drawColor, setDrawColor] = useState<string>('#000000')
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
        setMode((previousMode) => previousMode === "drawing" ? "text" : "drawing");
    };

    return {mode, drawColor, setDrawColor, drawHistory, drawUndo, drawRedo, toggleDrawingMode};
}
