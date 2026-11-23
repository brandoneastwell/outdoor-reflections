"use client"

import {useContext, useState, useSyncExternalStore} from "react";
import {createPortal} from "react-dom";
import {EntryContext} from "@/utils/entryContext";
import {
    DragDropProvider,
    DragOverlay,
    type DragEndEvent,
    type DragStartEvent,
} from "@dnd-kit/react";
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

const subscribeToClient = () => () => {};

export default function TextArea({ focus }: TextAreaProps) {
    const {
        entry,
        setEntry,
        onTextBlockFocus,
        onTextBlockBlur,
        onTextBlockChange,
        focusedTextBlockIndex,
        aiState,
        clearAiSuggestions,
    } = useContext(EntryContext)
    const isMounted = useSyncExternalStore(
        subscribeToClient,
        () => true,
        () => false,
    );
    const [activeLine, setActiveLine] = useState<TextBox | null>(null);
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

    const handleDragStart = ({operation}: DragStartEvent) => {
        setActiveLine(
            content.find((line) => line.id === operation.source?.id) ?? null,
        );
    };

    const handleDragEnd = ({canceled, operation}: DragEndEvent) => {
        setActiveLine(null);
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

    const acceptSuggestion = (id: string, suggestion: string, append: boolean) => {
        const nextContent = content.map((line) => {
            if (line.id !== id) return line;

            const separator = append && line.text && !line.text.endsWith(" ") && !suggestion.startsWith(" ")
                ? " "
                : "";
            return {...line, text: append ? line.text + separator + suggestion : suggestion};
        });

        updateContent(nextContent);
        clearAiSuggestions();
    };

    return (
        <DragDropProvider onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="absolute inset-0 h-full w-full">
                {content.map((line, index) => (
                        <TextAreaItem
                            key={line.id}
                            line={line}
                            index={index}
                            focus={focus}
                            selected={focusedTextBlockIndex === index}
                            onKeyDown={handleKeyDown}
                            onChange={handleChange}
                            onFocus={() => onTextBlockFocus(index)}
                            onBlur={() => onTextBlockBlur(index)}
                            sentenceStarter={
                                focusedTextBlockIndex === index &&
                                aiState.targetBlockIndex === index &&
                                index === 0 &&
                                line.text.trim() === ""
                                    ? aiState.sentence_starters[0]
                                    : undefined
                            }
                            autocomplete={
                                focusedTextBlockIndex === index && aiState.targetBlockIndex === index
                                    ? aiState.autocomplete
                                    : undefined
                            }
                            onAcceptSentenceStarter={(suggestion) => acceptSuggestion(line.id, suggestion, false)}
                            onAcceptAutocomplete={(suggestion) => acceptSuggestion(line.id, suggestion, true)}
                            onDismissSuggestion={clearAiSuggestions}
                        />
                    ))}
            </div>
            {isMounted && createPortal(
                <DragOverlay className="pointer-events-none z-[100]" dropAnimation={null}>
                    {activeLine && (
                        <div className="h-full w-full overflow-hidden rounded-md border border-rose/30 bg-white px-2 shadow-lg">
                            <div className="whitespace-pre-wrap pl-5 font-mono text-base leading-6.75 text-black">
                                {activeLine.text || "How was your day?"}
                            </div>
                        </div>
                    )}
                </DragOverlay>,
                document.body,
            )}
        </DragDropProvider>
    );
}
