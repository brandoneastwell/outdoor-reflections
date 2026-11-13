"use client"

import {useSortable} from "@dnd-kit/react/sortable";
import React from "react";
import {TextBox} from "@/types/customTypes";

interface TextAreaItemProps {
    line: TextBox;
    index: number;
    focus: boolean;
    selected: boolean;
    onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onChange: (id: string, value: string) => void;
    onFocus: () => void;
    onBlur: () => void;
}

export default function TextAreaItem({
    line,
    index,
    focus,
    selected,
    onKeyDown,
    onChange,
    onFocus,
    onBlur,
}: TextAreaItemProps) {
    const {ref, handleRef, isDragging, isDropTarget} = useSortable({
        id: line.id,
        index,
        disabled: !focus,
        transition: {
            duration: 180,
            easing: "ease-out",
        },
    });
    const showDragHandle = selected || isDragging;

    return (
        <div
            ref={ref}
            className={
                "relative w-full h-auto rounded-md border px-2 mb-1 overflow-hidden transition-colors " +
                (isDragging
                    ? "border-rose/20 bg-rose/10 opacity-60"
                    : isDropTarget
                        ? "border-rose/30 bg-rose/5"
                        : "border-transparent")
            }
        >
            <button
                ref={handleRef}
                type="button"
                aria-label="Reorder text block"
                aria-hidden={!showDragHandle}
                tabIndex={showDragHandle ? 0 : -1}
                disabled={!focus}
                onFocus={onFocus}
                className={
                    "absolute left-1 top-1.5 z-10 flex h-5 w-5 touch-none items-center justify-center rounded text-rose/60 cursor-grab transition-opacity hover:bg-rose/10 hover:text-rose active:cursor-grabbing disabled:pointer-events-none " +
                    (showDragHandle ? "opacity-100" : "pointer-events-none opacity-0")
                }
            >
                <span aria-hidden="true">⠿</span>
            </button>
            <textarea
                name="content"
                className={
                    "resize-none field-sizing-content bg-transparent font-mono outline-none outline-0 text-black placeholder-black " +
                    "text-base leading-6.75 h-auto w-full overflow-hidden pl-5 " +
                    (focus ? "" : " pointer-events-none")
                }
                value={line.text}
                onKeyDown={onKeyDown}
                onChange={(e) => onChange(line.id, e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                placeholder="How was your day?"
                disabled={!focus}
                spellCheck={false}
            />
        </div>
    );
}
