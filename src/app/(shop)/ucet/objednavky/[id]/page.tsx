import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatDate, formatDay, PAYMENT_LABEL, SHIPPING_LABEL, type OrderItemRow, type OrderRow } from "@/lib/admin";
import { getCustomerUser } from "@/lib/customer";
import { formatPrice } from "@/lib/format";
import { getAuthSupabase } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Objednávka", robots: { index: false } };

export default async function CustomerOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCustomerUser();
  if (!user) redirect("/ucet/prihlaseni");
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
    <div className="container-dk py-6 md:py-10">
      <p className="label mb-1 text-[11px] text-muted">
        <Link href="/ucet" className="hover:underline">
          Můj účet
        </Link>{" "}
        · {formatDate(o.created_at)}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <h1>Objednávka {o.order_number}</h1>
        <StatusBadge status={o.status} />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
        <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-paper text-sm">
          {lines.map((i) => (
            <li key={i.id} className="flex justify-between gap-3 p-3">
              <span>
                {i.qty} × {i.name}
              </span>
              <span>{formatPrice(i.qty * i.unit_price_czk)}</span>
            </li>
          ))}
          {o.discount_czk > 0 && (
            <li className="flex justify-between gap-3 p-3 text-brick-text">
              <span>Sleva {o.coupon_code}</span>
              <span>−{formatPrice(o.discount_czk)}</span>
            </li>
          )}
          {o.points_discount_czk > 0 && (
            <li className="flex justify-between gap-3 p-3 text-brick-text">
              <span>Kostičky</span>
              <span>−{formatPrice(o.points_discount_czk)}</span>
            </li>
          )}
          <li className="flex justify-between gap-3 p-3 text-muted">
            <span>Doprava</span>
            <span>{o.shipping_czk === 0 ? "zdarma" : formatPrice(o.shipping_czk)}</span>
          </li>
          <li className="flex justify-between gap-3 p-3 font-display text-[18px] font-semibold">
            <span>Celkem</span>
            <span>{formatPrice(o.total_czk)}</span>
          </li>
        </ul>
        <div className="h-fit rounded-[var(--radius-card)] border border-line bg-paper p-4 text-sm">
          <p className="label mb-1 text-[11px] text-muted">Dodání a platba</p>
          <p>
            {SHIPPING_LABEL[o.shipping_method]}
            {o.delivery_date && ` · ${formatDay(o.delivery_date)}`}
          </p>
          <p>{PAYMENT_LABEL[o.payment_method]}</p>
          {o.street && (
            <p className="mt-2 text-muted">
              {o.street}, {o.zip} {o.city}
            </p>
          )}
          {o.points_earned > 0 && <p className="mt-2 text-xs text-muted">Po doručení připíšeme {o.points_earned} Kostiček.</p>}
        </div>
      </div>
    </div>
  );
}
