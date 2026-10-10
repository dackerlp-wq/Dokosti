"use client";

import { useEffect, useMemo, useState } from "react";
import { applyInventory } from "@/app/admin/(app)/sklad/actions";
import { Button } from "@/components/ui/button";
import type { LineSlug, ProductUnit } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

export type InventoryProduct = { id: string; name: string; line: LineSlug; lineName: string; unit: ProductUnit; stock: number; price_czk: number; ean: string | null };
const DRAFT_KEY = "dokosti-inventura";

/**
 * Inventura: projít produkty po řadách, zapsat skutečný stav (nebo načíst čtečkou), vidět rozdíly v Kč
 * a potvrdit jedním krokem. Rozpracovaná inventura se drží v prohlížeči, dokud ji nepotvrdíte.
 */
export function InventoryWizard({ products }: { products: InventoryProduct[] }) {
  const lines = useMemo(() => [...new Map(products.map((p) => [p.line, p.lineName])).entries()], [products]);
  const [lineIdx, setLineIdx] = useState(0);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [scan, setScan] = useState("");
  const [review, setReview] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}") as Record<string, string>;
        if (Object.keys(saved).length) setCounts(saved);
      } catch {
        /* bez localStorage */
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);
  const save = (next: Record<string, string>) => {
    setCounts(next);
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };
  const setCount = (id: string, v: string) => save({ ...counts, [id]: v });
  const counted = (p: InventoryProduct) => (counts[p.id] === undefined || counts[p.id] === "" ? null : Number(String(counts[p.id]).replace(",", ".")));
  const done = products.filter((p) => counted(p) !== null).length;
  const diffs = products.map((p) => ({ p, c: counted(p) })).filter((x): x is { p: InventoryProduct; c: number } => x.c !== null && x.c !== x.p.stock);
  const diffValue = diffs.reduce((s, { p, c }) => s + (c - p.stock) * p.price_czk, 0);
  const current = lines[lineIdx];
  const visible = current ? products.filter((p) => p.line === current[0]) : [];

  function onScan() {
    const code = scan.trim();
    const p = products.find((x) => x.ean && x.ean === code);
    if (p) {
      const prev = counted(p) ?? 0;
      setCount(p.id, String(prev + 1));
      setLineIdx(Math.max(0, lines.findIndex((l) => l[0] === p.line)));
    }
    setScan("");
  }

  if (review) {
    return (
      <form action={applyInventory} className="rounded-[var(--radius-card)] border border-line bg-paper p-5">
        <input type="hidden" name="items" value={JSON.stringify(products.filter((p) => counted(p) !== null).map((p) => ({ product_id: p.id, qty: counted(p) })))} />
        <h2 className="text-[20px]">Rozdíly před zapsáním</h2>
        <p className="mt-1 text-sm text-muted">
          Spočítáno {done} z {products.length} produktů. Nespočítané se nemění. Rozdíly se zapíšou jako pohyb „inventura“ se jménem.
        </p>
        {diffs.length === 0 ? (
          <p className="mt-4 text-sm text-green">Všechno sedí, žádný rozdíl.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-[var(--radius-card)] border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="label border-b border-line text-left text-[10px] text-muted">
                  <th className="px-3 py-2 font-semibold">Produkt</th>
                  <th className="px-3 py-2 font-semibold">V systému</th>
                  <th className="px-3 py-2 font-semibold">Spočítáno</th>
                  <th className="px-3 py-2 font-semibold">Rozdíl</th>
                  <th className="px-3 py-2 text-right font-semibold">Kč</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {diffs.map(({ p, c }) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2 font-semibold">{p.name}</td>
                    <td className="px-3 py-2">{p.stock} {p.unit}</td>
                    <td className="px-3 py-2">{c} {p.unit}</td>
                    <td className={`px-3 py-2 ${c < p.stock ? "text-brick-text" : "text-green"}`}>
                      {c > p.stock ? "+" : ""}
                      {Math.round((c - p.stock) * 1000) / 1000} {p.unit}
                    </td>
                    <td className={`px-3 py-2 text-right ${c < p.stock ? "text-brick-text" : "text-green"}`}>{formatPrice(Math.round((c - p.stock) * p.price_czk))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line bg-cream font-semibold">
                  <td className="px-3 py-2" colSpan={4}>
                    Celkem {diffs.length} rozdílů
                  </td>
                  <td className={`px-3 py-2 text-right ${diffValue < 0 ? "text-brick-text" : ""}`}>{formatPrice(Math.round(diffValue))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <label className="mt-4 block max-w-md">
          <span className="label mb-1 block text-[11px] text-muted">Poznámka k inventuře</span>
          <input name="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="např. měsíční inventura mrazáků" />
        </label>
        <div className="mt-4 flex justify-between">
          <Button type="button" variant="secondary" onClick={() => setReview(false)}>
            Zpět k počítání
          </Button>
          <Button type="submit" variant="action" onClick={() => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } }}>
            Zapsat inventuru
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-paper p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {lines.map(([slug, name], i) => {
            const n = products.filter((p) => p.line === slug).length;
            const d = products.filter((p) => p.line === slug && counted(p) !== null).length;
            return (
              <button key={slug} type="button" onClick={() => setLineIdx(i)} className={`label inline-flex min-h-8 items-center rounded-full border px-3 text-[11px] ${i === lineIdx ? "border-green bg-green text-cream" : "border-line bg-paper text-green hover:border-green"}`}>
                {name} · {d}/{n}
              </button>
            );
          })}
        </div>
        <span className="text-sm text-muted">
          Spočítáno {done} z {products.length}
        </span>
      </div>
      <input value={scan} onChange={(e) => setScan(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onScan(); } }} placeholder="Čtečka: každé načtení EAN přičte 1 ks" aria-label="Čtečka" className="mt-3 min-h-10" />
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="label border-b border-line text-left text-[10px] text-muted">
              <th className="py-2 pr-2 font-semibold">Produkt</th>
              <th className="py-2 pr-2 font-semibold">V systému</th>
              <th className="py-2 pr-2 font-semibold">Spočítáno</th>
              <th className="py-2 pr-2 font-semibold">Rozdíl</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visible.map((p) => {
              const c = counted(p);
              const diff = c === null ? null : Math.round((c - p.stock) * 1000) / 1000;
              return (
                <tr key={p.id}>
                  <td className="py-2 pr-2 font-semibold">{p.name}</td>
                  <td className="py-2 pr-2 whitespace-nowrap text-muted">{p.stock} {p.unit}</td>
                  <td className="py-2 pr-2">
                    <span className="flex items-center gap-1">
                      <input type="number" min={0} step={p.unit === "kg" ? "0.001" : "1"} inputMode="decimal" value={counts[p.id] ?? ""} onChange={(e) => setCount(p.id, e.target.value)} placeholder={String(p.stock)} aria-label={`Spočítáno ${p.name}`} className="w-28 min-h-9 py-1" />
                      <button type="button" onClick={() => setCount(p.id, String(p.stock))} className="text-xs text-muted hover:text-green" title="Sedí se systémem">
                        sedí
                      </button>
                    </span>
                  </td>
                  <td className={`py-2 pr-2 whitespace-nowrap ${diff === null ? "text-muted" : diff === 0 ? "text-green" : "text-brick-text"}`}>{diff === null ? "—" : diff === 0 ? "0" : `${diff > 0 ? "+" : ""}${diff} ${p.unit}`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button type="button" variant="secondary" disabled={lineIdx === 0} onClick={() => setLineIdx(lineIdx - 1)}>
            Předchozí řada
          </Button>
          <Button type="button" variant="secondary" disabled={lineIdx >= lines.length - 1} onClick={() => setLineIdx(lineIdx + 1)}>
            Další řada
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => save({})} className="text-xs text-muted hover:underline">
            Začít znovu
          </button>
          <Button type="button" onClick={() => setReview(true)} disabled={done === 0}>
            Zkontrolovat rozdíly ({diffs.length})
          </Button>
        </div>
      </div>
    </div>
  );
}
