import type { ReactNode } from "react";

type Tone = "white" | "paper" | "cream" | "green";
const tones: Record<Tone, string> = { white: "bg-white", paper: "bg-paper", cream: "bg-cream", green: "bg-green text-cream" };

/** Pruh sekce přes celou šířku. Sekce se na stránce střídají white / paper; cream nebo green nejvýš jednou. */
export function Section({ tone = "white", children, className = "", id }: { tone?: Tone; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`${tones[tone]} px-5 py-10 md:py-15 ${className}`}>
      <div className="mx-auto max-w-site">{children}</div>
    </section>
  );
}

/** Nadtitulek verzálkami + titulek v ručně psaném písmu, na střed. `more` je volitelný LinkArrow vpravo. */
export function SectionHeader({ eyebrow, title, more, as: Tag = "h2", onGreen = false, children }: { eyebrow?: string; title: string; more?: ReactNode; as?: "h1" | "h2"; onGreen?: boolean; children?: ReactNode }) {
  return (
    <header className="relative mb-12.5 text-center">
      {eyebrow ? <p className={`text-eyebrow uppercase ${onGreen ? "text-cream/80" : "text-muted"}`}>{eyebrow}</p> : null}
      <Tag className={`mb-3.5 font-display text-display-md md:text-display-lg ${onGreen ? "text-cream" : "text-green"}`}>{title}</Tag>
      {children ? <div className={`mx-auto max-w-text ${onGreen ? "text-cream/90" : ""}`}>{children}</div> : null}
      {more ? <div className="mt-2.5 md:absolute md:top-1/2 md:right-0 md:mt-0 md:-translate-y-1/2">{more}</div> : null}
    </header>
  );
}

/** Starší název téhož: hlavička sekce s volitelným odstavcem. */
export function SectionHeading({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <SectionHeader eyebrow={eyebrow} title={title}>
      {children ? <p>{children}</p> : null}
    </SectionHeader>
  );
}
