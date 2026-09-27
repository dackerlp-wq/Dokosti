import type { Metadata } from "next";
import Link from "next/link";
import { ReceiptForm, type ReceiptProduct } from "@/components/admin/receipt-form";
import { Table, Td } from "@/components/admin/table";
import { formatDate, formatQty, STOCK_KIND_LABEL, type ProductRow, type StockMovementRow } from "@/lib/admin";
import { productName } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { getAdmin, getAuthSupabase } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Sklad" };

type ReceiptRow = { id: string; number: string; supplier: string; doc_no: string; total_czk: number; created_at: string; stock_receipt_items: { qty: number }[] };
type MovementWithProduct = StockMovementRow & { products: { slug: string; line: ProductRow["line"]; variant: string; unit: ProductRow["unit"] } | null };

export default async function StockPage() {
  const [db, admin] = await Promise.all([getAuthSupabase(), getAdmin()]);
  const manager = admin?.isManager ?? false;
  const [{ data: products }, { data: receipts }, { data: movements }] = await Promise.all([
    db.from("products").select("id, line, variant, unit, storage, purchase_price_czk").order("line").order("variant"),
    db.from("stock_receipts").select("id, number, supplier, doc_no, total_czk, created_at, stock_receipt_items(qty)").order("created_at", { ascending: false }).limit(20),
    db.from("stock_movements").select("*, products(slug, line, variant, unit)").order("created_at", { ascending: false }).limit(40),
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
      <h1>Sklad</h1>
      <p className="mt-1 text-sm text-muted">Příjem zboží od dodavatele a poslední pohyby. Odpis a inventura jsou u každého produktu.</p>

      <h2 className="mt-6 mb-2 text-[20px]">Nová příjemka</h2>
      <ReceiptForm products={list} manager={manager} />

      <h2 className="mt-8 mb-2 text-[20px]">Příjemky</h2>
      {(receipts ?? []).length === 0 ? (
        <p className="text-muted">Zatím žádná.</p>
      ) : (
        <Table head={manager ? ["Číslo", "Kdy", "Dodavatel", "Doklad", "Položek", "Nákup"] : ["Číslo", "Kdy", "Dodavatel", "Doklad", "Položek"]}>
          {((receipts ?? []) as ReceiptRow[]).map((r) => (
            <tr key={r.id}>
              <Td className="font-semibold">{r.number}</Td>
              <Td className="whitespace-nowrap text-muted">{formatDate(r.created_at)}</Td>
              <Td>{r.supplier || "—"}</Td>
              <Td className="text-muted">{r.doc_no}</Td>
              <Td>{r.stock_receipt_items.length}</Td>
              {manager && <Td>{formatPrice(Math.round(Number(r.total_czk)))}</Td>}
            </tr>
          ))}
        </Table>
      )}

      <h2 className="mt-8 mb-2 text-[20px]">Poslední pohyby</h2>
      {(movements ?? []).length === 0 ? (
        <p className="text-muted">Zatím žádný pohyb. Pohyby vznikají příjmem, prodejem, stornem, odpisem a inventurou.</p>
      ) : (
        <Table head={["Kdy", "Produkt", "Pohyb", "Množství", "Poznámka"]}>
          {((movements ?? []) as unknown as MovementWithProduct[]).map((m) => (
            <tr key={m.id}>
              <Td className="whitespace-nowrap text-muted">{formatDate(m.created_at)}</Td>
              <Td>
                {m.products ? (
                  <Link href={`/admin/produkty/${m.product_id}`} className="text-green hover:underline">
                    {productName(m.products)}
                  </Link>
                ) : (
                  "—"
                )}
              </Td>
              <Td>{STOCK_KIND_LABEL[m.kind]}</Td>
              <Td className={Number(m.qty) < 0 ? "text-brick-text" : "text-green"}>
                {Number(m.qty) > 0 ? "+" : ""}
                {formatQty(m.qty, m.products?.unit ?? "ks")}
              </Td>
              <Td className="text-muted">{m.note}</Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
