"use client"
import DrawIcon from "@/components/DrawIcon";
import {SVG_PATHS} from "@/constants/svgPaths";
import {SyncStatus} from "@/types/entryTypes";
import { motion } from "motion/react"


export default function EntrySyncStatus({ syncStatus } : { syncStatus: SyncStatus | "syncing" }) {
    return (
        <div className="absolute ml-1.5 left-full place-self-center flex flex-row font-mono text-sm rounded-2xl p-0.5">
            { syncStatus === "synced" && (
                <DrawIcon fill={"green"} strokeWidth={2} iconSize={16} svgPaths={SVG_PATHS.syncedIcon} />
            )}
            { syncStatus === "pending" && (
                <DrawIcon fill={"red"} strokeWidth={2} iconSize={16} svgPaths={SVG_PATHS.unsyncedIcon} />
            )}
            { syncStatus === "syncing" && <LoadingCircleSpinner />}
        </div>
    )
}

function LoadingCircleSpinner() {
    return (
        <div className="flex justify-center items-center">
            <motion.div
                className="w-4 h-4 border-2 border-t-2 border-t-rose rounded-[50%]"
                animate={{ transform: "rotate(360deg)" }}
                transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: "easeIn",
                }}
            />
        </div>
    )
}

