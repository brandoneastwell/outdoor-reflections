"use client"
import {useRouter} from "next/navigation";
import {createEmptyEntry} from "@/utils/entryUtils";
import {cn} from "@/lib/utils";

export default function StartButton({label = "Let's start", className}: {label?: string; className?: string}) {
    const router = useRouter();

    async function handleClick() {
        const emptyEntry = await createEmptyEntry();
        router.push(`/entry/${emptyEntry.id}`);
    }

    return (
        <button type="button" onClick={handleClick} className={cn(
            "flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-rose px-5 font-mono text-sm font-semibold text-white shadow-[0_8px_24px_rgba(206,121,107,0.2)] transition-all hover:-translate-y-0.5 hover:bg-blue-slate hover:shadow-[0_12px_30px_rgba(73,88,103,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose/40 focus-visible:ring-offset-2 active:translate-y-0 md:w-39.5",
            className,
        )}>
            {label}<span aria-hidden="true">→</span>
        </button>
    )
}
