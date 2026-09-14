"use client"

import {useContext, useState} from "react";
import {EntryContext} from "@/utils/entryContext";
import {AnimatePresence, Reorder} from "motion/react";
import TextAreaItem from "@/components/TextAreaItem";
import {TextBox} from "@/types/customTypes";
import {Entry} from "@/types/entryTypes";

interface TextAreaProps {
    focus: boolean;
    container: React.RefObject<HTMLDivElement | null>;
}

const createLine = (text = ""): TextBox => ({
    id: crypto.randomUUID(),
    text,
});

export default function TextArea({ focus, container }: TextAreaProps) {
    const {entry, setEntry} = useContext(EntryContext)
    const [draggedLine, setDraggedLine] = useState<TextBox | null>(null);
    const [content, setContent] = useState<TextBox[]>(
        () => entry.content.map((text) => createLine(text))
    );

    const updateContent = (nextContent: TextBox[]) => {
        setContent(nextContent);
        setEntry((prevEntry: Entry) => ({
            ...prevEntry,
            content: nextContent.map((line) => line.text),
        }));
    };

    const handleReorder = (newContent: TextBox[]) => {
        updateContent(newContent);
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === "Enter") {
            event.preventDefault();
            const nextContent = [...content, createLine("")];
            updateContent(nextContent);
        }
    }

    const handleChange = (id: string, value: string) => {

        const nextContent = content.map((line) =>
            line.id === id ? {...line, text: value} : line
        );
        setContent(nextContent);
        setEntry((prevEntry: Entry) => ({
            ...prevEntry,
            content: nextContent.map((line) => line.text),
        }));
    };

    return (
            <Reorder.Group
                values={content}
                axis="y"
                onReorder={handleReorder}
                className="absolute inset-0 h-full w-full"
            >
                <AnimatePresence>
                {content.map((line) => (
                        <TextAreaItem
                            key={line.id}
                            line={line}
                            focus={focus}
                            container={container}
                            onKeyDown={handleKeyDown}
                            onChange={handleChange}
                            onDrag={setDraggedLine}
                            draggedLine={draggedLine}
                        />
                    ))}
                </AnimatePresence>
            </Reorder.Group>
    );
}
