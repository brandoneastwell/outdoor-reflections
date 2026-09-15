"use client"

import {motion, Reorder, useDragControls} from "motion/react";
import React, {Dispatch, useRef} from "react";
import type {RefObject} from "react";
import {TextBox} from "@/types/customTypes";

type StateSetter<T> = Dispatch<T | ((previousState: T) => T)>;

interface TextAreaItemProps {
    line: TextBox;
    focus: boolean;
    container: RefObject<HTMLDivElement | null>;
    onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onChange: (id: string, value: string) => void;
    onDrag: StateSetter<TextBox | null>
    draggedLine: TextBox | null;
}

export default function TextAreaItem({
    line,
    focus,
    container,
    onKeyDown,
    onChange,
    onDrag,
    draggedLine
}: TextAreaItemProps) {
    const holdTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const controls = useDragControls();
    const isDragging = draggedLine?.id === line.id;

    const cancelHold = () => {
        onDrag(null);
        if (holdTimeout.current) {
            clearTimeout(holdTimeout.current);
            holdTimeout.current = null;
        }

        controls.stop()
    };

    const handlePointerDown = (event: React.PointerEvent<HTMLTextAreaElement>) => {
        cancelHold();
        holdTimeout.current = setTimeout(() => {
            controls.start(event);
            holdTimeout.current = null;
        }, 150);
    };

    return (
        <Reorder.Item
            value={line}
            animate={isDragging ? { backgroundColor: "#ce796020", cursor: "grabbing", boxShadow: "0px 1px 1px rgba(73,88,103,0.18)", opacity: 1, scale: 1, y: 0 } : draggedLine !== null ? { backgroundColor: "#ce796008" , boxShadow: "none", opacity: 1, y: 0, scale: 1 } : { backgroundColor: "transparent" , boxShadow: "none", opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
            whileHover={{ borderColor: "#ce796020", cursor: "pointer" }}
            onDragEnd={cancelHold}
            onDragStart={() => onDrag(line)}
            dragControls={controls}
            dragConstraints={container}
            dragElastic={0.06}
            dragMomentum={false}
            dragTransition={{
                power: 0.18,
                timeConstant: 260,
                bounceStiffness: 140,
                bounceDamping: 30,
                velocity: 4,
            }}
            className="w-full h-auto border border-transparent rounded-md px-2 mb-1 overflow-hidden"
        >
            <motion.textarea
                name="content"
                className={
                    "resize-none field-sizing-content bg-transparent font-mono outline-none outline-0 text-black placeholder-black " +
                    "text-base leading-6.75 h-auto overflow-hidden  " +
                    (focus ? "" : " pointer-events-none")
                }
                value={line.text}
                onPointerUp={cancelHold}
                onPointerDown={handlePointerDown}
                onKeyDown={onKeyDown}
                onChange={(e) => onChange(line.id, e.target.value)}
                placeholder="How was your day?"
                disabled={!focus}
                spellCheck={false}
            />
        </Reorder.Item>
    );
}
