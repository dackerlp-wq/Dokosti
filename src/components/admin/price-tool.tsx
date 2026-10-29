"use client";

import { useMemo, useState } from "react";
import { applyPrices } from "@/app/admin/(app)/produkty/ceny/actions";
import { Button } from "@/components/ui/button";
import type { LineSlug } from "@/lib/catalog";
import { formatMarginCzk, marginOf } from "@/lib/admin";
import { formatPrice } from "@/lib/format";

export type PriceProduct = { id: string; name: string; line: LineSlug; lineName: string; price_czk: number; store_price_czk: number | null; purchase_price_czk: number | null; supplier_id: string | null; inAction: boolean };
type Mode = "procent" | "marze" | "castka" | "zeshopu";
type Target = "web" | "kasa";

/** Hromadná změna cen e-shopu nebo prodejny: vybrat produkty (řada, dodavatel), zvolit pravidlo, zkontrolovat náhled, zapsat. */
export function PriceTool({ products, suppliers }: { products: PriceProduct[]; suppliers: { id: string; name: string }[] }) {
  const [line, setLine] = useState("");
  const [supplier, setSupplier] = useState("");
  const [target, setTarget] = useState<Target>("web");
  const [mode, setMode] = useState<Mode>("procent");
  const [value, setValue] = useState("5");
  const [rounding, setRounding] = useState<"1" | "9" | "10">("1");
  const [reason, setReason] = useState("");
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const lines = [...new Map(products.map((p) => [p.line, p.lineName])).entries()];

  const rows = useMemo(() => {
    const v = Number(String(value).replace(",", "."));
    return products
      .filter((p) => (!line || p.line === line) && (!supplier || p.supplier_id === supplier))
      .map((p) => {
        // Výchozí cena: e-shop, nebo prodejna (prázdná cena pro prodejnu = e-shopová).
        const now = target === "kasa" ? (p.store_price_czk ?? p.price_czk) : p.price_czk;
        let next: number | null = null;
        if (mode === "procent" && Number.isFinite(v)) next = now * (1 + v / 100);
        if (mode === "castka" && Number.isFinite(v)) next = now + v;
        if (mode === "zeshopu" && target === "kasa" && Number.isFinite(v)) next = p.price_czk * (1 + v / 100);
        if (mode === "marze" && Number.isFinite(v) && p.purchase_price_czk && v < 100) next = p.purchase_price_czk / (1 - v / 100);
        if (next !== null) {
          if (rounding === "9") next = Math.max(9, Math.round(next / 10) * 10 - 1);
          else if (rounding === "10") next = Math.round(next / 10) * 10;
          else next = Math.round(next);
          next = Math.max(target === "kasa" ? 1 : 0, next);
        }
        const margin = (price: number) => marginOf(price, p.purchase_price_czk);
        return { p, now, next, marginNow: margin(now), marginNext: next === null ? null : margin(next) };
      });
  }, [products, line, supplier, mode, value, rounding, target]);
  const changes = rows.filter((r) => r.next !== null && r.next !== r.now && !excluded.has(r.p.id));

  return (
    <form action={applyPrices} className="space-y-4">
      <input type="hidden" name="items" value={JSON.stringify(changes.map((r) => ({ id: r.p.id, price: r.next })))} />
      <input type="hidden" name="reason" value={reason} />
      <input type="hidden" name="target" value={target} />
      <div className="grid gap-3 rounded-card border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-7">
        <label className="block">
          <span className="mb-1 block text-label text-green">Která cena</span>
          <select
            value={target}
            onChange={(e) => {
              const t = e.target.value as Target;
              setTarget(t);
              if (t === "web" && mode === "zeshopu") setMode("procent");
            }}
            className="min-h-9 py-1"
          >
            <option value="web">e-shop</option>
            <option value="kasa">prodejna</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-label text-green">Řada</span>
          <select value={line} onChange={(e) => setLine(e.target.value)} className="min-h-9 py-1">
            <option value="">všechny</option>
            {lines.map(([slug, name]) => (
              <option key={slug} value={slug}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-label text-green">Dodavatel</span>
          <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className="min-h-9 py-1">
            <option value="">všichni</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-label text-green">Pravidlo</span>
          <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} className="min-h-9 py-1">
            <option value="procent">Změnit o %</option>
            <option value="castka">Změnit o Kč</option>
            <option value="marze">Cílová marže %</option>
            {target === "kasa" && <option value="zeshopu">E-shop + %</option>}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-label text-green">{mode === "marze" ? "Marže (%)" : mode === "castka" ? "Kč (záporné = zlevnit)" : mode === "zeshopu" ? "% nad e-shopem" : "% (záporné = zlevnit)"}</span>
          <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" className="min-h-9 py-1" />
        </label>
        <label className="block">
          <span className="mb-1 block text-label text-green">Zaokrouhlit</span>
          <select value={rounding} onChange={(e) => setRounding(e.target.value as "1" | "9" | "10")} className="min-h-9 py-1">
            <option value="1">na koruny</option>
            <option value="9">na …9 Kč</option>
            <option value="10">na desítky</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-label text-green">Důvod (do deníku)</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="např. zdražení od dodavatele" className="min-h-9 py-1" />
        </label>
      </div>

      <div className="overflow-x-auto rounded-card border border-line bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-eyebrow uppercase text-muted">
              <th className="px-3 py-2 font-semibold">Použít</th>
              <th className="px-3 py-2 font-semibold">Produkt</th>
              <th className="px-3 py-2 font-semibold">Nákup</th>
              <th className="px-3 py-2 font-semibold">Teď</th>
              <th className="px-3 py-2 font-semibold">Nově</th>
              <th className="px-3 py-2 font-semibold">Marže</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ p, now, next, marginNow, marginNext }) => {
              const change = next !== null && next !== now;
              return (
                <tr key={p.id} className={!change ? "text-muted" : ""}>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={change && !excluded.has(p.id)} disabled={!change} onChange={(e) => { const n = new Set(excluded); if (e.target.checked) n.delete(p.id); else n.add(p.id); setExcluded(n); }} className="h-4 w-4 min-h-0 w-auto accent-green" aria-label={`Použít u ${p.name}`} />
                  </td>
                  <td className="px-3 py-2 font-semibold">
                    {p.name}
                    {p.inAction && <span className="ml-2 text-small font-normal text-brick-text">{target === "kasa" ? "v akci: v prodejně platí akční cena, tahle až po akci" : "v akci: změní se cena po akci"}</span>}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{p.purchase_price_czk ? formatPrice(p.purchase_price_czk) : "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatPrice(now)}
                    {target === "kasa" && p.store_price_czk === null && <span className="ml-1 text-small text-muted">(jako e-shop)</span>}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap font-semibold">{next === null ? "—" : formatPrice(next)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {marginNow ? `${formatMarginCzk(marginNow.czk)} (${marginNow.pct} %)` : "—"}
                    {marginNext && marginNow && marginNext.czk !== marginNow.czk && <span className={marginNext.czk < marginNow.czk ? "text-brick-text" : "text-green"}> → {formatMarginCzk(marginNext.czk)} ({marginNext.pct} %)</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted">{changes.length} cen ke změně</span>
        <Button type="submit" variant="action" disabled={changes.length === 0}>
          Zapsat {changes.length} cen {target === "kasa" ? "pro prodejnu" : "na e-shop"}
        </Button>
      </div>
    </form>
  );
}
