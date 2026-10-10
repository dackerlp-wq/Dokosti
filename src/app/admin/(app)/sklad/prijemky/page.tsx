import type { Metadata } from "next";
import Link from "next/link";
import { markReceiptPaid } from "@/app/admin/(app)/sklad/actions";
import { PageHeader } from "@/components/admin/page-header";
import { ReceiptWizard, type OpenOrder, type ReceiptProduct, type ReceiptSupplier } from "@/components/admin/receipt-wizard";
import { Table, Td } from "@/components/admin/table";
import { Button, buttonClass } from "@/components/ui/button";
import { formatDate, formatDay, type ProductRow } from "@/lib/admin";
import { productName } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Příjemky" };

type ReceiptRow = { id: string; number: string; supplier: string; doc_no: string; note: string; total_czk: number; created_at: string; due_on: string | null; paid_at: string | null; invoice_total_czk: number | null; purchase_order_id: string | null; stock_receipt_items: { qty: number }[] };

/** Příjem zboží od dodavatele (průvodce) a seznam příjemek se splatností faktur. */
export default async function ReceiptsPage({ searchParams }: { searchParams: Promise<{ objednavka?: string }> }) {
  const admin = await requireAdmin();
  const { objednavka } = await searchParams;
  const manager = admin.isManager;
  const db = await getAuthSupabase();
  const [{ data: products }, { data: suppliers }, { data: orders }, { data: receipts }] = await Promise.all([
    db.from("products").select("id, line, variant, unit, storage, purchase_price_czk, price_czk, ean, supplier_id").order("line").order("sort_order").order("variant"),
    db.from("suppliers").select("id, name").eq("active", true).order("name"),
    db.from("purchase_orders").select("id, number, supplier_id, expected_on, suppliers(name), purchase_order_items(product_id, qty, unit_cost_czk)").eq("status", "odeslana").order("created_at"),
    db.from("stock_receipts").select("id, number, supplier, doc_no, note, total_czk, created_at, due_on, paid_at, invoice_total_czk, purchase_order_id, stock_receipt_items(qty)").order("created_at", { ascending: false }).limit(50),
  ]);
  const list: ReceiptProduct[] = ((products ?? []) as Pick<ProductRow, "id" | "line" | "variant" | "unit" | "storage" | "purchase_price_czk" | "price_czk" | "ean" | "supplier_id">[]).map((p) => ({
    id: p.id,
    name: productName(p),
    unit: p.unit,
    storage: p.storage,
    purchase_price_czk: manager ? p.purchase_price_czk : null,
    price_czk: p.price_czk,
    ean: p.ean,
    supplier_id: p.supplier_id,
  }));
  const open: OpenOrder[] = ((orders ?? []) as unknown as { id: string; number: string; supplier_id: string; expected_on: string | null; suppliers: { name: string } | null; purchase_order_items: { product_id: string; qty: number; unit_cost_czk: number }[] }[]).map((o) => ({
    id: o.id,
    number: o.number,
    supplier_id: o.supplier_id,
    supplier_name: o.suppliers?.name ?? "",
    expected_on: o.expected_on,
    items: o.purchase_order_items.map((i) => ({ product_id: i.product_id, qty: Number(i.qty), unit_cost_czk: manager ? Number(i.unit_cost_czk) : 0 })),
  }));
  const rows = (receipts ?? []) as ReceiptRow[];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        title="Příjemky"
        subtitle="Příjem zboží zvýší stav skladu, u mraženého a chlazeného založí šarži a uloží nákupní cenu. Odpis, interní výdej a inventura jsou ve Skladu."
        actions={
          <Link href="/admin/nakup" className={buttonClass("secondary")}>
            Objednávky u dodavatelů
          </Link>
        }
      />
      <div className="mt-5">
        <ReceiptWizard products={list} suppliers={(suppliers ?? []) as ReceiptSupplier[]} orders={open} manager={manager} initialOrderId={objednavka} today={today} />
      </div>

      <h2 className="mt-8 mb-2 text-[20px]">Zaúčtované příjemky</h2>
      {rows.length === 0 ? (
        <p className="text-muted">Zatím žádná.</p>
      ) : (
        <Table head={manager ? ["Číslo", "Kdy", "Dodavatel", "Doklad", "Položek", "Nákup", "Faktura", ""] : ["Číslo", "Kdy", "Dodavatel", "Doklad", "Položek", "Faktura", ""]}>
          {rows.map((r) => {
            const overdue = r.due_on && !r.paid_at && r.due_on < today;
            return (
              <tr key={r.id} id={r.id}>
                <Td className="font-semibold">
                  {r.number}
                  {r.purchase_order_id && (
                    <Link href={`/admin/nakup/${r.purchase_order_id}`} className="ml-2 text-xs font-normal text-green hover:underline">
                      objednávka
                    </Link>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-muted">{formatDate(r.created_at)}</Td>
                <Td>{r.supplier || "—"}</Td>
                <Td className="text-muted">{r.doc_no}</Td>
                <Td>{r.stock_receipt_items.length}</Td>
                {manager && <Td className="whitespace-nowrap">{formatPrice(Math.round(Number(r.total_czk)))}</Td>}
                <Td className={`whitespace-nowrap ${overdue ? "text-brick-text" : r.paid_at ? "text-muted" : ""}`}>
                  {r.paid_at ? `zaplaceno ${formatDay(r.paid_at.slice(0, 10))}` : r.due_on ? `${overdue ? "po splatnosti" : "splatná"} ${formatDay(r.due_on)}` : "—"}
                  {manager && r.invoice_total_czk ? <span className="block text-xs text-muted">{formatPrice(Math.round(Number(r.invoice_total_czk)))}</span> : null}
                </Td>
                <Td className="text-right">
                  {r.due_on && !r.paid_at && (
                    <form action={markReceiptPaid}>
                      <input type="hidden" name="id" value={r.id} />
                      <Button type="submit" variant="secondary" className="min-h-8 px-3 text-[11px]">
                        Zaplaceno
                      </Button>
                    </form>
                  )}
                </Td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
