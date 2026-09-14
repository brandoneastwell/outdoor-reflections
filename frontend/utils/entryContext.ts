import {createContext, Dispatch, SetStateAction} from "react";
import {DrawPath, Entry} from "@/types/entryTypes";

type EntryContextValue = {
    entry: Entry;
    setEntry: Dispatch<SetStateAction<Entry>>;
    drawHistory: DrawPath[];
    drawColor: string;
    setDrawColor: Dispatch<SetStateAction<string>>;
    editorScale: number;
};

export const EntryContext = createContext<EntryContextValue>({
    entry: {
        title: "",
        content: [],
        date: "",
        drawingPaths: [],
        syncStatus: "pending",
        last_synced_at: null,
        createdAt: "",
        updated_at: "",
        id: ""
    },
    setEntry: () => {},
    drawHistory: [],
    drawColor: "#000000",
    setDrawColor: () => {},
    editorScale: 1,
});
