import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelPurchaseOrder, sendPurchaseOrder } from "@/app/admin/(app)/nakup/actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { PageHeader } from "@/components/admin/page-header";
import { PrintButton } from "@/components/admin/print-button";
import { Table, Td } from "@/components/admin/table";
import { Button, buttonClass } from "@/components/ui/button";
import { formatDate, formatDay, formatQty, PURCHASE_ORDER_STATUS_LABEL, type ProductRow, type PurchaseOrderItemRow, type PurchaseOrderRow, type SupplierRow } from "@/lib/admin";
import { productName } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Objednávka u dodavatele" };

type Item = PurchaseOrderItemRow & { products: Pick<ProductRow, "line" | "variant" | "unit" | "ean"> };

export default async function PurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const db = await getAuthSupabase();
  const [{ data }, { data: items }] = await Promise.all([db.from("purchase_orders").select("*, suppliers(*)").eq("id", id).maybeSingle(), db.from("purchase_order_items").select("*, products(line, variant, unit, ean)").eq("purchase_order_id", id)]);
  if (!data) notFound();
  const o = data as PurchaseOrderRow & { suppliers: SupplierRow };
  const rows = (items ?? []) as Item[];
  const total = rows.reduce((n, r) => n + Number(r.qty) * Number(r.unit_cost_czk), 0);

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          crumbs={[{ href: "/admin/nakup", label: "Objednávky u dodavatelů" }]}
          title={o.number}
          badges={<span className="text-small font-semibold rounded-control border border-line bg-white px-2.5 py-0.5 text-muted">{PURCHASE_ORDER_STATUS_LABEL[o.status]}</span>}
          subtitle={`${o.suppliers.name} · vytvořena ${formatDate(o.created_at)}${o.sent_at ? ` · odeslána ${formatDate(o.sent_at)}` : ""}${o.expected_on ? ` · očekáváno ${formatDay(o.expected_on)}` : ""}`}
          actions={
            <>
              <PrintButton />
              {o.status === "odeslana" && (
                <Link href={`/admin/sklad/prijemky?objednavka=${o.id}`} className={buttonClass("primary")}>
                  Přijmout příjemkou
                </Link>
              )}
              {o.status === "prijata" && o.receipt_id && (
                <Link href={`/admin/sklad/prijemky#${o.receipt_id}`} className={buttonClass("secondary")}>
                  Příjemka
                </Link>
              )}
            </>
          }
        />
      </div>
      <h1 className="hidden print:block">Objednávka {o.number} · {o.suppliers.name}</h1>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_300px]">
        <div>
          <Table head={admin.isManager ? ["Produkt", "EAN", "Objednáno", "Přijato", "Nákup / j.", "Celkem"] : ["Produkt", "EAN", "Objednáno", "Přijato"]}>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td className="font-semibold">{productName(r.products)}</Td>
                <Td className="text-muted">{r.products.ean ?? "—"}</Td>
                <Td className="whitespace-nowrap">{formatQty(r.qty, r.products.unit)}</Td>
                <Td className={`whitespace-nowrap ${o.status === "prijata" && Number(r.received_qty) !== Number(r.qty) ? "text-brick-text" : ""}`}>{o.status === "prijata" ? formatQty(r.received_qty, r.products.unit) : "—"}</Td>
                {admin.isManager && <Td className="whitespace-nowrap">{formatPrice(Number(r.unit_cost_czk))}</Td>}
                {admin.isManager && <Td className="whitespace-nowrap">{formatPrice(Math.round(Number(r.qty) * Number(r.unit_cost_czk)))}</Td>}
              </tr>
            ))}
          </Table>
          {admin.isManager && <p className="mt-2 text-right text-sm">Nákup celkem <b>{formatPrice(Math.round(total))}</b></p>}
          {o.note && <p className="mt-3 text-sm italic text-muted">{o.note}</p>}
        </div>

        <div className="space-y-4 print:hidden">
          {o.status === "navrh" && (
            <form action={sendPurchaseOrder} className="rounded-card border border-line bg-white p-4">
              <input type="hidden" name="id" value={o.id} />
              <p className="mb-1 text-label text-green">Odeslat dodavateli</p>
              {o.suppliers.email ? (
                <>
                  <p className="text-sm">E-mail s položkami odejde na {o.suppliers.email}.</p>
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <input type="checkbox" name="email" value="on" defaultChecked className="h-4 w-4 min-h-0 w-auto accent-green" />
                    Poslat e-mail
                  </label>
                  <input type="hidden" name="email" value="off" />
                </>
              ) : (
                <p className="text-sm text-muted">Dodavatel nemá e-mail. Objednávku vytiskněte nebo nadiktujte a označte jako odeslanou.</p>
              )}
              <Button type="submit" className="mt-3 w-full">
                {o.suppliers.email ? "Odeslat" : "Označit jako odeslanou"}
              </Button>
            </form>
          )}
          {o.status === "odeslana" && (
            <div className="rounded-card border border-line bg-white p-4 text-sm">
              <p className="mb-1 text-label text-green">Na cestě</p>
              <p>Až zboží přijede, zaúčtujte ho příjemkou z této objednávky: položky se předvyplní a rozdíly uvidíte před zaúčtováním.</p>
            </div>
          )}
          {o.status !== "prijata" && o.status !== "zrusena" && (
            <ConfirmButton action={cancelPurchaseOrder} fields={{ id: o.id }} title={`Zrušit objednávku ${o.number}?`} text="Dodavateli žádná zpráva neodejde, zrušení s ním domluvte. Objednávka zůstane v historii jako zrušená." confirmLabel="Zrušit objednávku" reasonName="reason" variant="ghost" className="w-full">
              Zrušit objednávku
            </ConfirmButton>
          )}
          <div className="rounded-card border border-line bg-white p-4 text-sm">
            <p className="mb-1 text-label text-green">Dodavatel</p>
            <Link href={`/admin/dodavatele/${o.supplier_id}`} className="font-semibold text-brick-text hover:underline">
              {o.suppliers.name}
            </Link>
            <p className="text-muted">{[o.suppliers.contact, o.suppliers.email, o.suppliers.phone].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
      </div>
    </>
  );
}
