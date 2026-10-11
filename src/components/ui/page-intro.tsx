import type { ReactNode } from "react";

/** Hlavička obsahové stránky: nadtitulek, display-xl na střed a úvodní odstavec v šířce textu. */
export function PageIntro({ eyebrow, title, children, actions, narrow = true }: { eyebrow?: string; title: ReactNode; children?: ReactNode; actions?: ReactNode; narrow?: boolean }) {
  return (
    <header className="mx-auto max-w-site px-5 pt-10 pb-7.5 text-center md:pt-15">
      {eyebrow ? <p className="text-eyebrow text-muted uppercase">{eyebrow}</p> : null}
      <h1 className="mb-3.5 font-display text-display-lg text-green md:text-display-xl">{title}</h1>
      {children ? <div className={`mx-auto ${narrow ? "max-w-text" : "max-w-narrow"}`}>{children}</div> : null}
      {actions ? <div className="mt-7.5 flex flex-wrap justify-center gap-5">{actions}</div> : null}
    </header>
  );
}
