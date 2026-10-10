"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type SearchHit = { group: string; title: string; detail: string; href: string };

/** Globální hledání (Ctrl+K nebo klik): objednávky, zákazníci, produkty, účtenky, příjemky, úkoly. */
export function SearchPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open || q.trim().length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/admin/api/hledat?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal });
        setHits(res.ok ? ((await res.json()) as SearchHit[]) : []);
        setActive(0);
      } catch {
        /* zrušeno */
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, open]);

  const shown = q.trim().length < 2 ? [] : hits;
  const go = (h: SearchHit) => {
    setOpen(false);
    setQ("");
    router.push(h.href);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-2 rounded-[var(--radius-control)] border border-line bg-cream px-3 py-2 text-left text-sm text-muted hover:border-green">
        <Search strokeWidth={1.75} className="h-4 w-4" />
        Hledat
        <kbd className="ml-auto hidden rounded border border-line px-1 text-[10px] md:inline">Ctrl K</kbd>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/45 p-4 pt-[12vh]" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Hledání" className="w-full max-w-xl overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper">
            <input
              ref={input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(shown.length - 1, a + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(0, a - 1));
                } else if (e.key === "Enter" && shown[active]) {
                  e.preventDefault();
                  go(shown[active]);
                }
              }}
              placeholder="Číslo objednávky, jméno, telefon, produkt, EAN, účtenka, příjemka…"
              aria-label="Hledat"
              className="min-h-12 rounded-none border-0 border-b border-line bg-paper text-base"
            />
            <ul className="max-h-[60vh] overflow-y-auto">
              {shown.map((h, i) => (
                <li key={h.href + h.title}>
                  <button type="button" onMouseEnter={() => setActive(i)} onClick={() => go(h)} className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${i === active ? "bg-cream" : ""}`}>
                    <span className="label w-20 shrink-0 text-[10px] text-muted">{h.group}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{h.title}</span>
                      <span className="block truncate text-xs text-muted">{h.detail}</span>
                    </span>
                  </button>
                </li>
              ))}
              {!loading && q.trim().length >= 2 && shown.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">Nic nenalezeno.</li>}
              {q.trim().length < 2 && <li className="px-4 py-6 text-center text-sm text-muted">Napište aspoň dva znaky. Šipkami vyberete, Enter otevře.</li>}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
