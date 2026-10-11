import type { ReactNode } from "react";

type FlagKind = "new" | "favourite" | "sale";

const flagStyles: Record<FlagKind, string> = {
  new: "bg-ochre-badge text-ink",
  favourite: "bg-green text-cream",
  sale: "bg-brick text-white",
};

const flagLabels: Record<FlagKind, string> = { new: "Novinka", favourite: "Oblíbené", sale: "Akce" };

/** Praporek na produktové kartě: přilepený k levé hraně, zaoblené jen pravé rohy. */
export function Flag({ kind, children }: { kind: FlagKind; children?: ReactNode }) {
  return (
    <span className={`inline-block rounded-r-control px-2.5 py-1.25 text-[15px]/[18px] font-semibold ${flagStyles[kind]}`}>
      {children ?? flagLabels[kind]}
    </span>
  );
}

export type Stock = { state: "in" } | { state: "low"; left: number } | { state: "out" };

/** Stav skladu: vždy slovo + značka jiného tvaru, barva sama stav neříká. */
export function StockStatus({ stock }: { stock: Stock }) {
  const common = "inline-flex items-center gap-1.75 text-small font-semibold";
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
        Poslední {stock.left} ks
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
