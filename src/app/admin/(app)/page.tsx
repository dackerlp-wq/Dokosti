import Link from "next/link";
import { StatusBadge } from "@/components/admin/status-badge";
import { Table, Td } from "@/components/admin/table";
import { formatDate, formatDay, SHIPPING_LABEL, type OrderRow, type ProductRow } from "@/lib/admin";
import { productName } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { getAuthSupabase } from "@/lib/supabase/auth";

export default async function AdminHome() {
  const db = await getAuthSupabase();
  const soon = new Date();
  soon.setDate(soon.getDate() + 14);
  const soonIso = soon.toISOString().slice(0, 10);
  const [{ data: open }, { count: productCount }, { count: unpublished }, { data: stock }, { count: openInquiries }, { data: expiring }] = await Promise.all([
    db.from("orders").select("*").in("status", ["nova", "potvrzena", "pripravena"]).order("created_at", { ascending: false }).limit(10),
    db.from("products").select("id", { count: "exact", head: true }),
    db.from("products").select("id", { count: "exact", head: true }).eq("is_published", false),
    db.from("products").select("*").not("stock_qty", "is", null).order("stock_qty"),
    db.from("inquiries").select("id", { count: "exact", head: true }).eq("answered", false),
    db.from("stock_batches").select("id, product_id, batch_no, expires_on, qty, products(slug, line, variant)").gt("qty", 0).lte("expires_on", soonIso).order("expires_on"),
  ]);
  const orders = (open ?? []) as OrderRow[];
  const low = ((stock ?? []) as ProductRow[]).filter((p) => p.stock_qty !== null && p.stock_qty <= p.low_stock_threshold);
  type Exp = { id: string; product_id: string; batch_no: string; expires_on: string; qty: number; products: { slug: string; line: ProductRow["line"]; variant: string } | null };
  const exp = (expiring ?? []) as unknown as Exp[];

  return (
    <>
      <h1>Přehled</h1>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="K vyřízení" value={orders.length} href="/admin/objednavky" />
        <Stat label="Dochází" value={low.length} href="/admin/produkty" warn={low.length > 0} />
        <Stat label="Produktů" value={productCount ?? 0} href="/admin/produkty" />
        <Stat label="Nezveřejněných" value={unpublished ?? 0} href="/admin/produkty" />
        <Stat label="Dotazy v poradně" value={openInquiries ?? 0} href="/admin/poradna" warn={(openInquiries ?? 0) > 0} />
      </div>

      {low.length > 0 && (
        <div className="mt-5 rounded-[var(--radius-card)] border border-brick bg-paper p-4 text-sm">
          <p className="label mb-2 text-[11px] text-brick-text">Dochází na skladě</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {low.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/produkty/${p.id}`} className="hover:underline">
                  {productName(p)}
                </Link>{" "}
                <span className="text-muted">{p.stock_qty} ks</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {exp.length > 0 && (
        <div className="mt-4 rounded-[var(--radius-card)] border border-brick bg-paper p-4 text-sm">
          <p className="label mb-2 text-[11px] text-brick-text">Expirace do 14 dnů</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {exp.map((b) => (
              <li key={b.id}>
                <Link href={`/admin/produkty/${b.product_id}`} className="hover:underline">
                  {b.products ? productName(b.products) : "produkt"}
                </Link>{" "}
                <span className="text-muted">
                  {b.batch_no && `${b.batch_no} · `}{formatDay(b.expires_on)} · {b.qty} ks
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="mt-8 mb-3 text-[20px]">Otevřené objednávky</h2>
      {orders.length === 0 ? (
        <p className="text-muted">Nic k vyřízení.</p>
      ) : (
        <Table head={["Číslo", "Vytvořeno", "Zákazník", "Dodání", "Termín", "Celkem", "Stav"]}>
          {orders.map((o) => (
            <tr key={o.id}>
              <Td>
                <Link href={`/admin/objednavky/${o.id}`} className="font-semibold text-green hover:underline">
                  {o.order_number}
                </Link>
              </Td>
              <Td>{formatDate(o.created_at)}</Td>
              <Td>{o.customer_name}</Td>
              <Td>{SHIPPING_LABEL[o.shipping_method]}</Td>
              <Td>{o.delivery_date ? formatDay(o.delivery_date) : ""}</Td>
              <Td>{formatPrice(o.total_czk)}</Td>
              <Td>
                <StatusBadge status={o.status} />
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}

function Stat({ label, value, href, warn }: { label: string; value: number; href: string; warn?: boolean }) {
  return (
    <Link href={href} className={`rounded-[var(--radius-card)] border bg-paper p-4 hover:border-green ${warn ? "border-brick" : "border-line"}`}>
      <p className="label text-[11px] text-muted">{label}</p>
      <p className={`font-display text-[28px] font-semibold ${warn ? "text-brick-text" : ""}`}>{value}</p>
    </Link>
  );
}
