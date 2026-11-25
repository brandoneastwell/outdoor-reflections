"use client";

import {useEffect, useState} from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "motion/react";
import {AnimatedSuggestionText, SuggestionTabCallout, suggestionRevealDuration} from "./InlineSuggestionEffects";

const typedLine = "The grass moved";
const suggestion = "like water in the evening light.";
const typingStart = 0.5;
const typingInterval = 0.04;
const suggestionTime = typingStart + (typedLine.length - 1) * typingInterval + 0.5;
const acceptTime = suggestionTime + suggestionRevealDuration + 0.75;
const tabPressTime = acceptTime - 0.16;
const loopDuration = 6;
type DemoPhase = "typing" | "suggesting" | "pressingTab" | "accepted";

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
        <AnimatedSuggestionText text={suggestion} state={suggestionState} />
        <SuggestionTabCallout
          state={suggestionState}
          tabPressed={tabPressed}
          className="absolute top-[calc(100%+.28rem)] left-0 motion-reduce:opacity-100!"
        />
      </span>
    </p>
  );
}
