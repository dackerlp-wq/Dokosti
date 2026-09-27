import type { Product } from "@/lib/catalog";

/** Stav skladu pro zákazníka: skladem, posledních pár kusů, nebo není. */
export function stockLabel(p: Pick<Product, "inStock" | "stockQty" | "unit">): { kind: "skladem" | "posledni" | "neni"; text: string } {
  if (!p.inStock || (p.stockQty !== null && p.stockQty !== undefined && p.stockQty <= 0)) return { kind: "neni", text: "Momentálně není" };
  if (p.stockQty !== null && p.stockQty !== undefined && p.unit !== "kg" && p.stockQty <= 5) {
    const n = Math.floor(p.stockQty);
    return { kind: "posledni", text: n === 1 ? "Poslední kus" : `Poslední ${n} ks` };
  }
  return { kind: "skladem", text: "Skladem" };
}

/** Kolik kusů jde nejvýš do košíku (Infinity, když se sklad neeviduje). */
export function maxQty(p: Pick<Product, "inStock" | "stockQty">): number {
  if (!p.inStock) return 0;
  return p.stockQty === null || p.stockQty === undefined ? Infinity : Math.max(0, Math.floor(p.stockQty));
}
