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
    <fieldset className="rounded-card border border-line bg-white p-4">
      <legend className="px-1 text-label text-green">Sklad · pohyby</legend>
      <p className="text-sm">
        Aktuálně skladem <strong>{stockQty === null ? "neevidováno" : formatQty(stockQty, unit)}</strong>.{" "}
        <Link href={`/admin/sklad/${productId}`} className="text-brick-text underline">
          Sklad a pohyby
        </Link>{" "}
        ·{" "}
        <Link href="/admin/sklad/prijemky" className="text-brick-text underline">
          Příjemka
        </Link>
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <form action={adjustStock} className="flex flex-wrap items-end gap-2 rounded-control bg-paper p-3">
          <input type="hidden" name="product_id" value={productId} />
          <label className="block">
            <span className="mb-1 block text-label text-green">Odpis / interní výdej</span>
            <select name="kind" defaultValue="odpis" className="min-h-9 w-auto py-1">
              <option value="odpis">Odpis</option>
              <option value="interni">Interní výdej</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-label text-green">Kolik ubylo</span>
            <input name="qty" type="number" min={0} step={unit === "kg" ? "0.001" : "1"} required className="w-28 min-h-9 py-1" />
          </label>
          <label className="block flex-1">
            <span className="mb-1 block text-label text-green">Důvod</span>
            <input name="note" placeholder="prošlé, poškozené…" className="min-h-9 py-1" />
          </label>
          <Button type="submit" variant="secondary" className="min-h-9">
            Odepsat
          </Button>
        </form>
        <form action={adjustStock} className="flex flex-wrap items-end gap-2 rounded-control bg-paper p-3">
          <input type="hidden" name="product_id" value={productId} />
          <input type="hidden" name="kind" value="inventura" />
          <label className="block">
            <span className="mb-1 block text-label text-green">Inventura (skutečný stav)</span>
            <input name="qty" type="number" min={0} step={unit === "kg" ? "0.001" : "1"} required className="w-28 min-h-9 py-1" />
          </label>
          <label className="block flex-1">
            <span className="mb-1 block text-label text-green">Poznámka</span>
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
                    <Link href={`/admin/objednavky/${m.order_id}`} className="text-brick-text hover:underline">
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
