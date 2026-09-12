"use client"

import DrawIcon from "@/components/DrawIcon";
import {AnimatePresence, motion} from "motion/react";

interface SidebarItemProps {
    svgPaths: string[];
    dropDown?: boolean;
    dropDownItems?: { text: string, onClick: () => void | Promise<void> }[];
    dropDownOpen?: boolean;
    label: string;
    onClick?: () => void;
    iconSize?: number;
    strokeWidth?: number;
    className?: string;
    fill?: string;
}

export default function BarItem({
    svgPaths,
    label,
    onClick,
    dropDown,
    dropDownItems,
    dropDownOpen,
    fill = "black",
    iconSize = 30,
    strokeWidth = 2,
    className = "flex aspect-square w-10 cursor-pointer flex-row items-center justify-center text-nowrap rounded-xl py-1 font-flower transition-colors hover:bg-white/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose/30",
}: SidebarItemProps) {
    return (
        <motion.div aria-label={label} className={className} onClick={onClick} animate={{}}>
            <DrawIcon fill={fill} svgPaths={svgPaths} strokeWidth={strokeWidth} iconSize={iconSize} />
            <AnimatePresence>
                {dropDown && dropDownOpen && dropDownItems &&
                        <motion.div
                            initial={{ opacity: 0, top: 50 }}
                            animate={{ opacity: 1, top: 60 }}
                            exit={{ opacity: 0, top: 50 }}
                            className="dropdown absolute z-50 min-w-28 overflow-hidden text-nowrap rounded-xl text-sm font-mono border border-white/40 bg-rose/35 p-1 shadow-[0_8px_32px_rgba(73,88,103,0.18)] backdrop-blur-xl backdrop-saturate-150 ring-1 ring-rose/10"
                        >
                            { dropDownItems.map((item, index) => (
                                <div className="dropdown-item rounded-lg p-1 cursor-pointer hover:bg-white/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose/30" onClick={item.onClick} key={index + item.text}>{item.text}</div>
                            )) }
                        </motion.div>
                }
            </AnimatePresence>
        </motion.div>
    );
}
