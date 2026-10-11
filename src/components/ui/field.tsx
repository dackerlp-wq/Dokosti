import type { ComponentProps, ReactNode } from "react";

/** Popisek nad polem: text-label v zelené. */
export const fieldLabel = "mb-1 block text-label text-green";
/** Pole podle receptu Field: 55 px, bílé, okraj muted, rohy 3 px (fokus a chybu řeší globální styl). */
export const fieldInput = "min-h-13.75 px-5";

/**
 * Pole formuláře: popisek nad polem, volitelná nápověda a chyba, která říká, co opravit.
 * Bez `children` vykreslí `<input>` s předanými vlastnostmi.
 */
export function Field({ label, hint, error, className = "", inputClassName = "", children, ...rest }: { label: string; hint?: string; error?: string; className?: string; inputClassName?: string; children?: ReactNode } & ComponentProps<"input">) {
  return (
    <label className={`block ${className}`}>
      <span className={fieldLabel}>
        {label}
        {hint ? <span className="ml-1 font-normal text-muted">({hint})</span> : null}
      </span>
      {children ?? <input {...rest} className={`${fieldInput} ${error ? "border-brick-text" : ""} ${inputClassName}`} aria-invalid={error ? true : undefined} />}
      {error ? <span className="mt-1 block text-small font-semibold text-brick-text">{error}</span> : null}
    </label>
  );
}

/** Volba v řadě (den, interval, druh): obrys muted, vybraná zelená. */
export function chipClass(on: boolean, className = "") {
  return `inline-flex min-h-10 items-center justify-center gap-2 rounded-control border px-3.5 text-button transition-colors duration-300 ${on ? "border-green bg-green text-cream" : "border-muted bg-white text-green hover:bg-paper"} ${className}`;
}

/** Číslo kroku v zeleném disku (pokladna, přechod krok za krokem). */
export function StepDisc({ n, className = "" }: { n: number | string; className?: string }) {
  return <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-green text-[16px] font-bold text-cream ${className}`}>{n}</span>;
}

/** Bílý panel s linkou pro formuláře a výpisy. */
export const panel = "rounded-card border border-line bg-white p-5";
/** Panel se souhrnem na paper. */
export const summaryPanel = "rounded-card bg-paper p-5";
