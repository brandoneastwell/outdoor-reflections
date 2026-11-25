"use client"
import { svgPathProperties } from "svg-path-properties";
import {getStroke} from "perfect-freehand";
import {getSvgPathFromStroke} from "@/utils/getSvgPathFromStroke";
import {lineToPoints} from "@/utils/svgPoints";
import {Point} from "@/types/customTypes";
import {AnimatePresence, motion, useReducedMotion} from "motion/react";
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

type DrawIconProps = {
    svgPaths: string[];
    fill?: string;
    strokeWidth?: number;
    iconSize?: number;
    viewBox?: string;
    className?: string;
    label?: string;
    drawOnLoad?: boolean;
};

export default function DrawIcon({
    svgPaths,
    fill,
    strokeWidth = 2,
    iconSize = 24,
    viewBox = "0 0 24 24",
    className,
    label,
    drawOnLoad = false,
}: DrawIconProps) {
    const reduceMotion = useReducedMotion();
    const isMounted = useSyncExternalStore(
        subscribeToClient,
        () => true,
        () => false,
    );

    const svgProps = {
        height: iconSize,
        width: iconSize,
        viewBox,
        className,
        role: label ? "img" : undefined,
        "aria-label": label,
        xmlns: "http://www.w3.org/2000/svg",
    };

    if (!isMounted) {
        return <svg {...svgProps} fill={fill} />;
    }

    if (drawOnLoad) {
        return (
            <svg {...svgProps} fill="none" stroke={fill ?? "currentColor"} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
                {svgPaths.map((path, index) => (
                    <motion.path
                        key={index}
                        d={path}
                        initial={reduceMotion ? false : {pathLength: 0, opacity: 0}}
                        animate={{pathLength: 1, opacity: 1}}
                        transition={{
                            pathLength: {duration: 1.1, delay: index * 0.32, ease: "easeInOut"},
                            opacity: {duration: 0, delay: index * 0.32},
                        }}
                    />
                ))}
            </svg>
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
        <svg {...svgProps} fill={fill}>
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
