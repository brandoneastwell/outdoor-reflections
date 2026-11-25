"use client";

import {motion, useReducedMotion} from "motion/react";
import {AlertDialog} from "radix-ui";
import {popupVariant} from "@/utils/animations";

type DeleteReflectionDialogProps = {
    title?: string;
    onCancel: () => void;
    onConfirm: () => void;
    onRestoreFocus: () => void;
};

export default function DeleteReflectionDialog({title, onCancel, onConfirm, onRestoreFocus}: DeleteReflectionDialogProps) {
    const reducedMotion = useReducedMotion();

    return (
        <AlertDialog.Root open={title !== undefined} onOpenChange={(open) => { if (!open) onCancel(); }}>
            <AlertDialog.Portal>
                <AlertDialog.Overlay className="fixed inset-0 z-[60] bg-[#362528]/10" />
                <AlertDialog.Content
                    asChild
                    onCloseAutoFocus={(event) => {
                        event.preventDefault();
                        onRestoreFocus();
                    }}
                >
                    <motion.div
                        variants={popupVariant}
                        initial={reducedMotion ? false : "initial"}
                        animate="visible"
                        className="fixed inset-x-3 bottom-6 z-[61] mx-auto max-w-md rounded-2xl bg-[#fff1eb]/90 p-4 font-mono text-[#362528] shadow-[0_8px_32px_rgba(73,88,103,0.18)] ring-1 ring-rose/20 backdrop-blur-xl backdrop-saturate-150 sm:bottom-8"
                    >
                        <AlertDialog.Title className="text-base font-semibold">Delete reflection?</AlertDialog.Title>
                        <AlertDialog.Description className="mt-1 text-sm">
                            “{title}” will be permanently removed.
                        </AlertDialog.Description>
                        <div className="mt-3 flex justify-end gap-2">
                            <AlertDialog.Cancel className="cursor-pointer rounded-xl px-3 py-2 text-sm transition-colors hover:bg-rose/10 focus-visible:outline-2 focus-visible:outline-[#a23743]">
                                Cancel
                            </AlertDialog.Cancel>
                            <AlertDialog.Action onClick={onConfirm} className="cursor-pointer rounded-xl bg-[#a23743] px-3 py-2 text-sm text-white shadow-sm transition-colors hover:bg-[#7f2632] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a23743]">
                                Delete reflection
                            </AlertDialog.Action>
                        </div>
                    </motion.div>
                </AlertDialog.Content>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    );
}
