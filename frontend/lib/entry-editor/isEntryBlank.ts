import type {Entry} from "@/types/entryTypes";

export const isEntryBlank = (entry: Entry) => {
    return (
        entry.title.trim() === "" &&
        entry.content[0] === "" &&
        entry.drawingPaths.length === 0
    );
};
