"use client"

import DrawIcon from "@/components/DrawIcon";
import {AnimatePresence, motion} from "motion/react";

interface SidebarItemProps {
    svgPaths: string[];
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
    fill = "black",
    iconSize = 30,
    strokeWidth = 2,
    className = "flex aspect-square w-10 cursor-pointer flex-row items-center justify-center text-nowrap rounded-xl py-1 font-flower transition-colors hover:bg-white/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose/30",
}: SidebarItemProps) {
    return (
        <motion.div aria-label={label} className={className} onClick={onClick} animate={{}}>
            <DrawIcon fill={fill} svgPaths={svgPaths} strokeWidth={strokeWidth} iconSize={iconSize} />
        </motion.div>
    );
}
