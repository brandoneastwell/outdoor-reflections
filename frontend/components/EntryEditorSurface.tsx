import {useEffect, useRef, useState} from "react";
import type {ReactNode} from "react";

export default function EntryEditorSurface({children}: {children: ReactNode}) {
    const [editorScale, setEditorScale] = useState(1);
    const editorAreaRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const updateScale = () => {
            const container = editorAreaRef.current;
            if (!container) return;

            const rect = container.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;

            const horizontalPadding = 24;
            const availableWidth = Math.max(320, rect.width - horizontalPadding);
            setEditorScale(Math.max(1, availableWidth / 320));
        };

        updateScale();

        const resizeObserver = new ResizeObserver(updateScale);
        if (editorAreaRef.current) {
            resizeObserver.observe(editorAreaRef.current);
        }

        return () => resizeObserver.disconnect();
    }, []);

    return (
        <div ref={editorAreaRef} className={"relative w-full h-full min-w-[320px] overflow-hidden flex flex-col flex-1 rounded-2xl"}>
            <div
                style={{
                    width: "320px",
                    height: "920px",
                    zoom: editorScale,
                }}
                className="relative flex overflow-hidden"
            >
                {children}
            </div>
        </div>
    );
}
