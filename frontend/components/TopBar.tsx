"use client"

import { SVG_PATHS } from "@/constants/svgPaths";
import {useEffect, useState} from "react";
import BarItem from "@/components/BarItem";
import {createEmptyEntry, isEntryEmpty} from "@/utils/entryUtils";
import {usePathname, useRouter} from "next/navigation";
import {useAuth} from "@/lib/context/auth";

export default function TopBar() {
    const [profileDropdownOpen, setProfileDropdownOpen] = useState<boolean>(false);
    const user = useAuth()
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        document.addEventListener("click", (e) => {
            if (e.target instanceof HTMLElement) {
                if (e.target.closest(".dropdown") || e.target.closest(".dropdown-item")) return;
                setProfileDropdownOpen(false);
            }
        })
    }, []);
    
    const profileOnClick = () => {
        if (profileDropdownOpen) return setProfileDropdownOpen(false);
        if (user.userId) setProfileDropdownOpen(true);
        else router.push("/auth");
    }

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
                    dropDownOpen={profileDropdownOpen}
                    dropDown={true}
                    dropDownItems={[
                        { onClick: async () => user.logout(), text: "logout" }
                    ]}
                    svgPaths={SVG_PATHS.userIcon}
                    label="Login"
                    onClick={profileOnClick}
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
