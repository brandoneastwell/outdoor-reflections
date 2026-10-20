import Link from "next/link";
import DrawIcon from "@/components/DrawIcon";
import StartButton from "@/components/StartButton";
import {SVG_PATHS} from "@/constants/svgPaths";
import styles from "./page.module.css";

function Garden() {
  return (
    <svg aria-hidden="true" className={styles.garden} viewBox="0 0 760 330" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g className={styles.stems} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M51 322c7-55 11-106 1-169M52 211c-19-9-32-25-37-47 24 4 38 18 37 47ZM54 245c20-12 33-30 37-54-23 5-37 23-37 54Z" />
        <path d="M119 327c-2-86 4-157 30-228M131 186c-27-12-44-33-48-62 30 5 47 25 48 62ZM134 221c27-10 46-30 55-58-31 2-49 22-55 58ZM145 112c-11-17-12-36-3-55 16 17 17 36 3 55Z" />
        <path d="M225 326c4-65 2-124-13-177M217 175c20-20 27-44 20-72-23 17-29 42-20 72ZM219 218c-26-6-47-20-61-43 29-2 50 12 61 43Z" />
        <path d="M303 327c-5-98 9-181 43-249M324 187c-31-12-51-36-56-69 34 6 54 29 56 69ZM326 227c31-11 54-32 66-63-36 2-58 23-66 63ZM342 91c-5-25 1-46 19-63 9 26 3 47-19 63Z" />
        <path d="M424 328c6-78 2-148-20-211M411 146c20-23 25-49 15-77-23 21-28 46-15 77ZM418 208c-32-5-57-21-73-49 35 0 59 16 73 49ZM419 250c31-6 54-24 69-51-35 0-58 17-69 51Z" />
        <path d="M532 327c-2-88 11-160 43-217M550 196c-29-13-47-36-51-68 32 6 50 29 51 68ZM555 239c29-9 51-29 63-57-33 1-54 20-63 57ZM572 122c-4-22 2-41 18-56 7 23 1 42-18 56Z" />
        <path d="M638 327c3-72-4-137-24-190M620 164c18-22 23-46 13-72-21 19-25 44-13 72ZM627 222c-30-4-53-19-68-44 32-1 55 14 68 44Z" />
        <path d="M710 326c-3-57 0-108 13-152M718 208c-22-10-35-28-38-52 25 5 38 22 38 52ZM716 248c21-8 37-23 46-44-24 1-40 16-46 44Z" />
      </g>
      <g className={styles.blooms}>
        <path d="M201 145c-15-12-15-29 1-40 16 8 20 26 9 41-4 5-7 5-10-1Z" />
        <path d="M397 111c-18-11-20-30-4-44 19 7 25 26 14 43-3 6-6 6-10 1Z" />
        <path d="M604 133c-13-14-10-31 8-39 15 11 16 29 2 42-4 4-7 3-10-3Z" />
      </g>
      <g className={styles.seedHeads} stroke="currentColor">
        <circle cx="50" cy="143" r="13" /><circle cx="50" cy="143" r="4" />
        <circle cx="213" cy="137" r="10" /><circle cx="213" cy="137" r="3" />
        <circle cx="404" cy="106" r="11" /><circle cx="404" cy="106" r="3" />
        <circle cx="615" cy="128" r="10" /><circle cx="615" cy="128" r="3" />
        <circle cx="724" cy="164" r="12" /><circle cx="724" cy="164" r="4" />
      </g>
    </svg>
  );
}

function JournalCard() {
  return (
    <div className={styles.cardWrap}>
      <div className={styles.cardGlow} />
      <article className={styles.card} aria-label="A preview of a journal reflection">
        <header className={styles.cardHeader}>
          <span>Sunday · 21 September</span>
          <span className={styles.saved}><i /> saved here</span>
        </header>
        <div className={styles.cardBody}>
          <div className={styles.cardCopy}>
            <p className={styles.eyebrow}>Today, outside</p>
            <h2>Where the<br />light landed.</h2>
            <p className={styles.entry}>The path opened after the trees. Everything was quiet except the grass moving in the wind.</p>
            <div className={styles.note}>
              <span>remember</span>
              <p>the warm stone, one wren,<br />and the smell after rain.</p>
            </div>
          </div>
          <div className={styles.sketch}>
            <svg viewBox="0 0 180 280" fill="none" aria-hidden="true">
              <path d="M89 267c-5-75 5-147 34-214" />
              <path d="M100 178c-34-10-55-33-60-67 37 5 59 28 60 67Z" />
              <path d="M99 215c34-9 59-31 72-64-38 1-62 23-72 64Z" />
              <path d="M119 66c-6-23 0-44 18-61 9 25 3 46-18 61Z" />
              <path d="M73 253c23 5 45 4 67-3" className={styles.groundLine} />
            </svg>
            <span>found here</span>
          </div>
        </div>
        <footer className={styles.cardFooter}>
          <span><i /> offline first</span>
          <span>words + sketches</span>
        </footer>
      </article>
    </div>
  );
}

export default function Home() {
  return (
    <main className={styles.page}>
      <div className={styles.paperGrain} />
      <nav className={styles.nav} aria-label="Main navigation">
        <Link href="/" className={styles.brand} aria-label="Outdoor Reflections home">
          <DrawIcon svgPaths={SVG_PATHS.flowerIcon} strokeWidth={1.45} iconSize={30} fill="currentColor" />
          <span>outdoor<br />reflections</span>
        </Link>
        <div className={styles.navLinks}>
          <Link href="/entries">My journal</Link>
          <Link href="/auth" className={styles.signIn}>Sign in <span aria-hidden="true">↗</span></Link>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.intro}>
          <p className={styles.kicker}><span /> A journal for time outside</p>
          <h1>Keep the little<br />things you notice.</h1>
          <p className={styles.subhead}>A quiet place for words and sketches from the paths, parks, and open air you want to remember.</p>
          <div className={styles.actions}>
            <StartButton label="Begin a reflection" className={styles.primaryAction} />
            <Link href="/entries" className={styles.textAction}>Open my journal <span aria-hidden="true">→</span></Link>
          </div>
          <p className={styles.promise}><span>✦</span> No account needed · works without a signal</p>
        </div>

        <div className={styles.visual}>
          <p className={styles.year} aria-hidden="true">2026</p>
          <p className={styles.yearLabel}>your year, growing slowly</p>
          <JournalCard />
        </div>
      </section>

      <div className={styles.gardenBed}><Garden /></div>
      <footer className={styles.footer}>
        <p>Private on your device</p>
        <p><span /> made for slower moments <span /></p>
        <p>Write · draw · return</p>
      </footer>
    </main>
  );
}
