import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import TextAreaItem from "./TextAreaItem";

vi.mock("@dnd-kit/react/sortable", () => ({
    useSortable: () => ({
        ref: vi.fn(),
        handleRef: vi.fn(),
        isDragging: false,
        isDropTarget: false,
    }),
}));

const defaultProps = {
    line: {id: "block-one", text: "A reflection"},
    index: 0,
    focus: true,
    selected: false,
    onKeyDown: vi.fn(),
    onChange: vi.fn(),
    onFocus: vi.fn(),
    onBlur: vi.fn(),
};

describe("TextAreaItem", () => {
    afterEach(cleanup);
    beforeEach(() => vi.clearAllMocks());

    it("only shows the drag handle while the text block is selected", () => {
        const {container, rerender} = render(<TextAreaItem {...defaultProps} />);
        const dragHandle = container.querySelector("button");

        expect(dragHandle).toHaveClass("opacity-0");
        expect(dragHandle).toHaveAttribute("aria-hidden", "true");
        expect(dragHandle).toHaveAttribute("tabindex", "-1");

        rerender(<TextAreaItem {...defaultProps} selected />);

        expect(dragHandle).toHaveClass("opacity-100");
        expect(dragHandle).toHaveAttribute("aria-hidden", "false");
        expect(dragHandle).toHaveAttribute("tabindex", "0");
    });

    it("offers sentence starters without inserting one automatically", () => {
        const onAcceptSentenceStarter = vi.fn();
        render(
            <TextAreaItem
                {...defaultProps}
                line={{...defaultProps.line, text: ""}}
                sentenceStarters={["I noticed...", "Today I felt...", "Next time..."]}
                onAcceptSentenceStarter={onAcceptSentenceStarter}
            />,
        );

        expect(onAcceptSentenceStarter).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole("button", {name: "Today I felt..."}));
        expect(onAcceptSentenceStarter).toHaveBeenCalledWith("Today I felt...");
    });

    it("accepts inline completion with Tab and dismisses it with Escape", () => {
        const onAcceptAutocomplete = vi.fn();
        const onDismissSuggestion = vi.fn();
        const {rerender} = render(
            <TextAreaItem
                {...defaultProps}
                autocomplete="beneath the trees"
                onAcceptAutocomplete={onAcceptAutocomplete}
                onDismissSuggestion={onDismissSuggestion}
            />,
        );

        fireEvent.keyDown(screen.getByRole("textbox"), {key: "Tab"});
        expect(onAcceptAutocomplete).toHaveBeenCalledWith("beneath the trees");
        expect(defaultProps.onKeyDown).not.toHaveBeenCalled();

        rerender(
            <TextAreaItem
                {...defaultProps}
                autocomplete="beneath the trees"
                onAcceptAutocomplete={onAcceptAutocomplete}
                onDismissSuggestion={onDismissSuggestion}
            />,
        );
        fireEvent.keyDown(screen.getByRole("textbox"), {key: "Escape"});
        expect(onDismissSuggestion).toHaveBeenCalledOnce();
    });
});
