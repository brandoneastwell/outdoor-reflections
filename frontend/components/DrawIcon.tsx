"use client"
import { svgPathProperties } from "svg-path-properties";
import {getStroke} from "perfect-freehand";
import {getSvgPathFromStroke} from "@/utils/getSvgPathFromStroke";
import {lineToPoints} from "@/utils/svgPoints";
import {Point} from "@/types/customTypes";
import {AnimatePresence, motion} from "motion/react";
import {useSyncExternalStore} from "react";

const subscribeToClient = () => () => {};

function createPointsFromSVGPath(path: string) {
    const points: Point[] = [];

    // Check if path starts with 'M' for a path, else it's a line'
    if (path[0] === "M") {
        const props = new svgPathProperties(path);
        const length = props.getTotalLength();

        for (let i = 0; i <= length; i += length / 100) {
            const point = props.getPointAtLength(i);
            points.push([point.x, point.y]);
        }
    } else {
        const pointsFromLine = lineToPoints(path);
        points.push(...pointsFromLine);
    }

    return points
}

export default function DrawIcon({ svgPaths, fill, strokeWidth = 2, iconSize = 24 } : { svgPaths: string[], fill?: string, strokeWidth?: number, iconSize?: number }) {
    const isMounted = useSyncExternalStore(
        subscribeToClient,
        () => true,
        () => false,
    );

    if (!isMounted) {
        return (
            <svg height={iconSize} width={iconSize} viewBox="0 0 24 24" fill={fill} xmlns="http://www.w3.org/2000/svg" />
        );
    }

    const paths: string[] = [];

    for (const path of svgPaths) {
        const points: Point[] = [];
        points.push(...createPointsFromSVGPath(path));

        const stroke = getStroke(points, {
            size: strokeWidth,
            thinning: 0.5,
            streamline: 0.5,
            smoothing: 0.5,
            easing: (t) => t,
            simulatePressure: true,
            last: true,
            start: {
                cap: false,
                taper: 1,
                easing: (t) => t,
            },
            end: {
                cap: true,
                taper: 0,
                easing: (t) => t,
            },
        });

        const pathFromStroke = getSvgPathFromStroke(stroke)
        paths.push(pathFromStroke);
    }

    return (
        <svg height={iconSize} width={iconSize} viewBox="0 0 24 24" fill={fill} xmlns="http://www.w3.org/2000/svg">
            <AnimatePresence>
                { paths.map((path, index) =>
                    <motion.path
                        key={index}
                        d={path}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.25, delay: index * 0.05 }}
                    /> )}
            </AnimatePresence>
        </svg>
    )
}
