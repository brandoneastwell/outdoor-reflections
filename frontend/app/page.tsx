import Link from "next/link";
import DrawIcon from "@/components/DrawIcon";
import LandingEntryPreview from "@/components/LandingEntryPreview";
import StartButton from "@/components/StartButton";
import {SVG_PATHS} from "@/constants/svgPaths";

const features = [
  {
    title: "Write and sketch on one page",
    description: "Save the details a photo might miss, from the sound of a bird to the shape of the hills.",
    icon: SVG_PATHS.drawIcon,
  },
  {
    title: "Get help when you pause",
    description: "While you’re online, AI can suggest how to continue a thought. Press Tab to keep it or carry on in your own words.",
    icon: SVG_PATHS.editIcon,
  },
  {
    title: "Take it offline",
    description: "Save entries on this device, even out of signal. Sign in when you want to sync your journal.",
    icon: SVG_PATHS.cloudOffIcon,
  },
];

export default function Home() {
  return (
    <div className="flex-1 bg-[#faf5ee] text-[#362528] [--landing-accent:#a23743] [--landing-muted:#654d50] [&_:is(a,button):focus-visible]:outline-2 [&_:is(a,button):focus-visible]:outline-offset-4 [&_:is(a,button):focus-visible]:outline-[var(--landing-accent)]">
      <header className="mx-auto w-[min(calc(100%_-_2*clamp(1.25rem,5vw,5rem)),1240px)] flex min-h-[5.35rem] items-center justify-between gap-3 border-b border-[#ead9d3] max-[800px]:min-h-[4.6rem]">
        <Link href="/" className="inline-flex items-center gap-[.65rem] text-[1.05rem] leading-[1.1] font-[750] tracking-[-.035em] max-[540px]:gap-[.4rem] max-[540px]:text-[.94rem]" aria-label="Outdoor Reflections home">
          <span className="grid size-[2.45rem] flex-none place-items-center rounded-full bg-[#f4e2de] text-[var(--landing-accent)] max-[540px]:size-8" aria-hidden="true">
            <DrawIcon svgPaths={SVG_PATHS.flowerIcon} strokeWidth={1.5} iconSize={24} />
          </span>
          Outdoor Reflections
        </Link>
        <nav className="flex items-center gap-[clamp(.65rem,3vw,2rem)] text-sm font-[650] whitespace-nowrap max-[540px]:text-[.8rem] [&>a]:inline-flex [&>a]:min-h-11 [&>a]:items-center [&>a:hover]:underline [&>a:hover]:underline-offset-[.25em]" aria-label="Main navigation">
          <Link href="/entries">My journal</Link>
          <Link href="/auth" className="rounded-full border border-[#dfc3bf] px-4 max-[540px]:px-[.65rem]">Sign in</Link>
        </nav>
      </header>

      <main className="mx-auto w-[min(calc(100%_-_2*clamp(1.25rem,5vw,5rem)),1240px)]">
        <section className="grid grid-cols-[minmax(0,.87fr)_minmax(0,1.13fr)] items-center gap-[clamp(1.5rem,4.4vw,5rem)] pt-[clamp(2rem,4.5vw,4rem)] pb-[clamp(2.75rem,5vw,4.5rem)] max-[800px]:grid-cols-1 max-[800px]:gap-[1.8rem] max-[800px]:pt-[2.6rem]" aria-labelledby="hero-title">
          <div>
            <h1 id="hero-title" className="font-[Georgia,serif] text-[length:clamp(3.35rem,6.3vw,6.2rem)] leading-[.97] tracking-[-.073em] max-[800px]:text-[length:clamp(3.5rem,10vw,5rem)]">
              Journal your time <em className="text-[var(--landing-accent)]">outdoors.</em>
            </h1>
            <p className="mt-[1.65rem] max-w-[25rem] text-[length:clamp(1rem,1.35vw,1.18rem)] leading-[1.6] text-[var(--landing-muted)]">
              Write and sketch what you notice outside before the details fade. When you’re stuck for words, an AI suggestion can help you keep going.
            </p>
            <div className="mt-[1.85rem]">
              <StartButton label="Start a reflection" className="h-auto! min-h-13 w-fit! gap-[.85rem] rounded-full! bg-[var(--landing-accent)]! px-[1.3rem]! shadow-none! hover:bg-[#7f2632]!" />
              <p className="mt-[.8rem] text-[.79rem] text-[var(--landing-muted)]">No account needed to start.</p>
            </div>
          </div>

          <LandingEntryPreview />
        </section>

        <section className="grid grid-cols-3 gap-x-[clamp(1.6rem,4vw,4rem)] gap-y-6 border-t border-[#ead9d3] pt-[1.8rem] pb-12 max-[540px]:grid-cols-1" aria-labelledby="how-it-works">
          <h2 id="how-it-works" className="col-span-full font-[Georgia,serif] text-[length:clamp(1.75rem,3vw,2.5rem)] tracking-[-.04em]">How it works</h2>
          {features.map(({title, description, icon}) => (
            <article key={title}>
              <span className="grid size-[2.45rem] flex-none place-items-center rounded-full bg-[#f4e2de] text-[var(--landing-accent)]" aria-hidden="true">
                <DrawIcon svgPaths={icon} strokeWidth={1.5} iconSize={23} />
              </span>
              <h3 className="mt-[.85rem] font-[Georgia,serif] text-[1.45rem] tracking-[-.025em]">{title}</h3>
              <p className="mt-[.4rem] max-w-80 text-[.95rem] leading-[1.6] text-[var(--landing-muted)]">{description}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
