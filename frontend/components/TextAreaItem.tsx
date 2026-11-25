"use client"

import {useSortable} from "@dnd-kit/react/sortable";
import React, {useId, useState} from "react";
import {AnimatedSuggestionText, SuggestionTabCallout} from "./InlineSuggestionEffects";
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
    sentenceStarter?: string;
    autocomplete?: string;
    onAcceptSentenceStarter?: (suggestion: string) => void;
    onAcceptAutocomplete?: (suggestion: string) => void;
    onDismissSuggestion?: () => void;
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
    sentenceStarter,
    autocomplete,
    onAcceptSentenceStarter = () => {},
    onAcceptAutocomplete = () => {},
    onDismissSuggestion = () => {},
}: TextAreaItemProps) {
    const suggestionHintId = useId();
    const [tabAccepted, setTabAccepted] = useState(false);
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
    const activeStarter = focus && line.text.trim() === "" ? sentenceStarter : undefined;
    const activeAutocomplete = focus ? autocomplete : undefined;
    const suggestion = activeStarter || activeAutocomplete;
    const autocompleteSeparator = autocomplete && line.text &&
        !line.text.endsWith(" ") && !autocomplete.startsWith(" ")
        ? " "
        : "";
    const suggestionPrefix = activeStarter ? "" : line.text + autocompleteSeparator;
    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (suggestion && event.key === "Tab") {
            event.preventDefault();
            setTabAccepted(true);
            if (activeStarter) {
                onAcceptSentenceStarter(activeStarter);
            } else {
                onAcceptAutocomplete(suggestion);
            }
            return;
        }

        if (suggestion && event.key === "Escape") {
            event.preventDefault();
            onDismissSuggestion();
            return;
        }

        onKeyDown(event);
    };

    return (
        <div
            ref={ref}
            className={
                "relative mb-1 h-auto w-full rounded-md transition-colors " +
                (isDragging
                    ? "bg-rose/10 opacity-60 ring-1 ring-rose/20 ring-inset"
                    : isDropTarget
                        ? "bg-rose/5 ring-1 ring-rose/30 ring-inset"
                        : "")
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
                    "absolute right-full top-1 mr-1 z-10 flex h-5 w-5 touch-none items-center justify-center rounded text-rose/60 cursor-grab transition-opacity hover:bg-rose/10 hover:text-rose active:cursor-grabbing disabled:pointer-events-none " +
                    (showDragHandle ? "opacity-100" : "pointer-events-none opacity-0")
                }
            >
                <span aria-hidden="true">⠿</span>
            </button>
            <div className="relative w-full">
                {suggestion && (
                    <div
                        aria-hidden="true"
                        className="invisible w-full whitespace-pre-wrap break-words font-mono text-base leading-6.75"
                    >
                        {suggestionPrefix}{suggestion}
                    </div>
                )}
                <textarea
                    name="content"
                    aria-describedby={suggestion ? suggestionHintId : undefined}
                    className={
                        "resize-none field-sizing-content bg-transparent font-mono outline-none outline-0 text-black " +
                        "text-base leading-6.75 w-full overflow-hidden " +
                        (suggestion ? "absolute inset-0 h-full " : "h-auto ") +
                        (activeStarter ? "placeholder:text-transparent " : "placeholder:text-black ") +
                        (focus ? "" : " pointer-events-none")
                    }
                    value={line.text}
                    onKeyDown={handleKeyDown}
                    onChange={(e) => {
                        setTabAccepted(false);
                        onChange(line.id, e.target.value);
                    }}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    placeholder={(focus ? sentenceStarter : undefined) ?? "How was your day?"}
                    disabled={!focus}
                    spellCheck={false}
                />
                {suggestion && (
                    <div
                        aria-hidden="true"
                        data-testid={activeStarter ? "sentence-starter-ghost" : "inline-completion-ghost"}
                        className="pointer-events-none absolute inset-0 z-[1] w-full whitespace-pre-wrap break-words font-mono text-base leading-6.75 text-black"
                    >
                        <span className="invisible">{suggestionPrefix}</span>
                        <AnimatedSuggestionText key={suggestion} text={suggestion} state="visible" />
                    </div>
                )}
            </div>
            {(suggestion || tabAccepted) && (
                <div
                    id={suggestionHintId}
                    aria-hidden={tabAccepted || undefined}
                    className="pointer-events-none flex py-px [zoom:calc(1/var(--entry-scale,1))]"
                >
                    <SuggestionTabCallout
                        className="relative rounded-sm px-[3px] py-px text-[7px] leading-none before:left-[5px] before:border-2 [&_kbd]:mr-0.5"
                        state={tabAccepted ? "accepted" : "visible"}
                        tabPressed={tabAccepted}
                        onAcceptedAnimationComplete={() => setTabAccepted(false)}
                    />
                </div>
            )}
        </div>
    );
}
