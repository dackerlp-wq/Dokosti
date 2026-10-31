import type { MasoKind, Product } from "@/lib/catalog";

/**
 * Barevné rozlišení podkategorií řady Maso, kosti a vnitřnosti (tokeny v design/dokosti-theme.css).
 * Třídy jsou vypsané celé, aby je Tailwind našel.
 */
export const KIND_TONE: Record<MasoKind, { chip: string; bar: string; dot: string; text: string }> = {
  svalovina: { chip: "bg-svalovina-soft text-svalovina", bar: "bg-svalovina", dot: "bg-svalovina", text: "text-svalovina" },
  kosti: { chip: "bg-kosti-soft text-kosti", bar: "bg-kosti", dot: "bg-kosti", text: "text-kosti" },
  vnitrnosti: { chip: "bg-vnitrnosti-soft text-vnitrnosti", bar: "bg-vnitrnosti", dot: "bg-vnitrnosti", text: "text-vnitrnosti" },
  ryby: { chip: "bg-ryby-soft text-ryby", bar: "bg-ryby", dot: "bg-ryby", text: "text-ryby" },
};

/** Barva produktu, když patří do podkategorie řady Maso; jinak null. */
export function kindTone(p: Pick<Product, "line" | "kind">) {
  return p.line === "maso" && p.kind && p.kind in KIND_TONE ? KIND_TONE[p.kind as MasoKind] : null;
}
