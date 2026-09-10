"use client"

import DrawIcon from "@/components/DrawIcon";
import { motion } from "motion/react";
import {JSX} from "react";

interface SidebarItemProps {
    svgPaths: string[];
    dropDown?: boolean;
    dropDownItems?: JSX.Element[];
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
            {dropDown && dropDownOpen && dropDownItems &&
                <motion.div className="flex aspect-square cursor-pointer flex-col items-start justify-start text-nowrap rounded-xl py-1 font-mono transition-colors hover:bg-white/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose/30">
                    { dropDownItems.map((item) => (
                        item
                    )) }
                </motion.div>
            }
        </motion.div>
    );
}
