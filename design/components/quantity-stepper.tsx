"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";

/** Krokovač množství pro detail produktu a košík (60 px, stejná výška jako Button size="lg"). */
export function QuantityStepper({ name = "quantity", defaultValue = 1, min = 1, max = 99, onChange }: { name?: string; defaultValue?: number; min?: number; max?: number; onChange?: (value: number) => void }) {
  const [value, setValue] = useState(defaultValue);
  const set = (next: number) => {
    const clamped = Math.min(max, Math.max(min, Number.isFinite(next) ? next : min));
    setValue(clamped);
    onChange?.(clamped);
  };
  const btn = "flex w-12 items-center justify-center bg-paper text-green transition-colors duration-300 hover:bg-cream disabled:opacity-40";
  return (
    <div className="inline-flex items-center gap-2.5">
      <div className="inline-flex h-15 overflow-hidden rounded-control border border-muted bg-white">
        <button type="button" className={`${btn} border-r border-line`} aria-label="Ubrat" disabled={value <= min} onClick={() => set(value - 1)}>
          <Minus className="size-4" strokeWidth={2.5} aria-hidden />
        </button>
        <input
          name={name}
          inputMode="numeric"
          aria-label="Počet kusů"
          className="w-14 bg-transparent text-center text-body text-ink"
          value={value}
          onChange={(e) => set(parseInt(e.target.value, 10))}
        />
        <button type="button" className={`${btn} border-l border-line`} aria-label="Přidat" disabled={value >= max} onClick={() => set(value + 1)}>
          <Plus className="size-4" strokeWidth={2.5} aria-hidden />
        </button>
      </div>
      <span>ks</span>
    </div>
  );
}
