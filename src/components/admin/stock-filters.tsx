"use client";

import { useRef } from "react";

export type FilterOption = { value: string; label: string };

/**
 * Lišta filtrů nad tabulkou: formulář GET, výběry odešlou hned po změně,
 * hledání po Enteru. Skryté hodnoty (období) se zachovají.
 */
export function StockFilters({ action, hidden = {}, search, selects, children }: { action: string; hidden?: Record<string, string | undefined>; search?: { name: string; value?: string; placeholder: string }; selects: { name: string; value?: string; label: string; options: FilterOption[] }[]; children?: React.ReactNode }) {
  const ref = useRef<HTMLFormElement>(null);
  const submit = () => ref.current?.requestSubmit();
  return (
    <form ref={ref} action={action} className="flex flex-wrap items-center gap-2">
      {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      {search && <input type="search" name={search.name} defaultValue={search.value} placeholder={search.placeholder} aria-label={search.placeholder} className="min-h-9 w-full py-1 sm:w-56" />}
      {selects.map((s) => (
        <select key={s.name} name={s.name} defaultValue={s.value ?? ""} aria-label={s.label} onChange={submit} className="min-h-9 w-auto py-1">
          {s.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}
      <button type="submit" className="label min-h-9 shrink-0 rounded-[var(--radius-control)] border border-green px-3 text-[11px] text-green">
        Filtrovat
      </button>
      {children}
    </form>
  );
}
