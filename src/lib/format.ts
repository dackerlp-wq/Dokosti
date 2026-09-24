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
