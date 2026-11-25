"use client";

import {motion, stagger, useReducedMotion} from "motion/react";
import {cn} from "@/lib/utils";

export const suggestionRevealDuration = 1;
const letterFadeDuration = 0.5;

type SuggestionState = "hidden" | "visible" | "accepted";

const ghostColor = "#6b6669";
const clearGlow = "0 0 0.2em rgba(166, 192, 205, 0)";
const softGlow = "0 0 0.2em rgba(166, 192, 205, 0.22)";
const rippleTransition = {
  duration: 1.4,
  times: [0, 0.16, 0.31, 0.48, 0.64, 0.83, 1],
  ease: "easeInOut" as const,
  repeat: Infinity,
};

const letterVariants = {
  hidden: {opacity: 0, color: ghostColor, textShadow: clearGlow, transition: {duration: 0}},
  visible: {
    opacity: 1,
    color: [ghostColor, "#777680", "#898892", "#706c73", "#81858c", "#716f76", ghostColor],
    textShadow: [clearGlow, softGlow, softGlow, clearGlow, softGlow, clearGlow, clearGlow],
    transition: {
      opacity: {duration: letterFadeDuration},
      color: rippleTransition,
      textShadow: rippleTransition,
    },
  },
  accepted: {opacity: 1, color: ghostColor, textShadow: clearGlow, transition: {duration: 0}},
};

const calloutVariants = {
  hidden: {opacity: 0, transition: {duration: 0}},
  visible: {opacity: 1, transition: {duration: letterFadeDuration}},
  accepted: {opacity: 0, transition: {duration: 0.16}},
};

const stillCalloutVariants = {
  hidden: calloutVariants.hidden,
  visible: {opacity: 1, transition: {duration: 0}},
  accepted: calloutVariants.hidden,
};

export function AnimatedSuggestionText({text, state}: {text: string; state: SuggestionState}) {
  const reducedMotion = useReducedMotion();
  const letterCount = Array.from(text.replace(/\s/g, "")).length;
  const letterDelay = (suggestionRevealDuration - letterFadeDuration) / Math.max(1, letterCount - 1);
  const variants = {
    hidden: {},
    visible: {transition: {delayChildren: stagger(letterDelay)}},
    accepted: {},
  };

  return (
    <motion.span variants={variants} initial="hidden" animate={reducedMotion && state === "visible" ? "accepted" : state}>
      {text.split(/(\s+)/).map((word, wordIndex) => (
        /^\s*$/.test(word) ? word : (
          <span key={wordIndex}>
            {Array.from(word, (letter, index) => (
              <motion.span
                key={index}
                className={`motion-reduce:opacity-100! ${state === "accepted" ? "[color:inherit]!" : ""}`}
                variants={letterVariants}
              >
                {letter}
              </motion.span>
            ))}
          </span>
        )
      ))}
    </motion.span>
  );
}

type SuggestionTabCalloutProps = {
  state: SuggestionState;
  tabPressed: boolean;
  className?: string;
  onAcceptedAnimationComplete?: () => void;
};

export function SuggestionTabCallout({
  state,
  tabPressed,
  className = "",
  onAcceptedAnimationComplete,
}: SuggestionTabCalloutProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.span
      className={cn(
        "inline-block rounded-[.24rem] bg-[#e8e4e2] px-[.35rem] py-[.12rem] text-[.65rem] leading-[1.2] whitespace-nowrap text-[#4e4949] before:absolute before:bottom-full before:left-[.55rem] before:size-0 before:border-[.23rem] before:border-transparent before:border-t-0 before:border-b-[#e8e4e2]",
        className,
      )}
      variants={reducedMotion ? stillCalloutVariants : calloutVariants}
      initial="hidden"
      animate={state}
      onAnimationComplete={(variant) => {
        if (variant === "accepted") onAcceptedAnimationComplete?.();
      }}
    >
      <motion.kbd
        className="relative mr-1 isolate inline-block [font:inherit] before:absolute before:inset-y-0 before:inset-x-[-0.12rem] before:-z-1 before:rounded-[.15rem] before:bg-[#f8f6f5] before:ring-1 before:ring-[#a9a1a0]"
        initial={false}
        animate={{y: tabPressed && !reducedMotion ? 1 : 0, scale: tabPressed && !reducedMotion ? 0.93 : 1}}
        transition={{duration: 0.1}}
      >
        Tab
      </motion.kbd> {" "} to accept AI suggestion
    </motion.span>
  );
}
