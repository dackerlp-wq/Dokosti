import type { Metadata } from "next";
import { ReceiptForm, type ReceiptProduct } from "@/components/admin/receipt-form";
import { Table, Td } from "@/components/admin/table";
import { formatDate, type ProductRow } from "@/lib/admin";
import { productName } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { getAdmin, getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Příjemky" };

type ReceiptRow = { id: string; number: string; supplier: string; doc_no: string; note: string; total_czk: number; created_at: string; stock_receipt_items: { qty: number }[] };

/** Příjem zboží od dodavatele a seznam příjemek. */
export default async function ReceiptsPage() {
  await requireAdmin();
  const [db, admin] = await Promise.all([getAuthSupabase(), getAdmin()]);
  const manager = admin?.isManager ?? false;
  const [{ data: products }, { data: receipts }] = await Promise.all([
    db.from("products").select("id, line, variant, unit, storage, purchase_price_czk").order("line").order("variant"),
    db.from("stock_receipts").select("id, number, supplier, doc_no, note, total_czk, created_at, stock_receipt_items(qty)").order("created_at", { ascending: false }).limit(50),
  ]);
  const list: ReceiptProduct[] = ((products ?? []) as Pick<ProductRow, "id" | "line" | "variant" | "unit" | "storage" | "purchase_price_czk">[]).map((p) => ({
    id: p.id,
    name: productName(p),
    unit: p.unit,
    storage: p.storage,
    purchase_price_czk: p.purchase_price_czk,
  }));

  return (
    <>
      <h1>Příjemky</h1>
      <p className="mt-1 text-sm text-muted">Příjem zboží od dodavatele zvýší stav skladu a u mraženého zboží založí šarži. Odpis a inventura jsou v detailu produktu ve Skladu.</p>

      <h2 className="mt-6 mb-2 text-[20px]">Nová příjemka</h2>
      <ReceiptForm products={list} manager={manager} />

      <h2 className="mt-8 mb-2 text-[20px]">Zaúčtované příjemky</h2>
      {(receipts ?? []).length === 0 ? (
        <p className="text-muted">Zatím žádná.</p>
      ) : (
        <Table head={manager ? ["Číslo", "Kdy", "Dodavatel", "Doklad", "Položek", "Nákup", "Poznámka"] : ["Číslo", "Kdy", "Dodavatel", "Doklad", "Položek", "Poznámka"]}>
          {((receipts ?? []) as ReceiptRow[]).map((r) => (
            <tr key={r.id} id={r.id}>
              <Td className="font-semibold">{r.number}</Td>
              <Td className="whitespace-nowrap text-muted">{formatDate(r.created_at)}</Td>
              <Td>{r.supplier || "—"}</Td>
              <Td className="text-muted">{r.doc_no}</Td>
              <Td>{r.stock_receipt_items.length}</Td>
              {manager && <Td className="whitespace-nowrap">{formatPrice(Math.round(Number(r.total_czk)))}</Td>}
              <Td className="text-muted">{r.note}</Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
