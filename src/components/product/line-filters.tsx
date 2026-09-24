import Link from "next/link";
import type { Animal } from "@/lib/catalog";

const OPTIONS: { value: Animal | null; label: string }[] = [
  { value: null, label: "Vše" },
  { value: "pes", label: "Pro psy" },
  { value: "kocka", label: "Pro kočky" },
];

/** Filtr podle zvířete. Řada je kategorie, zvíře a maso jsou filtry. */
export function LineFilters({ active }: { active: Animal | null }) {
  return (
    <div className="flex gap-2" role="group" aria-label="Filtr podle zvířete">
      {OPTIONS.map((o) => {
        const isActive = o.value === active;
        return (
          <Link
            key={o.label}
            href={o.value ? `?zvire=${o.value}` : "?"}
            aria-current={isActive ? "true" : undefined}
            className={`label inline-flex min-h-10 items-center rounded-full border px-4 text-[13px] ${
              isActive ? "border-green bg-green text-cream" : "border-line bg-paper text-green hover:border-green"
            }`}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}
