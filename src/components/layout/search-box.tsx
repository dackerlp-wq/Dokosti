"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { LINE_INFO, productName, type Product } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Vyhledávání s našeptávačem. Hledá v názvu, řadě a výrobci, bez ohledu na diakritiku. */
export function SearchBox({ products, className = "", autoFocus }: { products: Product[]; className?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();

  const terms = fold(q).split(/\s+/).filter(Boolean);
  const hits = terms.length
    ? products
        .filter((p) => {
          const hay = fold([productName(p), LINE_INFO[p.line].name, p.producer].join(" "));
          return terms.every((t) => hay.includes(t));
        })
        .slice(0, 6)
    : [];

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function go(path: string) {
    setOpen(false);
    setQ("");
    router.push(path);
  }

  return (
    <div ref={box} className={`relative ${className}`}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (active >= 0 && hits[active]) go(`/produkt/${hits[active].slug}`);
          else if (q.trim()) go(`/hledat?q=${encodeURIComponent(q.trim())}`);
        }}
      >
        <input
          type="search"
          name="q"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!hits.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => (a + 1) % hits.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => (a <= 0 ? hits.length - 1 : a - 1));
            } else if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Hledat, např. hovězí"
          aria-label="Hledat v nabídce"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open && hits.length > 0}
          autoComplete="off"
          autoFocus={autoFocus}
          className="min-h-10 pr-10 text-sm"
        />
        <button type="submit" aria-label="Hledat" className="absolute right-1 top-1/2 -translate-y-1/2 rounded-[var(--radius-control)] p-1.5 text-green hover:bg-cream">
          <Search strokeWidth={1.75} className="h-4 w-4" />
        </button>
      </form>

      {open && terms.length > 0 && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper text-sm">
          {hits.map((p, i) => (
            <li key={p.slug} role="option" aria-selected={i === active}>
              <Link
                href={`/produkt/${p.slug}`}
                onClick={() => go(`/produkt/${p.slug}`)}
                onMouseEnter={() => setActive(i)}
                className={`flex items-center justify-between gap-3 px-3 py-2 ${i === active ? "bg-cream" : ""}`}
              >
                <span>
                  <span className="font-semibold">{productName(p)}</span>
                  <span className="block text-xs text-muted">{LINE_INFO[p.line].name}{p.producer && !p.producer.startsWith("[") ? ` · ${p.producer}` : ""}</span>
                </span>
                <span className="shrink-0 text-muted">{formatPrice(p.priceCzk)}</span>
              </Link>
            </li>
          ))}
          <li className="border-t border-line">
            <Link href={`/hledat?q=${encodeURIComponent(q.trim())}`} onClick={() => go(`/hledat?q=${encodeURIComponent(q.trim())}`)} className="block px-3 py-2 text-green hover:bg-cream">
              {hits.length === 0 ? `Nic pro „${q}“. Zkusit celé hledání` : `Všechny výsledky pro „${q}“`}
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
