"use client"
import {useContext, useRef, useState} from "react";
import { getStroke } from "perfect-freehand";
import {getSvgPathFromStroke} from "@/utils/getSvgPathFromStroke";
import {EntryContext} from "@/utils/entryContext";

export default function DrawingArea({ focus }: { focus: boolean }) {
    const { entry, setEntry, drawColor } = useContext(EntryContext);
    const [isDrawing, setIsDrawing] = useState<boolean>(false);
    const drawAreaRef = useRef<SVGSVGElement | null>(null);
    const [points, setPoints] = useState<(number[])[]>([]);

    const relativeCoordinates = (event: React.PointerEvent) => {

        const point = drawAreaRef.current?.createSVGPoint();
        if (!point) return null;

        point.x = event.clientX;
        point.y = event.clientY;
        const e = event.pressure;

        const transformedPoint = point.matrixTransform(drawAreaRef.current?.getScreenCTM()!.inverse());

        return [transformedPoint.x, transformedPoint.y, e] as [number, number, number];
    };

    const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
        if (event.button !== 0) return;

        const point = relativeCoordinates(event);
        if (point) setPoints((prevLines: any) => [...prevLines, point]);
        setIsDrawing(true);
    };

    const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
        if (!isDrawing) return;

        const point = relativeCoordinates(event);
        if (point) {
            setPoints((prevLines: any) => [...prevLines, point]);
        }
    };

    const handlePointerUp = (pathData: string) => {
        setEntry({...entry, drawingPaths: [...entry.drawingPaths, { path: pathData, color: drawColor }]});
        setIsDrawing(false);
        setPoints([]);
    }

    const stroke = getStroke(points, {
        size: 5,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
    });

    const pathData = getSvgPathFromStroke(stroke, true);

    return (
        <svg viewBox="0 0 320 920"
             ref={drawAreaRef}
             onPointerDown={handlePointerDown}
             onPointerMove={handlePointerMove}
             onPointerUp={() => handlePointerUp(pathData)}
             className={"absolute inset-0 h-full w-full z-10 touch-none " + (focus ? " pointer-events-auto cursor-crosshair" : " pointer-events-none")}>
            {points && isDrawing && <path d={pathData} fill={drawColor} />}
            {entry.drawingPaths.map((drawPath, index) => (
                <path key={index} d={drawPath.path} fill={drawPath.color} />
            ))}
        </svg>
    );
}
