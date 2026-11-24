import BarItem from "@/components/BarItem";
import EntrySyncStatus from "@/components/EntrySyncStatus";
import {SVG_PATHS} from "@/constants/svgPaths";
import type {EditMode} from "@/types/customTypes";
import type {SyncStatus} from "@/types/entryTypes";

type EntryEditorToolbarProps = {
    mode: EditMode;
    syncStatus: SyncStatus | "syncing";
    onUndo: () => void;
    onRedo: () => void;
    onToggleDrawingMode: () => void;
};

export default function EntryEditorToolbar({
    mode,
    syncStatus,
    onUndo,
    onRedo,
    onToggleDrawingMode,
}: EntryEditorToolbarProps) {
    return (
        <div className={"fixed w-full flex flex-row justify-center items-center my-5 bottom-0 h-20 gap-1 text-lg z-50"}>
            <div className="flex flex-row rounded-2xl border border-white/40 bg-rose/15 p-0.5 shadow-[0_8px_32px_rgba(73,88,103,0.18)] backdrop-blur-xl backdrop-saturate-150 ring-1 ring-rose/10">
                <BarItem iconSize={22} svgPaths={SVG_PATHS.reverseIcon} label={"undo drawing tool"} onClick={onUndo} />
                <BarItem iconSize={22} svgPaths={SVG_PATHS.forwardIcon} label={"redo drawing tool"} onClick={onRedo} />
                <BarItem iconSize={22} svgPaths={SVG_PATHS.drawIcon} label={"draw tool"} fill={mode === "drawing" ? "#ce796b" : "#000000"} onClick={onToggleDrawingMode} />
                <EntrySyncStatus syncStatus={syncStatus} />
            </div>
        </div>
    );
}
