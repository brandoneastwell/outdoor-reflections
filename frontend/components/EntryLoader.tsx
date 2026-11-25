"use client"
import EntryEditor from "@/components/EntryEditor";
import Database from "../lib/database";
import {Entry} from "@/types/entryTypes";
import {useEffect, useState} from "react";
import {useAuth} from "@/lib/context/auth";
import {normalizeEntry} from "@/utils/entryUtils";


export default function EntryLoader({ id } : { id: string }) {
    const {userId} = useAuth();
    const [missing, setMissing] = useState(false);
    const [entry, setEntry] = useState<Entry | null>(null)

    useEffect(() => {
        const db = new Database();
        let cancelled = false;

        async function loadEntry() {
            try {
                const data = await db.get(id, "reflections", userId ?? undefined);
                if (cancelled) return;
                setEntry(data ? normalizeEntry(data) : null);
                setMissing(!data);
            } catch (error) {
                if (!cancelled) setMissing(true);
            }
        }

        void loadEntry();
        return () => { cancelled = true; };
    }, [id, userId]);

    return (
        missing ? <p role="alert">Could not open this reflection.</p>
            : entry?.id === id && entry.userId === (userId ?? undefined) && <EntryEditor key={entry.id} initEntry={entry} />
    )
}
