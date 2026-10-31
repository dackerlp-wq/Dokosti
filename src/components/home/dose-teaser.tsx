"use client";

import { Info } from "lucide-react";
import { useMemo, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { calculate, newAnimal } from "@/lib/barf";

/**
 * Jediná kalkulačka na webu (blok Krmení na míru na hlavní stránce): váha psa a orientační denní dávka.
 * Přesnou dávku a nákup počítá průvodce /krmeni-na-miru.
 */
export function DoseTeaser() {
  const [kg, setKg] = useState(15);
  const daily = useMemo(() => calculate({ ...newAnimal("pes"), weightKg: kg }).dailyGrams, [kg]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="teaser-vaha" className="text-small text-cream/80">
            Váha psa
          </label>
          <span className="font-display text-[1.75rem] font-black text-white">{kg} kg</span>
        </div>
        <input
          id="teaser-vaha"
          type="range"
          min={2}
          max={60}
          value={kg}
          onChange={(e) => setKg(Number(e.target.value))}
          className="min-h-0 border-0 bg-transparent p-0 accent-ochre"
        />
      </div>
      <div className="rounded-control border border-white/10 bg-white/5 p-4">
        <div className="text-small text-cream/80">Orientační denní dávka</div>
        <div className="font-display text-[1.75rem] font-black text-white">{daily} g</div>
      </div>
      <p className="flex gap-2.5 text-small text-cream/85">
        <Info className="mt-0.5 size-4 shrink-0 text-ochre" strokeWidth={1.75} aria-hidden />
        <span>
          Jde jen o hrubý odhad pro dospělého psa. Přesnou dávku podle věku, pohybu a postavy spočítáte v plánu. Plán je bez závazku a nemusíte nic kupovat.
        </span>
      </p>
      <div>
        <ButtonLink href="/krmeni-na-miru" variant="secondary" size="md" className="ring-0">
          Sestavit plán zdarma
        </ButtonLink>
      </div>
    </div>
  );
}
