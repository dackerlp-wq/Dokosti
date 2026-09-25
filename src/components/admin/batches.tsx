import { Table, Td } from "@/components/admin/table";
import { Button } from "@/components/ui/button";
import { addBatch, updateBatchQty } from "@/app/admin/(app)/produkty/[id]/sarze/actions";
import { formatDay } from "@/lib/admin";

export type BatchRow = { id: string; batch_no: string; expires_on: string; qty: number; note: string };

/** Šarže a expirace u produktu. Vede se vedle celkového skladu, hlídá blížící se datum. */
export function Batches({ productId, batches }: { productId: string; batches: BatchRow[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date();
  soon.setDate(soon.getDate() + 14);
  const soonIso = soon.toISOString().slice(0, 10);

  return (
    <fieldset className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
      <legend className="label px-1 text-[11px] text-muted">Šarže a expirace</legend>
      {batches.length > 0 && (
        <div className="mb-3">
          <Table head={["Šarže", "Expirace", "Kusů", "Poznámka", ""]}>
            {batches.map((b) => {
              const state = b.expires_on < today ? "text-brick-text font-semibold" : b.expires_on <= soonIso ? "text-brick-text" : "";
              return (
                <tr key={b.id}>
                  <Td>{b.batch_no || "—"}</Td>
                  <Td className={state}>
                    {formatDay(b.expires_on)}
                    {b.expires_on < today ? " · prošlé" : b.expires_on <= soonIso ? " · brzy" : ""}
                  </Td>
                  <Td>
                    <form action={updateBatchQty} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={b.id} />
                      <input type="hidden" name="product_id" value={productId} />
                      <input name="qty" type="number" min={0} defaultValue={b.qty} className="w-20 min-h-8 text-sm" aria-label="Kusů" />
                      <button type="submit" className="label text-[10px] text-green hover:underline">
                        Uložit
                      </button>
                    </form>
                  </Td>
                  <Td className="text-muted">{b.note}</Td>
                  <Td>
                    <form action={updateBatchQty}>
                      <input type="hidden" name="id" value={b.id} />
                      <input type="hidden" name="product_id" value={productId} />
                      <input type="hidden" name="delete" value="1" />
                      <button type="submit" className="label text-[10px] text-brick-text hover:underline">
                        Smazat
                      </button>
                    </form>
                  </Td>
                </tr>
              );
            })}
          </Table>
        </div>
      )}
      <form action={addBatch} className="grid gap-2 sm:grid-cols-[1fr_1fr_80px_1fr_auto]">
        <input type="hidden" name="product_id" value={productId} />
        <input name="batch_no" placeholder="Číslo šarže" aria-label="Číslo šarže" className="min-h-9 text-sm" />
        <input name="expires_on" type="date" required aria-label="Expirace" className="min-h-9 text-sm" />
        <input name="qty" type="number" min={0} placeholder="ks" required aria-label="Kusů" className="min-h-9 text-sm" />
        <input name="note" placeholder="Poznámka (závoz, dodavatel)" aria-label="Poznámka" className="min-h-9 text-sm" />
        <Button type="submit" variant="secondary" className="min-h-9">
          Přidat
        </Button>
      </form>
      <p className="mt-2 text-xs text-muted">Šarže s expirací do 14 dnů svítí na Přehledu. Celkový sklad nahoře se šaržemi nepočítá, upravte ho zvlášť.</p>
    </fieldset>
  );
}
