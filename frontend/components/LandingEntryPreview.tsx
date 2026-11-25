import Image from "next/image";
import DrawIcon from "@/components/DrawIcon";
import LandingTypingDemo from "@/components/LandingTypingDemo";
import {SVG_PATHS} from "@/constants/svgPaths";

const trailSketch = [
  "M9 72q24-11 40-29 10-11 20-7 19 8 36 27M83 68q21-16 37-36 17-21 32-18 13 3 29 21 15 17 34 25M183 44q15-5 29-16 9-8 19-3 16 9 26 22 12 14 27 22",
  "m115 43 15-5 8 4 8-9 10 2 6-6M43 55l12-3 7 3 7-6 9 2M63 77q39-15 72-14 29 1 18 10-9 8-37 13-30 6-25 21 4 10 33 17m68-1q-49-12-52-20-3-6 16-13 41-15 22-23-11-5-27-5",
  "m20 101 6-12 2 13 10-7m15 21 3-14 7 13 7-9m152-16 5-11 4 13 9-8m6 28 6-12 3 10 8-6M21 111l13-2m129-56 7-2m29 47 9-3m57-18 9 2M100 14q5-4 10 0 4-5 9-3",
];

export default function LandingEntryPreview() {
  return (
    <figure className="relative isolate grid items-center overflow-hidden rounded-[1.2rem] bg-[#5b4c3c] p-[clamp(1rem,4vw,3.25rem)] before:absolute before:inset-0 before:-z-1 before:bg-[linear-gradient(145deg,#561c2452,transparent_65%)]">
      <Image
        src="/landing/meadow-trail.webp"
        alt=""
        fill
        preload
        sizes="(max-width: 800px) 92vw, (max-width: 1350px) 55vw, 690px"
        className="-z-2 object-cover object-center"
      />
      <div className="mx-auto w-full max-w-lg">
        <div className="overflow-hidden rounded-[.9rem] border border-[#fff8ee] bg-[#fffaf2] shadow-[0_1.4rem_3.2rem_#38221e66]">
          <header className="border-b border-[#eedbd3] px-4 pt-[1.05rem] pb-[.8rem] text-center">
            <h2 className="font-flower text-[length:clamp(1.5rem,3.1vw,2.65rem)] leading-[1.12] font-semibold">Where the light landed</h2>
          </header>
          <div className="grid min-h-68 content-start gap-[.65rem] px-[clamp(.9rem,3vw,1.7rem)] pt-4 pb-2">
            <p className="font-flower text-[1.23rem] font-semibold text-[#9b3c48]">Sunday, 09.21</p>
            <p className="font-mono text-[length:clamp(.86rem,1.25vw,1.03rem)] leading-[1.55]">The path opened after the trees. I stopped for a moment and listened</p>
            <LandingTypingDemo />
            <DrawIcon
              svgPaths={trailSketch}
              viewBox="0 0 295 131"
              className="mt-[.15rem] aspect-[295/131] h-auto w-[min(84%,18.5rem)] justify-self-center text-[#603c39]"
              label="A pen sketch of hills, grass, and a winding trail"
              drawOnLoad
            />
          </div>
          <footer className="grid justify-items-center px-4 pt-2 pb-4">
            <div className="inline-flex items-center gap-3 rounded-xl border border-[#ecd4cd] bg-[#f6e6df] px-[.65rem] py-[.42rem] text-[#71313a]" aria-hidden="true">
              <DrawIcon svgPaths={SVG_PATHS.reverseIcon} iconSize={19} strokeWidth={1.5} />
              <DrawIcon svgPaths={SVG_PATHS.forwardIcon} iconSize={19} strokeWidth={1.5} />
              <DrawIcon svgPaths={SVG_PATHS.drawIcon} iconSize={22} strokeWidth={1.5} />
            </div>
          </footer>
        </div>
      </div>
    </figure>
  );
}
