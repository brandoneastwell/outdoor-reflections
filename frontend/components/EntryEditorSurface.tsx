import {useEffect, useRef, useState} from "react";
import type {CSSProperties, ReactNode} from "react";

export default function EntryEditorSurface({header, children}: {header: ReactNode; children: ReactNode}) {
    const [editorScale, setEditorScale] = useState(1);
    const editorAreaRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const updateScale = () => {
            const container = editorAreaRef.current;
            if (!container) return;

            const rect = container.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;

            const horizontalPadding = 24;
            const availableWidth = Math.min(rect.width, Math.max(320, rect.width - horizontalPadding));
            setEditorScale(availableWidth / 320);
        };

        updateScale();

        const resizeObserver = new ResizeObserver(updateScale);
        if (editorAreaRef.current) {
            resizeObserver.observe(editorAreaRef.current);
        }

        return () => resizeObserver.disconnect();
    }, []);

    return (
        <div
            ref={editorAreaRef}
            className="flex min-w-0 flex-1 flex-col items-center [--entry-gutter:1.75rem]"
            style={{"--entry-scale": editorScale} as CSSProperties}
        >
            <div className="flex h-full min-h-0 w-[calc(320px*var(--entry-scale))] max-w-full flex-col gap-2">
                <div className="px-[calc(var(--entry-gutter)*var(--entry-scale))]">
                    {header}
                </div>
                <div className="relative flex flex-1 overflow-hidden rounded-2xl">
                    <div className="relative h-[920px] w-[320px] shrink-0" style={{zoom: editorScale}}>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
