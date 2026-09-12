"use client"

import DrawIcon from "@/components/DrawIcon";
import { motion } from "motion/react";
import {JSX} from "react";

interface SidebarItemProps {
    svgPaths: string[];
    dropDown?: boolean;
    dropDownItems?: { text: string, onClick: () => {} }[];
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
                <motion.div className="absolute top-15 aspect-square flex-col items-start justify-start text-nowrap rounded-xl p-1 text-sm font-mono transition-colors bg-rose/35">
                    { dropDownItems.map((item, index) => (
                        <div className="rounded-lg p-1 cursor-pointer hover:bg-white/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose/30" onClick={item.onClick} key={index + item.text}>{item.text}</div>
                    )) }
                </motion.div>
            }
        </motion.div>
    );
}
