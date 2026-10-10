/**
 * Rozpis DPH z cen včetně daně. Každá položka má svou sazbu (products.vat_rate), sleva se rozpočítá
 * poměrně, doprava jde do sazby, která v dokladu převažuje (vedlejší plnění ke zboží).
 */
export type VatLine = { gross: number; rate: number };
export type VatGroup = { rate: number; gross: number; base: number; vat: number };

export function vatBreakdown(lines: VatLine[], discount = 0, shipping = 0): VatGroup[] {
  const goods = lines.reduce((n, l) => n + l.gross, 0);
  const byRate = new Map<number, number>();
  for (const l of lines) {
    // sleva poměrně podle hodnoty položky
    const share = goods > 0 ? l.gross - (discount * l.gross) / goods : l.gross;
    byRate.set(l.rate, (byRate.get(l.rate) ?? 0) + share);
  }
  if (shipping > 0) {
    const dominant = [...byRate.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 21;
    byRate.set(dominant, (byRate.get(dominant) ?? 0) + shipping);
  }
  return [...byRate.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([rate, gross]) => {
      const g = Math.round(gross);
      const base = Math.round(g / (1 + rate / 100));
      return { rate, gross: g, base, vat: g - base };
    });
}
