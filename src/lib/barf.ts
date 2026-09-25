/**
 * Výpočet denní dávky syrové stravy. Orientační hodnoty, které používá kalkulačka
 * na stránce Jak začít. Není to zdravotní doporučení.
 */
export type Animal = "pes" | "kocka";
export type Age = "mlade" | "dospely" | "senior";
export type Activity = "nizka" | "bezna" | "vysoka";
export type Body = "hubeny" | "idealni" | "pri-tele";

export type CalcInput = { animal: Animal; age: Age; weightKg: number; activity: Activity; body: Body };

export type CalcResult = {
  dailyGrams: number;
  weeklyKg: number;
  /** Rozpis denní dávky v gramech. */
  breakdown: { label: string; grams: number }[];
  pct: number;
};

export function calcDailyDose(i: CalcInput): CalcResult {
  // Základní procento hmotnosti podle zvířete a věku.
  let pct = i.animal === "pes" ? 2.5 : 3.5;
  if (i.age === "mlade") pct = i.animal === "pes" ? 5 : 6.5;
  if (i.age === "senior") pct -= 0.4;
  // Aktivita a postava dávku posouvají o kousek nahoru nebo dolů.
  if (i.age !== "mlade") {
    if (i.activity === "nizka") pct -= 0.4;
    if (i.activity === "vysoka") pct += 0.6;
  }
  if (i.body === "hubeny") pct += 0.3;
  if (i.body === "pri-tele") pct -= 0.4;
  pct = Math.max(1.5, Math.round(pct * 10) / 10);

  const dailyGrams = Math.round((i.weightKg * 1000 * pct) / 100 / 5) * 5;
  const weeklyKg = Math.round((dailyGrams * 7) / 100) / 10;

  const g = (share: number) => Math.round((dailyGrams * share) / 5) * 5;
  const breakdown =
    i.animal === "pes"
      ? [
          { label: "svalovina", grams: g(0.8 * 0.5) },
          { label: "bachory", grams: g(0.8 * 0.2) },
          { label: "vnitřnosti", grams: g(0.8 * 0.15) },
          { label: "masité kosti", grams: g(0.8 * 0.15) },
          { label: "zelenina a ovoce", grams: g(0.2) },
        ]
      : [
          { label: "svalovina vč. srdcí", grams: g(0.8) },
          { label: "masité kosti", grams: g(0.1) },
          { label: "vnitřnosti", grams: g(0.1) },
        ];
  return { dailyGrams, weeklyKg, breakdown, pct };
}
