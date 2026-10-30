"use client";

import { Cat, Dog } from "lucide-react";
import { ACTIVITY_LABEL, CONDITION_LABEL } from "@/lib/barf";
import { FEEDING_LABEL, type PetProfile, SEX_LABEL } from "@/lib/club";

/** Věk lidsky: „4 měsíce“, „3 roky“, „8 let“. */
function ageText(months: number | null): string | null {
  if (months === null) return null;
  if (months < 24 && months % 12 !== 0) {
    const m = months;
    return `${m} ${m === 1 ? "měsíc" : m < 5 ? "měsíce" : "měsíců"}`;
  }
  const y = Math.round(months / 12);
  return `${y} ${y === 1 ? "rok" : y < 5 ? "roky" : "let"}`;
}

/**
 * Boční panel průvodce: profil zvířete, který se doplňuje s každou odpovědí, a pod ním odhad denní dávky.
 * Odhad je stejný výpočet jako plán (calculate), jen bez sestavy dodávky; zpřesní se v dalších krocích.
 */
export function PlanSide({ pet, ageMonths, step, grams, pct, firstAcc }: { pet: PetProfile; ageMonths: number | null; step: number; grams: number | null; pct: number | null; firstAcc: string }) {
  const Pet = pet.species === "kocka" ? Cat : Dog;
  const rows: [string, string | null][] = [
    ["Zvíře", SEX_LABEL[pet.species][pet.sex].toLowerCase()],
    ["Věk", step > 2 || ageMonths !== null ? ageText(ageMonths) : null],
    ["Váha", pet.weightKg > 0 ? `${pet.weightKg.toLocaleString("cs-CZ")} kg · ${CONDITION_LABEL[pet.condition].toLowerCase()}` : null],
    ["Pohyb", step >= 4 ? ACTIVITY_LABEL[pet.species][pet.activity].toLowerCase() : null],
    ["Kastrace", step >= 4 ? (pet.neutered ? "ano" : "ne") : null],
    ["Teď žere", pet.feedingNow ? FEEDING_LABEL[pet.feedingNow].toLowerCase() : null],
  ];
  return (
    <aside className="hidden flex-col gap-3.5 lg:flex">
      <div className="rounded-card bg-paper p-6">
        <div className="flex items-center gap-3.5">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-green text-cream">
            <Pet className="size-8" strokeWidth={1.5} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-eyebrow text-muted uppercase">Profil</p>
            <p className="truncate font-display text-display-sm text-green md:text-[40px]/[42px]">{pet.name.trim() || "Bez jména"}</p>
          </div>
        </div>
        <dl className="mt-4.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3.5 gap-y-2 text-[14px]/[22px]">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt>{k}</dt>
              <dd className={v ? "font-bold text-green" : "text-muted"}>{v ?? "…"}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="rounded-card bg-green p-6 text-cream" aria-live="polite">
        <p className="text-eyebrow uppercase opacity-90">Zatím to vychází na</p>
        {grams ? (
          <>
            <p className="mt-0.5 text-[44px]/[50px] font-extrabold">
              ~{grams} g <span className="text-[18px] font-semibold">denně</span>
            </p>
            <div className="mt-3.5 mb-1.5 h-2.5 overflow-hidden rounded-control bg-cream/20" aria-hidden>
              <div className="h-full bg-ochre transition-[width] duration-300" style={{ width: `${Math.min(100, (pct ?? 0) * 25)}%` }} />
            </div>
            <p className="text-small">
              {pct?.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} % váhy · dávku upřesníme v dalších krocích pro {firstAcc}
            </p>
          </>
        ) : (
          <p className="mt-1.5 text-[15px]/[24px]">Jakmile zadáte váhu, ukážeme odhad denní dávky.</p>
        )}
      </div>
    </aside>
  );
}
