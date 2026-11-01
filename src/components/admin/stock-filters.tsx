"use client";

export type FilterOption = { value: string; label: string };

/**
 * Jednotná lišta hledání a filtrů. Změny se použijí společně tlačítkem; Enter v hledání funguje také.
 */
export function StockFilters({ action, hidden = {}, search, selects, children }: { action: string; hidden?: Record<string, string | undefined>; search?: { name: string; value?: string; placeholder: string }; selects: { name: string; value?: string; label: string; options: FilterOption[] }[]; children?: React.ReactNode }) {
  const hasActiveFilters = Boolean(search?.value || Object.values(hidden).some(Boolean) || selects.some((s) => s.value));
  return (
    <form action={action} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white p-2.5">
      {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      {search && <input type="search" name={search.name} defaultValue={search.value} placeholder={search.placeholder} aria-label={search.placeholder} className="min-h-10 w-full py-1 sm:w-64" />}
      {selects.map((s) => (
        <select key={s.name} name={s.name} defaultValue={s.value ?? ""} aria-label={s.label} className="min-h-10 w-auto py-1">
          {s.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}
      <button type="submit" className="text-button min-h-10 shrink-0 rounded-control bg-green px-4 text-white hover:bg-green-hover">
        Použít filtry
      </button>
      {hasActiveFilters && <a href={action} className="shrink-0 px-1 text-sm font-semibold text-muted underline underline-offset-2">Vymazat</a>}
      {children}
    </form>
  );
}
