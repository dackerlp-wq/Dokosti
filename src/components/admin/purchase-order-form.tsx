"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { createPurchaseOrder } from "@/app/admin/(app)/nakup/actions";
import { Button } from "@/components/ui/button";
import type { ProductUnit } from "@/lib/catalog";
import { addDays } from "@/lib/delivery";
import { formatPrice } from "@/lib/format";

export type PurchaseProduct = { id: string; name: string; unit: ProductUnit; supplier_id: string | null; purchase_price_czk: number | null; stock: number | null; suggested: number; status: string; pack_size: number | null };
export type SupplierOption = { id: string; name: string; email: string; lead_days: number; min_order_czk: number };

type Line = { key: string; product_id: string; qty: number; unit_cost_czk: number };
let seq = 0;
const key = () => `l${++seq}`;

/**
 * Objednávka u dodavatele: výběr dodavatele předvyplní jeho produkty, u kterých Sklad doporučuje doobjednat
 * (docházející, vyprodané), s navrženým množstvím. Cokoli jde přidat nebo upravit.
 */
export function PurchaseOrderForm({ products, suppliers, initialSupplier, manager, reorderDays, today }: { products: PurchaseProduct[]; suppliers: SupplierOption[]; initialSupplier: string; manager: boolean; reorderDays: number; today: string }) {
  const [supplierId, setSupplierId] = useState(initialSupplier || suppliers[0]?.id || "");
  const supplier = suppliers.find((s) => s.id === supplierId);
  const mine = useMemo(() => products.filter((p) => p.supplier_id === supplierId), [products, supplierId]);
  const prefill = (sid: string) =>
    products
      .filter((p) => p.supplier_id === sid && p.suggested > 0)
      .map((p) => ({ key: key(), product_id: p.id, qty: p.suggested, unit_cost_czk: p.purchase_price_czk ?? 0 }));
  const [lines, setLines] = useState<Line[]>(() => prefill(supplierId));
  const [pick, setPick] = useState("");
  const byId = (id: string) => products.find((p) => p.id === id);
  const set = (k: string, patch: Partial<Line>) => setLines(lines.map((l) => (l.key === k ? { ...l, ...patch } : l)));
  const total = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unit_cost_czk) || 0), 0);
  const expected = supplier ? addDays(today, supplier.lead_days) : "";

  return (
    <form action={createPurchaseOrder} className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <input type="hidden" name="supplier_id" value={supplierId} />
      <input type="hidden" name="lines" value={JSON.stringify(lines.map(({ product_id, qty, unit_cost_czk }) => ({ product_id, qty, unit_cost_czk })))} />
      <div className="space-y-4">
        <div className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
          <label className="block">
            <span className="label mb-1 block text-[11px] text-muted">Dodavatel</span>
            <select
              value={supplierId}
              onChange={(e) => {
                setSupplierId(e.target.value);
                setLines(prefill(e.target.value));
              }}
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          {supplier && (
            <p className="mt-2 text-xs text-muted">
              Dodací lhůta {supplier.lead_days} dní{supplier.min_order_czk ? `, minimální objednávka ${formatPrice(supplier.min_order_czk)}` : ""}
              {supplier.email ? `, objednávka odejde na ${supplier.email}` : ", dodavatel nemá e-mail: objednávku vytisknete nebo nadiktujete"}.
            </p>
          )}
        </div>

        <div className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[18px]">Položky</h2>
            <span className="text-xs text-muted">Předvyplněno podle Skladu: co dochází, zásoba na {reorderDays} dní plus dodací lhůta, zaokrouhleno na balení.</span>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="label border-b border-line text-left text-[10px] text-muted">
                  <th className="py-2 pr-2 font-semibold">Produkt</th>
                  <th className="py-2 pr-2 font-semibold">Skladem</th>
                  <th className="py-2 pr-2 font-semibold">Objednat</th>
                  {manager && <th className="py-2 pr-2 font-semibold">Nákup / j.</th>}
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {lines.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-muted">
                      Nic nedochází. Přidejte položky ručně.
                    </td>
                  </tr>
                )}
                {lines.map((l) => {
                  const p = byId(l.product_id);
                  return (
                    <tr key={l.key}>
                      <td className="py-2 pr-2">
                        <span className="font-semibold">{p?.name ?? "?"}</span>
                        {p?.pack_size ? <span className="block text-xs text-muted">balení {p.pack_size} {p.unit}</span> : null}
                      </td>
                      <td className="py-2 pr-2 whitespace-nowrap">
                        {p?.stock === null || p?.stock === undefined ? <span className="text-muted">—</span> : `${p.stock} ${p.unit}`}
                        {p?.status === "out" && <span className="ml-1 text-xs text-brick-text">vyprodáno</span>}
                        {p?.status === "low" && <span className="ml-1 text-xs text-brick-text">dochází</span>}
                      </td>
                      <td className="py-2 pr-2">
                        <span className="flex items-center gap-1">
                          <input type="number" min={0} step={p?.unit === "kg" ? "0.5" : p?.pack_size ?? 1} value={l.qty} onChange={(e) => set(l.key, { qty: Number(e.target.value) })} aria-label="Množství" className="w-24 min-h-9 py-1" />
                          <span className="text-muted">{p?.unit ?? "ks"}</span>
                        </span>
                      </td>
                      {manager && (
                        <td className="py-2 pr-2">
                          <input type="number" min={0} step="0.01" value={l.unit_cost_czk} onChange={(e) => set(l.key, { unit_cost_czk: Number(e.target.value) })} aria-label="Nákupní cena" className="w-24 min-h-9 py-1" />
                        </td>
                      )}
                      <td className="py-2 text-right">
                        <button type="button" onClick={() => setLines(lines.filter((x) => x.key !== l.key))} aria-label="Odebrat" className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-muted hover:bg-cream hover:text-brick-text">
                          <Trash2 strokeWidth={1.75} className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Přidat produkt" className="min-h-9 w-auto min-w-[240px] py-1">
              <option value="">Přidat produkt…</option>
              {(mine.length ? mine : products).filter((p) => !lines.some((l) => l.product_id === p.id)).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.supplier_id !== supplierId ? " (jiný dodavatel)" : ""}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="secondary"
              className="min-h-9"
              onClick={() => {
                const p = byId(pick);
                if (!p) return;
                setLines([...lines, { key: key(), product_id: p.id, qty: p.pack_size ?? (p.unit === "kg" ? 5 : 10), unit_cost_czk: p.purchase_price_czk ?? 0 }]);
                setPick("");
              }}
              disabled={!pick}
            >
              <Plus strokeWidth={1.75} className="h-4 w-4" /> Přidat
            </Button>
            {mine.length === 0 && <span className="text-xs text-muted">Dodavatel nemá přiřazené produkty, nabízí se všechny. Přiřaďte je v detailu dodavatele.</span>}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
          <h2 className="text-[18px]">Souhrn</h2>
          <p className="mt-2 text-sm">
            {lines.length} položek{manager ? ` · nákup ${formatPrice(Math.round(total))}` : ""}
          </p>
          {manager && supplier && supplier.min_order_czk > 0 && total < supplier.min_order_czk && <p className="mt-1 text-xs text-brick-text">Pod minimální objednávkou dodavatele ({formatPrice(supplier.min_order_czk)}).</p>}
          <label className="mt-3 block">
            <span className="label mb-1 block text-[11px] text-muted">Požadované dodání</span>
            <input name="expected_on" type="date" defaultValue={expected} />
          </label>
          <label className="mt-3 block">
            <span className="label mb-1 block text-[11px] text-muted">Poznámka pro dodavatele</span>
            <textarea name="note" rows={3} placeholder="např. doručit dopoledne, zavolat předem" />
          </label>
          <Button type="submit" className="mt-4 w-full" disabled={lines.length === 0}>
            Uložit návrh objednávky
          </Button>
          <p className="mt-2 text-xs text-muted">Návrh ještě nikam neodejde. Odeslání dodavateli potvrdíte v dalším kroku.</p>
        </div>
      </div>
    </form>
  );
}
