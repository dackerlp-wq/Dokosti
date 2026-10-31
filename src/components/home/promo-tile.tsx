"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/format";

export type DailyCost = { perDay: number; dogKg: number; dailyGrams: number };
export type SaleItem = { href: string; name: string; image: string | null; price: number; original: number };

/** Interval střídání snímků v ms. */
const ROTATE_MS = 6000;

/**
 * Dlaždice v úvodu: „Cena za den“ (nejlevnější BARF mix × orientační dávka psa 15 kg).
 * Když v administraci běží akce, střídá se s akčními produkty. Střídání se zastaví při najetí myší,
 * při fokusu a při `prefers-reduced-motion`; přepnout jde i tečkami.
 */
export function PromoTile({ daily, sales }: { daily: DailyCost | null; sales: SaleItem[] }) {
  const slides = (daily ? 1 : 0) + sales.length;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (slides < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setI((v) => (v + 1) % slides), ROTATE_MS);
    return () => window.clearInterval(t);
  }, [slides, paused]);

  if (slides === 0) return null;
  const index = i % slides;
  const sale = daily ? (index === 0 ? null : sales[index - 1]) : sales[index];

  return (
    <div
      className="relative h-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {sale ? (
        <Link href={sale.href} className="group relative flex h-full overflow-hidden rounded-panel border border-line bg-white">
          {/* Fotky produktů mají bílé pozadí, proto bílá plocha. */}
          {sale.image && (
            <span className="relative w-1/2 shrink-0">
              <Image src={sale.image} alt="" fill sizes="(min-width: 62rem) 150px, 25vw" className="object-contain p-3" />
            </span>
          )}
          <span className={`flex min-w-0 flex-1 flex-col justify-center gap-1 py-4 pr-4 ${sale.image ? "" : "pl-5"}`}>
            <span className="self-start rounded-full bg-brick px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-white uppercase">Akce</span>
            <span className="line-clamp-2 text-small leading-snug font-bold text-ink group-hover:text-brick-text md:text-[0.9375rem]">{sale.name}</span>
            <span className="text-small text-muted line-through">{formatPrice(sale.original)}</span>
            <span className="font-display text-[1.5rem] leading-none font-black text-brick-text">{formatPrice(sale.price)}</span>
          </span>
        </Link>
      ) : daily ? (
        <Link href="/rada/barf" className="group flex h-full flex-col justify-center rounded-panel bg-sand p-4 md:p-5">
          <span className="text-[0.75rem] font-semibold text-muted md:text-small">BARF pro psa {daily.dogKg} kg</span>
          <span className="font-display text-[1.625rem] leading-tight font-black whitespace-nowrap text-ink md:text-[2.5rem]">
            od {formatPrice(daily.perDay)}
            <span className="text-[0.875rem] font-bold text-muted md:text-[1.125rem]"> / den</span>
          </span>
          <span className="mt-1 text-[0.75rem] text-brick-text group-hover:underline md:text-small">Vybrat BARF mix →</span>
        </Link>
      ) : null}

      {slides > 1 && (
        <div className="absolute top-3 right-3 flex gap-1.5 md:top-auto md:bottom-3">
          {Array.from({ length: slides }, (_, n) => (
            <button
              key={n}
              type="button"
              onClick={() => setI(n)}
              aria-label={`Zobrazit ${n + 1}. z ${slides}`}
              aria-current={n === index}
              className={`size-2.5 rounded-full transition-colors duration-300 ${n === index ? "bg-green" : "bg-green/25 hover:bg-green/50"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
