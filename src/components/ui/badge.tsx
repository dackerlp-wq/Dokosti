import type { ReactNode } from "react";

/* Štítek pro administraci a stavy. V e-shopu na kartě produktu použij Flag, u skladu StockStatus. */
type Kind = "novinka" | "sleva" | "skladem" | "posledni" | "neutral";

const styles: Record<Kind, string> = {
  novinka: "bg-ochre-badge text-ink",
  sleva: "bg-brick text-white",
  skladem: "bg-green text-cream",
  posledni: "bg-ochre-badge text-ink",
  neutral: "bg-paper text-muted border border-line",
};

export function Badge({ kind = "neutral", children }: { kind?: Kind; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-control px-2 py-0.5 text-small font-semibold ${styles[kind]}`}>{children}</span>;
}

export type FlagKind = "new" | "favourite" | "sale";

const flagStyles: Record<FlagKind, string> = {
  new: "bg-ochre-badge text-ink",
  favourite: "bg-green text-cream",
  sale: "bg-brick text-white",
};

const flagLabels: Record<FlagKind, string> = { new: "Novinka", favourite: "Oblíbené", sale: "Akce" };

/** Praporek na produktové kartě: přilepený k levé hraně, zaoblené jen pravé rohy. */
export function Flag({ kind, children }: { kind: FlagKind; children?: ReactNode }) {
  return <span className={`inline-block rounded-r-control px-2.5 py-1.25 text-[15px]/[18px] font-semibold ${flagStyles[kind]}`}>{children ?? flagLabels[kind]}</span>;
}

export type Stock = { state: "in" } | { state: "low"; left: number } | { state: "out" };

/** Stav skladu: vždy slovo + značka jiného tvaru, barva sama stav neříká. */
export function StockStatus({ stock, className = "" }: { stock: Stock; className?: string }) {
  const common = `inline-flex items-center gap-1.75 text-small font-semibold ${className}`;
  if (stock.state === "in") {
    return (
      <span className={`${common} text-green`}>
        <span className="size-2.25 rounded-full bg-olive" aria-hidden />
        Skladem
      </span>
    );
  }
  if (stock.state === "low") {
    return (
      <span className={`${common} text-brick-text`}>
        <span className="size-2.25 rotate-45 rounded-[1px] bg-brick" aria-hidden />
        {stock.left === 1 ? "Poslední kus" : `Poslední ${stock.left} ks`}
      </span>
    );
  }
  return (
    <span className={`${common} text-muted`}>
      <span className="size-2.25 rounded-full ring-2 ring-inset ring-muted" aria-hidden />
      Naskladňujeme
    </span>
  );
}
