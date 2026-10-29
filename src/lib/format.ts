const czk = new Intl.NumberFormat("cs-CZ", {
  style: "currency",
  currency: "CZK",
  maximumFractionDigits: 0,
});

/** Cena je uložená v celých korunách. */
export function formatPrice(czkAmount: number) {
  return czk.format(czkAmount);
}

export function formatWeight(grams: number) {
  // Kusové zboží bez udané hmotnosti (rohy, paroží, uši) má v databázi 1 g.
  if (grams <= 1) return "1 ks";
  if (grams >= 1000) {
    const kg = grams / 1000;
    return `${Number.isInteger(kg) ? kg : kg.toFixed(1).replace(".", ",")} kg`;
  }
  return `${grams} g`;
}

/** Cena za kilogram, pro cenovky a porovnání balení. */
export function pricePerKg(priceCzk: number, grams: number) {
  return Math.round((priceCzk / grams) * 1000);
}

/** Procento s českou desetinnou čárkou a pevnou mezerou: 60 → „60 %“, 55.5 → „55,5 %“. */
export function formatPct(value: number) {
  return `${value.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} %`;
}
