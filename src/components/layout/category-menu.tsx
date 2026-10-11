import { Bone, ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { MenuLine } from "@/lib/menu";

/**
 * Navigace řad s mega menu: po najetí se ukáží druhy masa v řadě s miniaturou a počtem.
 * Jen CSS (hover a focus-within), bez JavaScriptu, aby hlavička zůstala statická.
 */
export function CategoryMenu({ menu }: { menu: MenuLine[] }) {
  const item = "inline-flex min-h-10 items-center gap-1 whitespace-nowrap p-2.5 text-nav text-green transition-colors duration-300 hover:text-brick-text";
  return (
    <ul className="relative flex items-center">
      {menu.map((line) => (
        <li key={line.slug} className="group">
          <Link href={line.href} className={item} aria-haspopup={line.meats.length > 0 ? "true" : undefined}>
            {line.name}
            {line.meats.length > 0 && <ChevronDown strokeWidth={1.75} className="size-3.5 transition-transform duration-300 group-hover:rotate-180" aria-hidden />}
          </Link>
          {line.meats.length > 0 && (
            <div className="invisible absolute top-full left-0 z-40 w-full min-w-[640px] pt-2.5 opacity-0 transition-opacity duration-300 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              <div className="rounded-panel border border-line bg-white p-2.5 shadow-menu">
                <ul className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                  {line.meats.map((m) => (
                    <li key={m.key}>
                      <Link href={`${line.href}/${m.key}`} className="flex items-center gap-4 rounded-panel p-2.5 transition-colors duration-300 hover:bg-paper">
                        <span className="relative size-10 shrink-0 overflow-hidden rounded-panel bg-cream">
                          {m.image ? (
                            <Image src={m.image} alt="" fill sizes="40px" className={m.illustration ? "object-contain p-1" : "object-cover"} />
                          ) : (
                            <Bone strokeWidth={1.5} className="absolute inset-0 m-auto size-5 text-line" aria-hidden />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-nav text-green capitalize">{m.label}</span>
                          <span className="block text-small text-muted">
                            {m.count} {m.count === 1 ? "produkt" : m.count < 5 ? "produkty" : "produktů"}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link href={line.href} className="flex h-full items-center gap-4 rounded-panel p-2.5 text-nav text-brick-text transition-colors duration-300 hover:bg-paper">
                      Vše z řady {line.name}
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </li>
      ))}
      <li>
        <Link href="/krmeni-na-miru" className={item}>
          Krmení na míru
        </Link>
      </li>
    </ul>
  );
}
