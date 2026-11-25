"use client";

import {useEffect, useState} from "react";
import {
  animate,
  motion,
  stagger,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "motion/react";

const typedLine = "The grass moved";
const suggestion = "like water in the evening light.";
const typingStart = 0.5;
const typingInterval = 0.04;
const suggestionTime = typingStart + (typedLine.length - 1) * typingInterval + 0.5;
const suggestionRevealDuration = 1;
const acceptTime = suggestionTime + suggestionRevealDuration + 0.75;
const tabPressTime = acceptTime - 0.16;
const loopDuration = 6;
const letterFadeDuration = 0.5;
const suggestionStagger = (suggestionRevealDuration - letterFadeDuration) / (suggestion.replaceAll(" ", "").length - 1);
const ghostColor = "#6b6669";
const clearGlow = "0 0 0.2em rgba(166, 192, 205, 0)";
const softGlow = "0 0 0.2em rgba(166, 192, 205, 0.22)";
const rippleTransition = {
  duration: 1.4,
  times: [0, 0.16, 0.31, 0.48, 0.64, 0.83, 1],
  ease: "easeInOut" as const,
  repeat: Infinity,
};
type DemoPhase = "typing" | "suggesting" | "pressingTab" | "accepted";

const suggestionVariants = {
  hidden: {},
  visible: {transition: {delayChildren: stagger(suggestionStagger)}},
  accepted: {},
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

export default function LandingTypingDemo() {
  const reducedMotion = useReducedMotion();
  const playhead = useMotionValue(0);
  const currentPhase = useTransform(playhead, (time): DemoPhase => {
    if (time >= acceptTime) return "accepted";
    if (time >= tabPressTime) return "pressingTab";
    if (time >= suggestionTime) return "suggesting";
    return "typing";
  });
  const currentCharacterCount = useTransform(playhead, (time) => {
    const count = Math.floor((time - typingStart) / typingInterval) + 1;
    return Math.min(typedLine.length, Math.max(0, count));
  });
  const [phase, setPhase] = useState<DemoPhase>("typing");
  const [visibleCharacters, setVisibleCharacters] = useState(0);
  useMotionValueEvent(currentPhase, "change", setPhase);
  useMotionValueEvent(currentCharacterCount, "change", setVisibleCharacters);

  useEffect(() => {
    if (reducedMotion) return;

    const playback = animate(playhead, loopDuration, {
      duration: loopDuration,
      ease: "linear",
      repeat: Infinity,
    });
    return () => playback.stop();
  }, [playhead, reducedMotion]);

  const tabPressed = phase === "pressingTab" || phase === "accepted";
  const suggestionAccepted = phase === "accepted";
  const suggestionState = phase === "typing" ? "hidden" : suggestionAccepted ? "accepted" : "visible";

  return (
    <p className="pb-[1.35rem] font-mono text-[length:clamp(.86rem,1.25vw,1.03rem)] leading-[1.55]">
      <span className="sr-only">The demo types “{typedLine}” and accepts the AI suggestion “{suggestion}” with Tab.</span>
      <span className="relative inline-block whitespace-nowrap" aria-hidden="true">
        <span className="invisible motion-reduce:visible">{typedLine}</span>
        <span className="absolute inset-0 whitespace-pre motion-reduce:hidden">
          {typedLine.slice(0, visibleCharacters)}
          {phase === "typing" && (
            <motion.span
              className="inline-block h-[1em] w-px align-[-.12em] bg-[#a23743]"
              animate={{opacity: [1, 1, 0, 0]}}
              transition={{duration: 0.55, times: [0, 0.49, 0.5, 1], repeat: Infinity}}
            />
          )}
        </span>
      </span>{" "}
      <span className={`relative inline-block max-w-full align-top ${suggestionAccepted ? "text-inherit" : "text-[#746160]"}`} aria-hidden="true">
        <motion.span variants={suggestionVariants} initial="hidden" animate={suggestionState}>
          {suggestion.split(" ").map((word, wordIndex) => (
            <span key={wordIndex}>
              {wordIndex > 0 && " "}
              <span className="whitespace-nowrap">
                {Array.from(word, (letter, index) => (
                  <motion.span
                    key={index}
                    className={`motion-reduce:opacity-100! ${suggestionAccepted ? "[color:inherit]!" : ""}`}
                    variants={letterVariants}
                  >
                    {letter}
                  </motion.span>
                ))}
              </span>
            </span>
          ))}
        </motion.span>
        <motion.span
          className="absolute top-[calc(100%+.28rem)] left-0 rounded-[.24rem] bg-[#e8e4e2] px-[.35rem] py-[.12rem] text-[.65rem] leading-[1.2] whitespace-nowrap text-[#4e4949] before:absolute before:bottom-full before:left-[.55rem] before:size-0 before:border-[.23rem] before:border-transparent before:border-t-0 before:border-b-[#e8e4e2] motion-reduce:opacity-100!"
          variants={calloutVariants}
          initial="hidden"
          animate={suggestionState}
        >
          <motion.kbd
            className="relative mr-1 isolate inline-block [font:inherit] before:absolute before:inset-y-0 before:inset-x-[-0.12rem] before:-z-1 before:rounded-[.15rem] before:bg-[#f8f6f5] before:ring-1 before:ring-[#a9a1a0]"
            initial={false}
            animate={{y: tabPressed ? 1 : 0, scale: tabPressed ? 0.93 : 1}}
            transition={{duration: 0.1}}
          >
            Tab
          </motion.kbd> {" "} to accept AI suggestion
        </motion.span>
      </span>
    </p>
  );
}
