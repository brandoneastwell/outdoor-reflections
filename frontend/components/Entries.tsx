"use client"
import Database from "@/lib/database";
import {Entry} from "@/types/entryTypes";
import {useAuth} from "@/lib/context/auth";
import {useEffect, useState} from "react";
import {normalizeEntry, sortEntriesByLastUpdated} from "@/utils/entryUtils";
import {useRouter} from "next/navigation";

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
                    ? normalizedEntries.filter((entry) => entry.user_id === undefined)
                    : normalizedEntries.filter((entry) => entry.user_id === userId);

                sortEntriesByLastUpdated(filteredEntries)
                setEntries(filteredEntries);
            } finally {
                setLoading(false);
            }
        }

        loadEntries()
    }, [userId]);

    function handleEntryClick(entryId: string) {
        router.push(`/entry/${entryId}`);
    }

    return (
        <div>
            { loading && <p>Loading...</p> }
            { !loading && entries.length === 0 && <p>Create your first entry</p> }
            { !loading &&
                <div className={"grid grid-cols-2 gap-2 font-mono sm:grid-cols-3 lg:grid-cols-4 lg:gap-4 lg:px-10 "}>
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
                                {entry.drawings.map((drawPath, index) => (
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
