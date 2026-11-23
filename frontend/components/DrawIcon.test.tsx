import {cleanup, render} from "@testing-library/react";
import {renderToString} from "react-dom/server";
import {afterEach, describe, expect, it} from "vitest";
import DrawIcon from "./DrawIcon";

describe("DrawIcon", () => {
    afterEach(cleanup);

    it("uses the same empty SVG shell for server rendering and initial hydration", () => {
        const serverMarkup = renderToString(
            <DrawIcon svgPaths={["4 4 18 4"]} />,
        );

        expect(serverMarkup).toContain("<svg");
        expect(serverMarkup).not.toContain("<path");
    });

    it("generates the icon path after mounting in the browser", () => {
        const {container} = render(<DrawIcon svgPaths={["4 4 18 4"]} />);

        expect(container.querySelector("path")?.getAttribute("d")).toBeTruthy();
    });
});
