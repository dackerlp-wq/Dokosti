import Link from "next/link";
import { StatusBadge } from "@/components/admin/status-badge";
import { Table, Td } from "@/components/admin/table";
import { formatDate, isOrderStatus, ORDER_STATUS_LABEL, ORDER_STATUSES, SHIPPING_LABEL, type OrderRow } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import { getAuthSupabase } from "@/lib/supabase/auth";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ stav?: string }> }) {
  const { stav } = await searchParams;
  const status = stav && isOrderStatus(stav) ? stav : null;
  const db = await getAuthSupabase();
  let q = db.from("orders").select("*").order("created_at", { ascending: false }).limit(200);
  if (status) q = q.eq("status", status);
  const { data } = await q;
  const orders = (data ?? []) as OrderRow[];

  return (
    <>
      <h1>Objednávky</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        <Filter href="/admin/objednavky" active={!status}>
          Vše
        </Filter>
        {ORDER_STATUSES.map((s) => (
          <Filter key={s} href={`/admin/objednavky?stav=${s}`} active={status === s}>
            {ORDER_STATUS_LABEL[s]}
          </Filter>
        ))}
      </div>
      <div className="mt-4">
        {orders.length === 0 ? (
          <p className="text-muted">Žádné objednávky.</p>
        ) : (
          <Table head={["Číslo", "Vytvořeno", "Zákazník", "Telefon", "Dodání", "Celkem", "Stav"]}>
            {orders.map((o) => (
              <tr key={o.id}>
                <Td>
                  <Link href={`/admin/objednavky/${o.id}`} className="font-semibold text-green hover:underline">
                    {o.order_number}
                  </Link>
                </Td>
                <Td>{formatDate(o.created_at)}</Td>
                <Td>{o.customer_name}</Td>
                <Td>{o.customer_phone}</Td>
                <Td>{SHIPPING_LABEL[o.shipping_method]}</Td>
                <Td>{formatPrice(o.total_czk)}</Td>
                <Td>
                  <StatusBadge status={o.status} />
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </>
  );
}

function Filter({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`label inline-flex min-h-8 items-center rounded-full border px-3 text-[11px] ${
        active ? "border-green bg-green text-cream" : "border-line bg-paper text-green hover:border-green"
      }`}
    >
      {children}
    </Link>
  );
}
