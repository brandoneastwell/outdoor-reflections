"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {useEffect, useState} from "react";
import DrawIcon from "@/components/DrawIcon";
import {SVG_PATHS} from "@/constants/svgPaths";
import {useAuth} from "@/lib/context/auth";
import Database from "@/lib/database";
import type {Entry} from "@/types/entryTypes";
import {createEmptyEntry, normalizeEntry, sortEntriesByDate, type EntrySortField} from "@/utils/entryUtils";

const db = new Database();

export default function Entries() {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [deleteMessage, setDeleteMessage] = useState("");
    const [hideEmpty, setHideEmpty] = useState(false);
    const [sortField, setSortField] = useState<EntrySortField>("lastEditedAt");
    const {userId, syncPendingEntries, refresh} = useAuth();
    const router = useRouter();
    const ownedEntries = entries.filter((entry) => entry.userId === (userId ?? undefined));
    const visibleEntries = sortEntriesByDate(
        ownedEntries.filter((entry) => !hideEmpty || entry.content.some((block) => block.trim() !== "")),
        sortField,
    );

    useEffect(() => {
        let cancelled = false;

        async function loadEntries() {
            try {
                const storedEntries = (await db.getAll("reflections")) ?? [];
                const activeEntries = storedEntries.filter((entry) => !entry.deletedAt);
                if (!cancelled) setEntries(activeEntries.map(normalizeEntry));
            } catch (error) {
                console.error("Failed loading IndexedDB entries:", error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void loadEntries();
        return () => { cancelled = true; };
    }, [userId]);

    async function createEntry() {
        const entry = await createEmptyEntry(userId);
        router.push(`/entry/${entry.id}`);
    }

    async function deleteEntry(entry: Entry) {
        if (deleting || entry.userId !== (userId ?? undefined)) return;
        const title = entry.title.trim() || "Untitled reflection";
        if (!window.confirm(`Delete “${title}”? This permanently removes the reflection.`)) return;

        setDeleting(true);
        setDeleteMessage("");
        try {
            const deletedAt = new Date().toISOString();
            const saved = await db.saveToLocalDB({
                ...entry,
                title: "",
                content: [],
                drawingPaths: [],
                deletedAt,
                lastEditedAt: deletedAt,
                syncStatus: entry.userId === undefined ? "synced" : "pending",
            }, "reflections");

            if (saved === undefined) {
                setDeleteMessage("Could not delete the reflection. Please try again.");
                return;
            }

            setEntries((previous: Entry[]) => previous.filter(({id}) => id !== entry.id));
            if (entry.userId === undefined) return;

            if (navigator.onLine) {
                try {
                    const result = await syncPendingEntries().catch(async (error: unknown) => {
                        if (!(error instanceof Error) || error.message !== "Unauthorized") throw error;
                        const response = await refresh();
                        return response.ok ? syncPendingEntries() : undefined;
                    });
                    if (result?.synced_entries.some(({id, deletedAt}) => id === entry.id && deletedAt)) return;
                } catch {
                    // The saved deletion stays pending until sync acknowledges it.
                }
            }
            setDeleteMessage("Deletion will sync when you reconnect.");
        } finally {
            setDeleting(false);
        }
    }

    return (
        <main className="mx-auto w-full max-w-6xl px-5 pt-2 pb-12 text-[#362528] sm:px-8">
            <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#ead9d3] pb-4">
                <h1 className="font-flower text-4xl leading-none font-semibold sm:text-5xl">Your reflections</h1>
                <div className="flex flex-wrap items-center gap-2">
                    <details className="relative open:z-20">
                        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-[#ead9d3] px-3 py-2 text-sm font-semibold hover:bg-[#f4e2de] focus-visible:outline-2 focus-visible:outline-[#a23743] [&::-webkit-details-marker]:hidden">
                            Filter &amp; sort <span aria-hidden="true">▾</span>
                        </summary>
                        <div className="absolute top-full left-0 mt-2 grid w-52 gap-3 rounded-xl border border-[#ead9d3] bg-[#fffaf2] p-3 text-sm shadow-md">
                            <label className="flex cursor-pointer items-center gap-2">
                                <input type="checkbox" checked={hideEmpty} onChange={(event) => setHideEmpty(event.target.checked)} className="accent-[#a23743]" />
                                Hide empty reflections
                            </label>
                            <label className="grid gap-1">
                                Sort by
                                <select value={sortField} onChange={(event) => setSortField(event.target.value as EntrySortField)} className="rounded-md border border-[#ead9d3] bg-white p-1.5">
                                    <option value="lastEditedAt">Last edited</option>
                                    <option value="createdAt">Creation date</option>
                                    <option value="date">Entry date</option>
                                </select>
                            </label>
                        </div>
                    </details>
                    <button
                        type="button"
                        onClick={createEntry}
                        className="cursor-pointer rounded-full bg-[#a23743] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#7f2632] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a23743]"
                    >
                        <span aria-hidden="true">+ </span>New reflection
                    </button>
                </div>
            </header>

            {deleteMessage && <p role="status" className="mb-4 text-sm text-[#654d50]">{deleteMessage}</p>}
            {loading && <p role="status" className="text-sm text-[#654d50]">Loading reflections…</p>}
            {!loading && hideEmpty && ownedEntries.length > 0 && visibleEntries.length === 0 && (
                <p role="status" className="text-sm text-[#654d50]">No reflections with text.</p>
            )}
            {!loading && ownedEntries.length === 0 && (
                <div className="mx-auto flex min-h-[36vh] max-w-lg flex-col items-center justify-center rounded-2xl border border-[#ead9d3] bg-[#faf5ee] px-6 py-8 text-center">
                    <span aria-hidden="true">
                        <DrawIcon svgPaths={SVG_PATHS.flowerIcon} strokeWidth={1.5} iconSize={54} fill="#9b3c48" />
                    </span>
                    <h2 className="mt-3 font-flower text-3xl font-semibold text-[#9b3c48]">Your first reflection</h2>
                    <p className="mt-2 max-w-xs text-sm text-[#654d50]">Write a few lines or sketch something you noticed outside.</p>
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleEntries.map((entry) => (
                    <article key={entry.id} className="relative min-w-0 rounded-2xl border border-[#ead9d3] bg-[#fffaf2] shadow-sm transition-shadow hover:shadow-md">
                        <Link
                            href={`/entry/${entry.id}`}
                            className="block rounded-2xl p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a23743]"
                        >
                            <p className="pr-9 text-sm font-semibold text-[#9b3c48]">
                                {new Date(entry.date).toLocaleDateString("en-GB", {weekday: "long", day: "numeric", month: "long"})}
                            </p>
                            <h2 className="mt-1 truncate font-flower text-2xl font-semibold leading-tight">
                                {entry.title.trim() || "Untitled reflection"}
                            </h2>
                            <div aria-hidden="true" className="relative mt-3 h-36 overflow-hidden rounded-xl bg-[#f4e2de] px-3 py-2">
                                <div className="relative h-full blur-[1px]">
                                    {entry.content.map((paragraph, index) => (
                                        <p key={index} className="text-xs leading-5 break-words whitespace-pre-wrap">{paragraph}</p>
                                    ))}
                                    {entry.drawingPaths.length > 0 && (
                                        <svg className="absolute inset-0 w-full" viewBox="0 0 320 920">
                                            {entry.drawingPaths.map((drawPath, index) => (
                                                <path key={index} d={drawPath.path} fill={drawPath.color} />
                                            ))}
                                        </svg>
                                    )}
                                </div>
                            </div>
                        </Link>
                        <details className="absolute top-2 right-2 open:z-10">
                            <summary
                                aria-label={`Actions for ${entry.title.trim() || "Untitled reflection"}`}
                                className="grid size-9 cursor-pointer list-none place-items-center rounded-full text-xl text-[#9b3c48] hover:bg-[#f4e2de] focus-visible:outline-2 focus-visible:outline-[#a23743] [&::-webkit-details-marker]:hidden"
                            >
                                <span aria-hidden="true">⋯</span>
                            </summary>
                            <button
                                type="button"
                                disabled={deleting}
                                className="absolute top-full right-0 cursor-pointer rounded-lg border border-[#ead9d3] bg-[#fffaf2] px-3 py-2 text-sm font-semibold whitespace-nowrap text-[#9b3c48] shadow-md hover:bg-[#f4e2de] focus-visible:outline-2 focus-visible:outline-[#a23743] disabled:cursor-wait"
                                onClick={(event) => {
                                    const menu = event.currentTarget.closest("details");
                                    menu?.removeAttribute("open");
                                    menu?.querySelector("summary")?.focus();
                                    void deleteEntry(entry);
                                }}
                            >
                                Delete reflection
                            </button>
                        </details>
                    </article>
                ))}
            </div>
        </main>
    );
}
