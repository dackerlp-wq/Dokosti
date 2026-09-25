import { Search } from "lucide-react";

/** Vyhledávání: obyčejný GET formulář, funguje i bez JavaScriptu. */
export function SearchForm({ defaultValue = "", className = "" }: { defaultValue?: string; className?: string }) {
  return (
    <form action="/hledat" role="search" className={`relative ${className}`}>
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Hledat, např. hovězí"
        aria-label="Hledat v nabídce"
        className="min-h-9 pr-9 text-sm"
      />
      <button type="submit" aria-label="Hledat" className="absolute right-1 top-1/2 -translate-y-1/2 rounded-[var(--radius-control)] p-1.5 text-green hover:bg-cream">
        <Search strokeWidth={1.75} className="h-4 w-4" />
      </button>
    </form>
  );
}
