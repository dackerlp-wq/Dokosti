type Tone = "cream" | "paper" | "green";

const tones: Record<Tone, string> = {
  cream: "bg-cream",
  paper: "bg-paper",
  green: "bg-green text-cream",
};

/** Sekce stránky. Střídat cream a paper; zelená nejvýš jednou na stránku. */
export function Section({
  tone = "cream",
  className = "",
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${tones[tone]} py-12 md:py-16 ${className}`}>
      <div className="container-dk">{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8 max-w-2xl">
      {eyebrow && <p className="label mb-2 text-brick-text">{eyebrow}</p>}
      <h2>{title}</h2>
      {children && <p className="mt-3 text-muted">{children}</p>}
    </div>
  );
}
