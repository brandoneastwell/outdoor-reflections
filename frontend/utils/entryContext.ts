import {createContext, Dispatch} from "react";
import type {Entry} from "@/types/entryTypes";

export type StateSetter<T> = Dispatch<T | ((previousState: T) => T)>;

type EntryContextValue = {
    entry: Entry;
    setEntry: StateSetter<Entry>;
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
});
