import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/admin/status-badge";
import { Table, Td } from "@/components/admin/table";
import { Button } from "@/components/ui/button";
import { formatDate, ORDER_STATUS_LABEL, ORDER_STATUSES, PAYMENT_LABEL, SHIPPING_LABEL, type OrderItemRow, type OrderRow } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import { getAuthSupabase } from "@/lib/supabase/auth";
import { setOrderStatus } from "./actions";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getAuthSupabase();
  const [{ data: order }, { data: items }] = await Promise.all([
    db.from("orders").select("*").eq("id", id).maybeSingle(),
    db.from("order_items").select("*").eq("order_id", id),
  ]);
  if (!order) notFound();
  const o = order as OrderRow;
  const lines = (items ?? []) as OrderItemRow[];

  return (
    <>
      <p className="label mb-1 text-[11px] text-muted">
        <Link href="/admin/objednavky" className="hover:underline">
          Objednávky
        </Link>{" "}
        · {formatDate(o.created_at)}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <h1>{o.order_number}</h1>
        <StatusBadge status={o.status} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Table head={["Položka", "Ks", "Cena", "Celkem"]}>
            {lines.map((i) => (
              <tr key={i.id}>
                <Td>{i.name}</Td>
                <Td>{i.qty}</Td>
                <Td>{formatPrice(i.unit_price_czk)}</Td>
                <Td>{formatPrice(i.qty * i.unit_price_czk)}</Td>
              </tr>
            ))}
            <tr>
              <Td className="text-muted">Doprava · {SHIPPING_LABEL[o.shipping_method]}</Td>
              <Td>{""}</Td>
              <Td>{""}</Td>
              <Td>{o.shipping_czk === 0 ? "zdarma" : formatPrice(o.shipping_czk)}</Td>
            </tr>
            <tr className="font-semibold">
              <Td>Celkem</Td>
              <Td>{""}</Td>
              <Td>{""}</Td>
              <Td>{formatPrice(o.total_czk)}</Td>
            </tr>
          </Table>

          <div className="grid gap-4 sm:grid-cols-2">
            <Box title="Zákazník">
              {o.customer_name}
              <br />
              <a href={`tel:${o.customer_phone}`} className="text-green hover:underline">
                {o.customer_phone}
              </a>
              <br />
              <a href={`mailto:${o.customer_email}`} className="text-green hover:underline">
                {o.customer_email}
              </a>
            </Box>
            <Box title="Dodání a platba">
              {SHIPPING_LABEL[o.shipping_method]} · {PAYMENT_LABEL[o.payment_method]}
              {o.street && (
                <>
                  <br />
                  {o.street}, {o.zip} {o.city}
                </>
              )}
            </Box>
            {o.note && (
              <Box title="Poznámka zákazníka" className="sm:col-span-2">
                {o.note}
              </Box>
            )}
          </div>
        </div>

        <form action={setOrderStatus} className="h-fit rounded-[var(--radius-card)] border border-line bg-paper p-4">
          <input type="hidden" name="id" value={o.id} />
          <label htmlFor="status" className="label mb-1 block text-[11px] text-muted">
            Stav objednávky
          </label>
          <select id="status" name="status" defaultValue={o.status}>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <Button type="submit" className="mt-3 w-full">
            Uložit stav
          </Button>
        </form>
      </div>
    </>
  );
}

function Box({ title, className = "", children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-[var(--radius-card)] border border-line bg-paper p-4 text-sm ${className}`}>
      <p className="label mb-1 text-[11px] text-muted">{title}</p>
      {children}
    </div>
  );
}
