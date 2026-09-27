import Link from "next/link";
import { adjustStock } from "@/app/admin/(app)/sklad/actions";
import { Table, Td } from "@/components/admin/table";
import { Button } from "@/components/ui/button";
import { formatDate, formatQty, STOCK_KIND_LABEL, type StockMovementRow } from "@/lib/admin";
import type { ProductUnit } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

/** Historie pohybů skladu u produktu a formuláře odpisu a inventury. */
export function StockMovements({ productId, unit, stockQty, movements, manager }: { productId: string; unit: ProductUnit; stockQty: number | null; movements: StockMovementRow[]; manager: boolean }) {
  return (
    <fieldset className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
      <legend className="label px-1 text-[11px] text-muted">Sklad · pohyby</legend>
      <p className="text-sm">
        Aktuálně skladem <strong>{stockQty === null ? "neevidováno" : formatQty(stockQty, unit)}</strong>.{" "}
        <Link href="/admin/sklad" className="text-green underline">
          Příjemka
        </Link>
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <form action={adjustStock} className="flex flex-wrap items-end gap-2 rounded-[var(--radius-control)] bg-cream p-3">
          <input type="hidden" name="product_id" value={productId} />
          <input type="hidden" name="kind" value="odpis" />
          <label className="block">
            <span className="label mb-1 block text-[11px] text-muted">Odpis (kolik ubylo)</span>
            <input name="qty" type="number" min={0} step={unit === "kg" ? "0.001" : "1"} required className="w-28 min-h-9 py-1" />
          </label>
          <label className="block flex-1">
            <span className="label mb-1 block text-[11px] text-muted">Důvod</span>
            <input name="note" placeholder="prošlé, poškozené…" className="min-h-9 py-1" />
          </label>
          <Button type="submit" variant="secondary" className="min-h-9">
            Odepsat
          </Button>
        </form>
        <form action={adjustStock} className="flex flex-wrap items-end gap-2 rounded-[var(--radius-control)] bg-cream p-3">
          <input type="hidden" name="product_id" value={productId} />
          <input type="hidden" name="kind" value="inventura" />
          <label className="block">
            <span className="label mb-1 block text-[11px] text-muted">Inventura (skutečný stav)</span>
            <input name="qty" type="number" min={0} step={unit === "kg" ? "0.001" : "1"} required className="w-28 min-h-9 py-1" />
          </label>
          <label className="block flex-1">
            <span className="label mb-1 block text-[11px] text-muted">Poznámka</span>
            <input name="note" className="min-h-9 py-1" />
          </label>
          <Button type="submit" variant="secondary" className="min-h-9">
            Zapsat
          </Button>
        </form>
      </div>
      {movements.length > 0 && (
        <div className="mt-3">
          <Table head={manager ? ["Kdy", "Pohyb", "Množství", "Nákup / j.", "Poznámka"] : ["Kdy", "Pohyb", "Množství", "Poznámka"]}>
            {movements.map((m) => (
              <tr key={m.id}>
                <Td className="whitespace-nowrap text-muted">{formatDate(m.created_at)}</Td>
                <Td>{STOCK_KIND_LABEL[m.kind]}</Td>
                <Td className={Number(m.qty) < 0 ? "text-brick-text" : "text-green"}>
                  {Number(m.qty) > 0 ? "+" : ""}
                  {formatQty(m.qty, unit)}
                </Td>
                {manager && <Td className="text-muted">{m.unit_cost_czk != null ? formatPrice(Number(m.unit_cost_czk)) : ""}</Td>}
                <Td className="text-muted">
                  {m.order_id ? (
                    <Link href={`/admin/objednavky/${m.order_id}`} className="text-green hover:underline">
                      {m.note}
                    </Link>
                  ) : (
                    m.note
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        </div>
      )}
    </fieldset>
  );
}
