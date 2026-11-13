"use client"

import {useContext, useState} from "react";
import {EntryContext} from "@/utils/entryContext";
import {DragDropProvider, type DragEndEvent} from "@dnd-kit/react";
import {isSortable} from "@dnd-kit/react/sortable";
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

export default function TextArea({ focus }: TextAreaProps) {
    const {
        entry,
        setEntry,
        onTextBlockFocus,
        onTextBlockBlur,
        onTextBlockChange,
    } = useContext(EntryContext)
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

    const handleDragEnd = ({canceled, operation}: DragEndEvent) => {
        if (canceled || !isSortable(operation.source)) return;

        const {initialIndex, index} = operation.source;
        if (initialIndex === index || initialIndex < 0 || index < 0) return;

        const nextContent = [...content];
        const [movedLine] = nextContent.splice(initialIndex, 1);
        if (!movedLine) return;

        nextContent.splice(index, 0, movedLine);
        updateContent(nextContent);
    };

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
        onTextBlockChange(
            nextContent.findIndex((line) => line.id === id),
            nextContent.map((line) => line.text),
        );
    };

    return (
        <DragDropProvider onDragEnd={handleDragEnd}>
            <div className="absolute inset-0 h-full w-full">
                {content.map((line, index) => (
                        <TextAreaItem
                            key={line.id}
                            line={line}
                            index={index}
                            focus={focus}
                            onKeyDown={handleKeyDown}
                            onChange={handleChange}
                            onFocus={() => onTextBlockFocus(index)}
                            onBlur={() => onTextBlockBlur(index)}
                        />
                    ))}
            </div>
        </DragDropProvider>
    );
}
