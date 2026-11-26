"use client"

import { SVG_PATHS } from "@/constants/svgPaths";
import {useEffect, useRef, useState} from "react";
import AccountSettingsDialog from "./AccountSettingsDialog";
import BarItem from "@/components/BarItem";
import {isEntryEmpty} from "@/utils/entryUtils";
import {usePathname, useRouter} from "next/navigation";
import {useJournalUnlocked} from "@/lib/vault/encryption-session";
import {useAuth} from "@/lib/context/auth";
import {AnimatePresence, motion} from "motion/react";

export default function TopBar() {
    const [dropDownOpen, setDropDownOpen] = useState<boolean>(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const topBar = useRef<HTMLDivElement>(null);
    const user = useAuth();
    const unlocked = useJournalUnlocked();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const handleClick = (event: MouseEvent) => {
            if (event.target instanceof Node && !topBar.current?.contains(event.target)) setDropDownOpen(false);
        };
        document.addEventListener("click", handleClick);
        return () => document.removeEventListener("click", handleClick);
    }, []);

    const profileOnClick = () => {
        if (dropDownOpen) return setDropDownOpen(false);
        if (user.userId) {
            setDropDownOpen(true);
        }
        else router.push("/auth");
    }

    const createNewEntry = async () => {
        if (unlocked && window.location.pathname.startsWith("/entry/") && window.location.pathname !== "/entry/new") {
            const id = window.location.pathname.split("/")[2]
            const isCurrentEntryEmpty = await isEntryEmpty(id, user.userId ?? undefined)
            if (isCurrentEntryEmpty === true) return router.refresh();
        }

        router.push("/entry/new");
    }

    if (pathname === "/") return;

    return (
        <div className="my-5 h-20 w-full text-lg">
            <div
                ref={topBar}
                className="fixed inset-x-0 top-9 z-50 mx-auto flex w-fit flex-col gap-1 overflow-hidden rounded-2xl border border-white/40 bg-rose/35 p-1 shadow-[0_8px_32px_rgba(73,88,103,0.18)] backdrop-blur-xl backdrop-saturate-150 ring-1 ring-rose/10">
                <div className="flex flex-row gap-1">
                    <BarItem
                        svgPaths={SVG_PATHS.userIcon}
                        label={user.userId ? "Account menu" : "Login"}
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
                <AnimatePresence>
                    {dropDownOpen &&
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="dropdown z-50 min-w-28 overflow-hidden text-nowrap rounded-xl text-sm font-mono border border-white/20 bg-rose/5 p-1 shadow-[0_8px_32px_rgba(73,88,103,0.18)] backdrop-blur-xl backdrop-saturate-150 ring-1 ring-rose/10"
                    >
                        <button type="button" className="block w-full cursor-pointer rounded-lg p-2 text-left hover:bg-white/30" onClick={() => {
                            setDropDownOpen(false);
                            setSettingsOpen(true);
                        }}>Settings</button>
                        <button type="button" className="block w-full cursor-pointer rounded-lg p-2 text-left hover:bg-white/30" onClick={() => {
                            setDropDownOpen(false);
                            void user.logout();
                        }}>Logout</button>
                    </motion.div>
                    }
                </AnimatePresence>
            </div>
            <AccountSettingsDialog
                open={settingsOpen && Boolean(user.userId)}
                onOpenChange={setSettingsOpen}
                onRestoreFocus={() => topBar.current?.querySelector<HTMLButtonElement>('[aria-label="Account menu"]')?.focus()}
            />
        </div>
    )
}
