import Link from "next/link";
import { StatusBadge } from "@/components/admin/status-badge";
import { Table, Td } from "@/components/admin/table";
import { formatDate, SHIPPING_LABEL, type OrderRow } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import { getAuthSupabase } from "@/lib/supabase/auth";

export default async function AdminHome() {
  const db = await getAuthSupabase();
  const [{ data: open }, { count: productCount }, { count: unpublished }] = await Promise.all([
    db.from("orders").select("*").in("status", ["nova", "potvrzena", "pripravena"]).order("created_at", { ascending: false }).limit(10),
    db.from("products").select("id", { count: "exact", head: true }),
    db.from("products").select("id", { count: "exact", head: true }).eq("is_published", false),
  ]);
  const orders = (open ?? []) as OrderRow[];

  return (
    <>
      <h1>Přehled</h1>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Stat label="K vyřízení" value={orders.length} href="/admin/objednavky" />
        <Stat label="Produktů" value={productCount ?? 0} href="/admin/produkty" />
        <Stat label="Nezveřejněných" value={unpublished ?? 0} href="/admin/produkty" />
      </div>

      <h2 className="mt-8 mb-3 text-[20px]">Otevřené objednávky</h2>
      {orders.length === 0 ? (
        <p className="text-muted">Nic k vyřízení.</p>
      ) : (
        <Table head={["Číslo", "Vytvořeno", "Zákazník", "Dodání", "Celkem", "Stav"]}>
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

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="rounded-[var(--radius-card)] border border-line bg-paper p-4 hover:border-green">
      <p className="label text-[11px] text-muted">{label}</p>
      <p className="font-display text-[28px] font-semibold">{value}</p>
    </Link>
  );
}
