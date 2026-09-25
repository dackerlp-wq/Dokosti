"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";

type Mode = { id: string; label: string; pct: number; hint: string };

/** Orientační denní dávka syrového krmiva v % hmotnosti. Není to zdravotní doporučení. */
const MODES: Mode[] = [
  { id: "pes", label: "Dospělý pes", pct: 2.5, hint: "2–3 % hmotnosti denně" },
  { id: "aktivni", label: "Aktivní pes", pct: 3.5, hint: "3–4 % hmotnosti denně" },
  { id: "stene", label: "Štěně", pct: 6, hint: "5–8 % hmotnosti, rozdělit do více porcí" },
  { id: "kocka", label: "Kočka", pct: 3, hint: "zhruba 3 % hmotnosti denně" },
];

export function DoseCalculator({ weightGrams, priceCzk }: { weightGrams: number; priceCzk: number }) {
  const [mode, setMode] = useState(MODES[0]);
  const [kg, setKg] = useState("");
  const w = Number(kg.replace(",", "."));
  const daily = w > 0 ? Math.round((w * 1000 * mode.pct) / 100) : 0;
  const days = daily > 0 ? weightGrams / daily : 0;
  const perDay = daily > 0 ? (priceCzk / weightGrams) * daily : 0;

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
      <p className="label text-[11px] text-brick-text">Kolik dávat</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_1fr]">
        <label className="block">
          <span className="label mb-1 block text-[11px] text-muted">Pro koho</span>
          <select value={mode.id} onChange={(e) => setMode(MODES.find((m) => m.id === e.target.value) ?? MODES[0])}>
            {MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label mb-1 block text-[11px] text-muted">Hmotnost zvířete (kg)</span>
          <input type="number" inputMode="decimal" min={0.5} max={100} step={0.5} value={kg} onChange={(e) => setKg(e.target.value)} placeholder="např. 20" />
        </label>
      </div>
      {daily > 0 ? (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Stat value={`${daily} g`} label="denně" />
          <Stat value={days >= 1 ? `${Math.floor(days)} ${days < 5 && days >= 2 ? "dny" : days < 2 ? "den" : "dní"}` : "méně než den"} label="vydrží balení" />
          <Stat value={formatPrice(Math.round(perDay))} label="na den" />
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">Zadejte hmotnost a spočítáme denní dávku a na kolik dní balení vystačí.</p>
      )}
      <p className="mt-3 text-xs text-muted">
        Orientačně: {mode.hint}. Každé zvíře je jiné, sledujte váhu a upravte. Při potížích se poraďte s veterinářem.
      </p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[var(--radius-control)] bg-cream p-2">
      <p className="font-display text-[18px] font-semibold">{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}
