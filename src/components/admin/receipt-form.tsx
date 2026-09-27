"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { postReceipt, type ReceiptLine, type ReceiptState } from "@/app/admin/(app)/sklad/actions";
import { Button } from "@/components/ui/button";
import type { ProductUnit } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

export type ReceiptProduct = { id: string; name: string; unit: ProductUnit; storage: string; purchase_price_czk: number | null };

type Line = ReceiptLine & { key: string };
const newLine = (): Line => ({ key: Math.random().toString(36).slice(2, 8), product_id: "", qty: 1, unit_cost_czk: 0, batch_no: "", expires_on: "" });

/** Příjemka od dodavatele: hlavička a řádky (produkt, množství, nákupní cena, šarže, expirace). */
export function ReceiptForm({ products, manager }: { products: ReceiptProduct[]; manager: boolean }) {
  const [state, action, pending] = useActionState<ReceiptState, FormData>(postReceipt, null);
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const set = (key: string, p: Partial<Line>) => setLines(lines.map((l) => (l.key === key ? { ...l, ...p } : l)));
  const total = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unit_cost_czk) || 0), 0);
  const byId = (id: string) => products.find((p) => p.id === id);

  if (state?.ok) {
    return (
      <div className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
        <p className="label text-[11px] text-green">Zaúčtováno</p>
        <p className="mt-1">Příjemka {state.number} je na skladě, stavy a šarže jsou aktualizované.</p>
        <Button type="button" variant="secondary" className="mt-3" onClick={() => window.location.reload()}>
          Další příjemka
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
      <input type="hidden" name="lines" value={JSON.stringify(lines.map((l) => ({ product_id: l.product_id, qty: l.qty, unit_cost_czk: l.unit_cost_czk, batch_no: l.batch_no, expires_on: l.expires_on })))} />
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="label mb-1 block text-[11px] text-muted">Dodavatel</span>
          <input name="supplier" placeholder="např. Yoggies" />
        </label>
        <label className="block">
          <span className="label mb-1 block text-[11px] text-muted">Číslo dodacího listu / faktury</span>
          <input name="doc_no" />
        </label>
        <label className="block">
          <span className="label mb-1 block text-[11px] text-muted">Poznámka</span>
          <input name="note" />
        </label>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="label border-b border-line text-left text-[10px] text-muted">
              <th className="py-2 pr-2 font-semibold">Produkt</th>
              <th className="py-2 pr-2 font-semibold">Množství</th>
              {manager && <th className="py-2 pr-2 font-semibold">Nákupní cena / j.</th>}
              <th className="py-2 pr-2 font-semibold">Šarže</th>
              <th className="py-2 pr-2 font-semibold">Expirace</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {lines.map((l) => {
              const p = byId(l.product_id);
              return (
                <tr key={l.key}>
                  <td className="py-2 pr-2">
                    <select
                      value={l.product_id}
                      onChange={(e) => {
                        const np = byId(e.target.value);
                        set(l.key, { product_id: e.target.value, unit_cost_czk: np?.purchase_price_czk ?? l.unit_cost_czk });
                      }}
                      aria-label="Produkt"
                      className="min-h-9 min-w-[220px] py-1"
                    >
                      <option value="">vyberte…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    <span className="flex items-center gap-1">
                      <input type="number" min={0} step={p?.unit === "kg" ? "0.001" : "1"} value={l.qty} onChange={(e) => set(l.key, { qty: Number(e.target.value) })} aria-label="Množství" className="w-24 min-h-9 py-1" />
                      <span className="text-muted">{p?.unit ?? "ks"}</span>
                    </span>
                  </td>
                  {manager && (
                    <td className="py-2 pr-2">
                      <input type="number" min={0} step="0.01" value={l.unit_cost_czk} onChange={(e) => set(l.key, { unit_cost_czk: Number(e.target.value) })} aria-label="Nákupní cena" className="w-28 min-h-9 py-1" />
                    </td>
                  )}
                  <td className="py-2 pr-2">
                    <input value={l.batch_no} onChange={(e) => set(l.key, { batch_no: e.target.value })} aria-label="Šarže" className="w-28 min-h-9 py-1" />
                  </td>
                  <td className="py-2 pr-2">
                    <input type="date" value={l.expires_on} onChange={(e) => set(l.key, { expires_on: e.target.value })} aria-label="Expirace" className="min-h-9 py-1" disabled={p ? p.storage === "suche" : false} />
                  </td>
                  <td className="py-2 text-right">
                    <button type="button" onClick={() => setLines(lines.length > 1 ? lines.filter((x) => x.key !== l.key) : [newLine()])} aria-label="Odebrat řádek" className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-muted hover:bg-cream hover:text-brick-text">
                      <Trash2 strokeWidth={1.75} className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => setLines([...lines, newLine()])} className="inline-flex items-center gap-1 text-sm text-green hover:underline">
          <Plus strokeWidth={1.75} className="h-4 w-4" /> Přidat řádek
        </button>
        {manager && <span className="text-sm text-muted">Celkem nákup {formatPrice(Math.round(total))}</span>}
      </div>
      {state?.error && (
        <p role="alert" className="mt-3 text-sm text-brick-text">
          {state.error}
        </p>
      )}
      <div className="mt-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Účtuji…" : "Zaúčtovat příjemku"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted">Příjem zvýší stav skladu, u mraženého a chlazeného zboží založí šarži s expirací a uloží nákupní cenu pro marži.</p>
    </form>
  );
}
