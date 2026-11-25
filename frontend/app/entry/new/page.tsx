"use client";

import {useEffect, useRef, useState} from "react";
import {useRouter} from "next/navigation";
import {useAuth} from "@/lib/context/auth";
import {createEmptyEntry} from "@/utils/entryUtils";

export default function NewReflection() {
    const {userId} = useAuth();
    const router = useRouter();
    const creation = useRef<ReturnType<typeof createEmptyEntry> | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        creation.current ??= createEmptyEntry(userId);
        void creation.current.then(
            ({id}) => { if (!cancelled) router.replace(`/entry/${id}`); },
            () => { if (!cancelled) setFailed(true); },
        );
        return () => { cancelled = true; };
    }, [router, userId]);

    return <p className="p-6 text-sm" role={failed ? "alert" : "status"}>
        {failed ? "Could not create a reflection. Return to your journal and try again." : "Creating reflection…"}
    </p>;
}
