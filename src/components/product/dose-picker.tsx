"use client";

import Link from "next/link";
import { Cat, Dog } from "lucide-react";
import { useState } from "react";
import type { DoseRule, SupplementDose } from "@/lib/catalog";

type Option = { label: string; range: string; dose: string; note?: string };

const NAMES: Record<number, string[]> = {
  2: ["Menší", "Větší"],
  3: ["Malý", "Střední", "Velký"],
  4: ["Malý", "Střední", "Velký", "Obří"],
  5: ["Malý", "Střední", "Velký", "Obří", "Největší"],
};

/** Pásma hmotnosti pro dávku na kg: [od, do, typická hmotnost pro výpočet]. */
const DOG_BANDS: [number, number | null, number][] = [
  [0, 10, 5],
  [10, 25, 15],
  [25, 40, 30],
  [40, 65, 50],
  [65, null, 70],
];
const CAT_BANDS: [number, number | null, number][] = [
  [0, 4, 3],
  [4, 6, 5],
  [6, null, 7],
];

const num = (n: number) => n.toLocaleString("cs-CZ", { maximumFractionDigits: n < 10 ? 1 : 0 });
const span = (min: number, max: number, unit: string) => (Math.abs(max - min) < 0.05 ? `${num(min)} ${unit}` : `${num(min)}–${num(max)} ${unit}`);
const rangeText = (from: number, to: number | null) => (to === null ? `nad ${from} kg` : from === 0 ? `do ${to} kg` : `${from}–${to} kg`);

/** Možnosti výběru velikosti zvířete z pravidla dávky. Dávku na 100 g krmiva podle velikosti zvířete neukážeme (null). */
function options(rule: DoseRule, unit: string, cat: boolean): Option[] | null {
  if (rule.per === "tiers") {
    const names = NAMES[rule.tiers.length] ?? [];
    let from = 0;
    return rule.tiers.map(([to, min, max], i) => {
      const o = { label: names[i] ?? rangeText(from, to), range: rangeText(from, to), dose: span(min, max, unit) };
      from = to ?? from;
      return o;
    });
  }
  if (rule.per === "body") {
    const bands = cat ? CAT_BANDS : DOG_BANDS;
    const names = NAMES[bands.length] ?? [];
    return bands.map(([from, to, w], i) => ({ label: names[i], range: rangeText(from, to), dose: span(rule.min * w, rule.max * w, unit), note: `pro ${cat ? "kočku" : "psa"} kolem ${w} kg` }));
  }
  return null;
}

/** Hravý výběr velikosti zvířete: klik na velikost ukáže denní dávku doplňku. Jen pro dávku podle hmotnosti zvířete. */
export function DosePicker({ dose }: { dose: SupplementDose }) {
  const cat = !dose.pes && !!dose.kocka;
  const rule = dose.pes ?? dose.kocka;
  const opts = rule ? options(rule, dose.unit, cat) : null;
  const [active, setActive] = useState(opts && opts.length > 1 ? 1 : 0);
  if (!opts || opts.length === 0) return null;
  const Icon = cat ? Cat : Dog;
  const current = opts[Math.min(active, opts.length - 1)];

  return (
    <div>
      <div className="grid grid-cols-2 gap-3.5 xs:grid-cols-3 lg:grid-cols-5" role="group" aria-label={`Velikost ${cat ? "kočky" : "psa"}`}>
        {opts.map((o, i) => {
          const on = i === active;
          return (
            <button
              key={o.range}
              type="button"
              aria-pressed={on}
              onClick={() => setActive(i)}
              className={`flex min-h-35 flex-col items-center justify-end gap-1.5 rounded-card border px-2.5 py-4 transition-colors duration-300 ${on ? "border-green bg-green text-cream" : "border-line bg-white text-green hover:border-brick"}`}
            >
              <Icon strokeWidth={1.75} style={{ width: 26 + i * 6, height: 26 + i * 6 }} aria-hidden />
              <span className="text-[15px]/[20px] font-bold">{o.label}</span>
              <span className="text-small">{o.range}</span>
            </button>
          );
        })}
      </div>
      <div className="mx-auto mt-7.5 flex max-w-[560px] flex-wrap items-center justify-center gap-x-7.5 gap-y-2.5 rounded-card border border-line bg-white p-6 text-center">
        <div>
          <p className="text-label">Denní dávka</p>
          <p className="text-[40px]/[48px] font-extrabold text-green" aria-live="polite">
            {current.dose}
          </p>
          {current.note && <p className="text-small">{current.note}</p>}
        </div>
        <p className="flex-1 basis-[220px] text-left text-small">
          Začněte nižší dávkou. Přesnou dávku pro celý jídelníček spočítá{" "}
          <Link href="/#krmeni-na-miru" className="text-brick-text underline">
            kalkulačka
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

