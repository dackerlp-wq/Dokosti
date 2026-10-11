import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { StatusBadge } from "@/components/admin/status-badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
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
    <div className="mx-auto max-w-narrow px-5 pt-5 pb-10 md:pb-15">
      <Breadcrumb items={[{ href: "/", label: "Úvod" }, { href: "/ucet", label: "Můj účet" }, { label: `Objednávka ${o.order_number}` }]} />
      <p className="mt-7.5 text-eyebrow text-muted uppercase">{formatDate(o.created_at)}</p>
      <div className="mb-7.5 flex flex-wrap items-center gap-3.5">
        <h1 className="font-display text-display-md text-green md:text-display-lg">Objednávka {o.order_number}</h1>
        <StatusBadge status={o.status} />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <ul className="divide-y divide-line rounded-card border border-line bg-white text-small">
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
          <li className="flex justify-between gap-3 p-3 text-price text-green">
            <span>Celkem</span>
            <span>{formatPrice(o.total_czk)}</span>
          </li>
        </ul>
        <div className="h-fit rounded-card bg-paper p-5 text-small">
          <p className="mb-1 text-label text-green">Dodání a platba</p>
          <p>
            {SHIPPING_LABEL[o.shipping_method]}
            {o.delivery_date && ` · ${formatDay(o.delivery_date)}`}
          </p>
          <p>{PAYMENT_LABEL[o.payment_method]}</p>
          {o.street && (
            <p className="mt-2">
              {o.street}, {o.zip} {o.city}
            </p>
          )}
          {o.points_earned > 0 && <p className="mt-2">Po doručení připíšeme {o.points_earned} Kostiček.</p>}
        </div>
      </div>
    </div>
  );
}
