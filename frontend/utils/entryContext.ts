import {createContext, Dispatch} from "react";
import {DrawPath, Entry} from "@/types/entryTypes";

type StateSetter<T> = Dispatch<T | ((previousState: T) => T)>;

type EntryContextValue = {
    entry: Entry;
    setEntry: StateSetter<Entry>;
    drawHistory: DrawPath[];
    drawColor: string;
    setDrawColor: StateSetter<string>;
    editorScale: number;
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
});
