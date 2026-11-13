import {cleanup, render} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
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
});
