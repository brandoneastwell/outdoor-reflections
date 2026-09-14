"use client"
import Database from "@/lib/database";
import {Entry} from "@/types/entryTypes";
import {useAuth} from "@/lib/context/auth";
import {useEffect, useState} from "react";
import {createEmptyEntry, normalizeEntry, sortEntriesByLastUpdated} from "@/utils/entryUtils";
import {useRouter} from "next/navigation";
import DrawIcon from "@/components/DrawIcon";
import {SVG_PATHS} from "@/constants/svgPaths";

const db = new Database();

export default function Entries() {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const { userId } = useAuth()
    const router = useRouter();

    useEffect(() => {
        async function loadEntries() {
            try {
                const storedEntries = (await db.getAll('reflections')) ?? [];
                const normalizedEntries = storedEntries.map(normalizeEntry);

                const filteredEntries = !userId
                    ? normalizedEntries.filter((entry) => entry.userId === undefined)
                    : normalizedEntries.filter((entry) => entry.userId === userId);

                sortEntriesByLastUpdated(filteredEntries)
                setEntries(filteredEntries);
            } catch (error) {
                console.error("Failed loading IndexedDB entries:", error);
            } finally {
                setLoading(false);
            }
        }

        loadEntries()
    }, [userId]);

    function handleEntryClick(entryId: string) {
        router.push(`/entry/${entryId}`);
    }

    async function createFirstEntry() {
        const entry = await createEmptyEntry(userId)
        router.push(`/entry/${entry.id}`);
    }

    return (
        <div>
            { !loading && entries.length === 0 && (
                <div className="mx-auto mt-4 flex min-h-[45vh] w-full max-w-lg flex-col items-center justify-center rounded-2xl border border-white/60 bg-white/70 px-6 py-10 text-center font-mono text-blue-slate shadow-[0_10px_35px_rgba(73,88,103,0.12)]">
                    <div className="mb-5 flex size-20 items-center justify-center">
                        <DrawIcon svgPaths={SVG_PATHS.flowerIcon} strokeWidth={1.5} iconSize={54} fill={"#ce796b"} />
                    </div>
                    <h2 className="font-flower text-4xl font-semibold text-rose">Create your first entry</h2>
                    <p className="mt-3 max-w-sm text-sm leading-6 text-blue-slate/80">
                        A blank reflection is ready when you are.
                    </p>
                    <button
                        type="button"
                        onClick={createFirstEntry}
                        className="mt-6 rounded-xl bg-rose px-5 py-3 text-sm text-white shadow-sm transition-colors cursor-pointer hover:bg-blue-slate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose/40"
                    >
                        Create entry
                    </button>
                </div>
            )}
            { !loading && entries.length > 0 &&
                <div className={"grid grid-cols-2 gap-2 gap-y-8 font-mono sm:grid-cols-3 lg:grid-cols-4 lg:gap-4 lg:px-10"}>
                    { entries.map(entry => (
                    <div key={entry.id} onClick={() => handleEntryClick(entry.id)} className="flex flex-col gap-1 p-3 rounded-xl bg-white/90 aspect-square hover:cursor-pointer">
                        <div className="flex flex-row justify-between w-full h-6 px-1 overflow-hidden">
                            <p>{entry.title ? entry.title : 'untitled reflection'}</p>
                        </div>
                        <div className="bg-rose/10 rounded-xl h-full p-2 blur-[1px] overflow-hidden">
                            { entry.content.map((paragraph, index) =>
                                <p key={index} className="text-xs">{paragraph}</p>
                            )}
                            <svg viewBox="0 0 320 920">
                                {entry.drawingPaths.map((drawPath, index) => (
                                    <path key={index} d={drawPath.path} fill={drawPath.color} />
                                ))}
                            </svg>
                        </div>
                    </div>
                    ))}
                </div>
            }
        </div>
    )
}
