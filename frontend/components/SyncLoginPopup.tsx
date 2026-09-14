"use client"

import { motion } from "motion/react";
import {useRouter} from "next/navigation";
import {popupVariant} from "@/utils/animations";

interface SyncLoginPopupProps {
    open: boolean;
    onDismiss?: () => void;
}

export default function SyncLoginPopup({ open, onDismiss }: SyncLoginPopupProps) {
    const router = useRouter();
    if (!open) return null;

    return (
        <motion.div variants={popupVariant} initial="hidden" animate="visible" exit="exit"
            className="fixed inset-x-3 bottom-6 z-[60] flex justify-center font-mono sm:bottom-8">
            <div className="w-full max-w-md rounded-2xl p-4 border-white/40 bg-rose/20 shadow-[0_8px_32px_rgba(73,88,103,0.18)] backdrop-blur-xl backdrop-saturate-150 ring-1 ring-rose/10">
                <p className="text-sm">
                    You can log in to save your changes online and keep them synced across devices.
                </p>
                <div className="mt-2 flex justify-end gap-2">
                    <button
                        type="button"
                        className="rounded-xl cursor-pointer px-2 py-2 text-sm transition-colors hover:bg-rose/10"
                        onClick={onDismiss}
                    >
                        Not now
                    </button>
                    <button
                        type="button"
                        className="rounded-xl cursor-pointer bg-rose px-2 py-2 text-sm text-white shadow-sm transition-colors hover:bg-blue-slate"
                        onClick={() => router.push("/auth")}
                    >
                        Login
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
