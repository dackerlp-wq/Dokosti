import { Bone, ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { MenuLine } from "@/lib/menu";

/**
 * Lišta řad s rozbalovacím menu: po najetí se ukáží druhy masa v řadě s obrázkem a počtem.
 * Jen CSS (hover a focus-within), bez JavaScriptu, aby hlavička zůstala statická.
 */
export function CategoryMenu({ menu }: { menu: MenuLine[] }) {
  return (
    <ul className="flex items-center gap-1" aria-label="Řady produktů">
      {menu.map((line) => (
        <li key={line.slug} className="group relative">
          <Link href={line.href} className="label inline-flex min-h-11 items-center gap-1 whitespace-nowrap px-3 text-green hover:text-brick-text" aria-haspopup={line.meats.length > 0 ? "true" : undefined}>
            {line.name}
            {line.meats.length > 0 && <ChevronDown strokeWidth={1.75} className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:rotate-180" />}
          </Link>
          {line.meats.length > 0 && (
            <div className="invisible absolute left-0 top-full z-30 w-[560px] pt-1 opacity-0 transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              <div className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <p className="text-sm text-muted">{line.tagline}</p>
                  <Link href={line.href} className="label whitespace-nowrap text-[11px] text-green hover:underline">
                    Vše z řady
                  </Link>
                </div>
                <ul className="grid grid-cols-3 gap-2">
                  {line.meats.map((m) => (
                    <li key={m.key}>
                      <Link href={`${line.href}/${m.key}`} className="flex items-center gap-3 rounded-[var(--radius-control)] border border-transparent p-1.5 hover:border-line hover:bg-cream">
                        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[var(--radius-control)] bg-cream">
                          {m.image ? (
                            <Image src={m.image} alt="" fill sizes="48px" className={m.illustration ? "object-contain p-1" : "object-cover"} />
                          ) : (
                            <Bone strokeWidth={1.5} className="absolute inset-0 m-auto h-5 w-5 text-line" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm capitalize text-ink">{m.label}</span>
                          <span className="block text-xs text-muted">
                            {m.count} {m.count === 1 ? "produkt" : m.count < 5 ? "produkty" : "produktů"}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
