"use client";

import { Minus, Plus } from "lucide-react";

/** Krokovač množství pro detail produktu a košík (60 px, stejná výška jako Button size="lg"; `size="sm"` 40 px do košíku). Stav drží rodič. */
export function QuantityStepper({ value, onChange, min = 1, max = 99, size = "lg", name = "quantity" }: { value: number; onChange: (value: number) => void; min?: number; max?: number; size?: "sm" | "lg"; name?: string }) {
  const set = (next: number) => onChange(Math.min(max, Math.max(min, Number.isFinite(next) ? next : min)));
  const h = size === "lg" ? "h-15" : "h-10";
  const w = size === "lg" ? "w-12" : "w-9";
  const btn = `flex ${w} items-center justify-center bg-paper text-green transition-colors duration-300 hover:bg-cream disabled:opacity-40`;
  return (
    <div className={`inline-flex ${h} overflow-hidden rounded-control border border-muted bg-white`}>
      <button type="button" className={`${btn} border-r border-line`} aria-label="Ubrat" disabled={value <= min} onClick={() => set(value - 1)}>
        <Minus className="size-4" strokeWidth={2.5} aria-hidden />
      </button>
      <input
        name={name}
        inputMode="numeric"
        aria-label="Počet kusů"
        className={`${size === "lg" ? "w-14" : "w-10"} min-h-0 rounded-none border-0 bg-transparent px-0 text-center text-body text-ink focus-visible:outline-offset-[-2px]`}
        value={value}
        onChange={(e) => set(parseInt(e.target.value, 10))}
      />
      <button type="button" className={`${btn} border-l border-line`} aria-label="Přidat" disabled={value >= max} onClick={() => set(value + 1)}>
        <Plus className="size-4" strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  );
}
