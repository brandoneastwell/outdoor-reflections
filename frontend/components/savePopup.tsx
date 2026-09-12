"use client"

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import Database from "@/lib/database";
import {useAuth} from "@/lib/context/auth";
import {normalizeEntry} from "@/utils/entryUtils";
import {Entry} from "@/types/entryTypes";

const db = new Database();

export default function SavePopup() {
    const [localEntries, setLocalEntries] = useState<Entry[]>([]);
    const [dismissed, setDismissed] = useState(false);
    const [saving, setSaving] = useState(false);
    const { userId } = useAuth();
    const router = useRouter();

    useEffect(() => {
        async function loadLocalEntries() {
            if (!userId || dismissed) return;

            const storedEntries = (await db.getAll("reflections")) ?? [];
            const entriesOnDevice = storedEntries
                .map(normalizeEntry)
                .filter((entry) => entry.user_id === undefined);

            setLocalEntries(entriesOnDevice);
        }

        loadLocalEntries();
    }, [dismissed, userId]);

    async function saveEntriesToAccount() {
        if (!userId) return;
        setSaving(true);

        try {
            await Promise.all(
                localEntries.map((entry) =>
                    db.saveToLocalDB(
                        {
                            ...entry,
                            user_id: userId,
                            sync_status: "pending",
                            updated_at: new Date().toISOString(),
                        },
                        "reflections"
                    )
                )
            );

            setLocalEntries([]);
            router.push("/entries");
        } finally {
            setSaving(false);
        }
    }

    if (!userId || dismissed || localEntries.length === 0) return null;
    const entryLabel = localEntries.length === 1 ? "entry" : "entries";

    return (
        <div className="fixed inset-x-3 bottom-6 z-[60] flex justify-center font-mono sm:bottom-8">
            <div className="w-full max-w-md rounded-2xl p-4 border-white/40 bg-rose/20 shadow-[0_8px_32px_rgba(73,88,103,0.18)] backdrop-blur-xl backdrop-saturate-150 ring-1 ring-rose/10">
                <p className="text-sm">
                    You have {localEntries.length} {entryLabel} saved on this device. Add {localEntries.length === 1 ? "it" : "them"} to your account?
                </p>
                <div className="mt-2 flex justify-end gap-2">
                    <button
                        type="button"
                        className="rounded-xl cursor-pointer px-2 py-2 text-sm transition-colors hover:bg-rose/10 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => setDismissed(true)}
                        disabled={saving}
                    >
                        Not now
                    </button>
                    <button
                        type="button"
                        className="rounded-xl cursor-pointer bg-rose px-2 py-2 text-sm text-white shadow-sm transition-colors hover:bg-blue-slate disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={saveEntriesToAccount}
                        disabled={saving}
                    >
                        {saving ? "Saving..." : "Add to account"}
                    </button>
                </div>
            </div>
        </div>
    );
}
