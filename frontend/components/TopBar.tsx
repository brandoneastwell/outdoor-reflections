"use client"

import { SVG_PATHS } from "@/constants/svgPaths";
import {useState} from "react";
import BarItem from "@/components/BarItem";
import {createEmptyEntry, isEntryEmpty} from "@/utils/entryUtils";
import {usePathname, useRouter} from "next/navigation";

export default function TopBar() {
    const [toggleSidebar, setToggleSidebar] = useState<boolean>(false);
    const toggle = () => setToggleSidebar(!toggleSidebar);
    const pathname = usePathname();
    const router = useRouter();

    const createNewEntry = async () => {
        if (window.location.pathname.includes("/entry/")) {
            const id = window.location.pathname.split("/")[2]
            const isCurrentEntryEmpty = await isEntryEmpty(id)
            if (isCurrentEntryEmpty === true) return router.refresh();
        }

        const emptyEntry = await createEmptyEntry();
        router.push(`/entry/${emptyEntry.id}`);
    }

    if (pathname === "/") return;

    return (
        <div className={"w-full my-5 h-20 place-items-center justify-center gap-1 text-lg"}>
            <div className="fixed z-50 flex flex-row gap-1 rounded-2xl border border-white/40 bg-rose/35 p-1 shadow-[0_8px_32px_rgba(73,88,103,0.18)] backdrop-blur-xl backdrop-saturate-150 ring-1 ring-rose/10">
                <BarItem
                    svgPaths={SVG_PATHS.userIcon}
                    label="Login"
                    onClick={() => router.push("/auth")}
                />
                <BarItem
                    svgPaths={SVG_PATHS.flowerIcon}
                    label="reflections"
                    onClick={() => router.push("/entries")}
                    iconSize={42}
                    strokeWidth={1.5}
                />
                <BarItem
                    iconSize={25}
                    svgPaths={SVG_PATHS.newEntryIcon}
                    label="New entry"
                    onClick={createNewEntry}
                />
            </div>
        </div>
    )
}
