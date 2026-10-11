import type { ReactNode } from "react";

type Tone = "white" | "paper" | "cream";
const tones: Record<Tone, string> = { white: "bg-white", paper: "bg-paper", cream: "bg-cream" };

/** Pruh sekce přes celou šířku. Sekce se na stránce střídají white / paper. */
export function Section({ tone = "white", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <section className={`${tones[tone]} px-5 py-10 text-center md:py-15 ${className}`}>
      <div className="mx-auto max-w-site">{children}</div>
    </section>
  );
}

/** Nadtitulek verzálkami + titulek v ručně psaném písmu. `more` je volitelný LinkArrow vpravo. */
export function SectionHeader({ eyebrow, title, more, as: Tag = "h2" }: { eyebrow?: string; title: string; more?: ReactNode; as?: "h1" | "h2" }) {
  return (
    <header className="relative mb-12.5">
      {eyebrow ? <p className="text-eyebrow text-muted uppercase">{eyebrow}</p> : null}
      <Tag className="mb-3.5 font-display text-display-md text-green md:text-display-lg">{title}</Tag>
      {more ? <div className="mt-2.5 md:absolute md:top-1/2 md:right-0 md:mt-0 md:-translate-y-1/2">{more}</div> : null}
    </header>
  );
}
