"use client"

import { SVG_PATHS } from "@/constants/svgPaths";
import {useEffect, useState} from "react";
import BarItem from "@/components/BarItem";
import {createEmptyEntry, isEntryEmpty} from "@/utils/entryUtils";
import {usePathname, useRouter} from "next/navigation";
import {useAuth} from "@/lib/context/auth";
import {AnimatePresence, motion} from "motion/react";

type DropDownItem = {
    text: string;
    onClick: () => void | Promise<void>;
};

export default function TopBar() {
    const [dropDownOpen, setDropDownOpen] = useState<boolean>(false);
    const [dropDownItems, setDropDownItems] = useState<DropDownItem[]>([])
    const user = useAuth()
    const pathname = usePathname();
    const router = useRouter();

    const profileDropDownItems = [
        { text: "Logout", onClick: () => user.logout() }
    ];

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (e.target instanceof HTMLElement) {
                if (e.target.closest(".dropdown") || e.target.closest(".dropdown-item")) return;
                setDropDownOpen(false);
            }
        };

        document.addEventListener("click", handleClick)

        return () => document.removeEventListener("click", handleClick);
    }, []);

    const profileOnClick = () => {
        if (dropDownOpen) return setDropDownOpen(false);
        if (user.userId) {
            setDropDownOpen(true);
            setDropDownItems(profileDropDownItems);
        }
        else router.push("/auth");
    }

    const createNewEntry = async () => {
        if (window.location.pathname.includes("/entry/")) {
            const id = window.location.pathname.split("/")[2]
            const isCurrentEntryEmpty = await isEntryEmpty(id)
            if (isCurrentEntryEmpty === true) return router.refresh();
        }

        const emptyEntry = await createEmptyEntry(user.userId);
        router.push(`/entry/${emptyEntry.id}`);
    }

    if (pathname === "/") return;

    return (
        <div className={"w-full my-5 h-20 flex flex-row place-items-center justify-center items-center gap-1 text-lg"}>
            <motion.div
                layout
                transition={{ layout: { duration: 0.22, ease: "easeOut" } }}
                className="fixed z-50 flex flex-col gap-1 overflow-hidden rounded-2xl border border-white/40 bg-rose/35 p-1 shadow-[0_8px_32px_rgba(73,88,103,0.18)] backdrop-blur-xl backdrop-saturate-150 ring-1 ring-rose/10">
                <div className="flex flex-row gap-1">
                    <BarItem
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
                <AnimatePresence>
                    {dropDownOpen &&
                    <motion.div
                        layout
                        initial={{ opacity: 0, height: 0, y: -6 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -6 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="dropdown z-50 min-w-28 overflow-hidden text-nowrap rounded-xl text-sm font-mono border border-white/20 bg-rose/5 p-1 shadow-[0_8px_32px_rgba(73,88,103,0.18)] backdrop-blur-xl backdrop-saturate-150 ring-1 ring-rose/10"
                    >
                        { dropDownItems.map((item, index) => (
                            <div className="dropdown-item rounded-lg p-1 cursor-pointer hover:bg-white/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose/30" onClick={item.onClick} key={index + item.text}>{item.text}</div>
                        )) }
                    </motion.div>
                    }
                </AnimatePresence>
            </motion.div>
        </div>
    )
}
