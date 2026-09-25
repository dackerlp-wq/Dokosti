import type { Metadata } from "next";
import { PrintButton } from "@/components/admin/print-button";
import { formatDay, PAYMENT_LABEL, SHIPPING_LABEL, type OrderItemRow, type OrderRow } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import { getAuthSupabase } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Štítky" };

/** Štítky na balíky a tašky: jeden na otevřenou objednávku (bez doručených a zrušených). */
export default async function LabelsPage({ searchParams }: { searchParams: Promise<{ zpusob?: string }> }) {
  const { zpusob } = await searchParams;
  const db = await getAuthSupabase();
  let q = db.from("orders").select("*").in("status", ["nova", "potvrzena", "pripravena"]).order("delivery_date").order("created_at");
  if (zpusob === "odber" || zpusob === "rozvoz" || zpusob === "prepravce") q = q.eq("shipping_method", zpusob);
  const { data: orders } = await q;
  const list = (orders ?? []) as OrderRow[];
  const { data: items } = list.length
    ? await db.from("order_items").select("*").in("order_id", list.map((o) => o.id))
    : { data: [] };
  const byOrder = new Map<string, OrderItemRow[]>();
  for (const i of (items ?? []) as (OrderItemRow & { order_id: string })[]) {
    byOrder.set(i.order_id, [...(byOrder.get(i.order_id) ?? []), i]);
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1>Štítky</h1>
          <p className="text-sm text-muted">{list.length} štítků. Tisk na A4, čtyři na stránku, nastříhat.</p>
        </div>
        <PrintButton />
      </div>
      {list.length === 0 ? (
        <p className="text-muted">Žádné otevřené objednávky.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 print:grid-cols-2 print:gap-0">
          {list.map((o) => {
            const lines = byOrder.get(o.id) ?? [];
            const pieces = lines.reduce((n, i) => n + i.qty, 0);
            return (
              <div key={o.id} className="break-inside-avoid rounded-[var(--radius-card)] border border-line bg-white p-4 text-[13px] print:rounded-none print:border-dashed print:border-ink">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-display text-[22px] font-semibold leading-tight">{o.customer_name}</p>
                  <p className="label shrink-0 text-[10px] text-muted">{o.order_number}</p>
                </div>
                <p className="mt-1 text-[15px]">{o.customer_phone}</p>
                {o.street && (
                  <p className="mt-1">
                    {o.street}
                    <br />
                    {o.zip} {o.city}
                  </p>
                )}
                <p className="mt-2 label text-[10px] text-brick-text">
                  {SHIPPING_LABEL[o.shipping_method]}
                  {o.delivery_date && ` · ${formatDay(o.delivery_date)}`}
                </p>
                <ul className="mt-1 text-[12px] text-muted">
                  {lines.map((i) => (
                    <li key={i.id}>
                      {i.qty} × {i.name}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 flex justify-between border-t border-line pt-2">
                  <span>{pieces} ks</span>
                  <span className={o.payment_method === "hotove" ? "font-semibold" : "text-muted"}>
                    {o.payment_method === "hotove" ? `Vybrat ${formatPrice(o.total_czk)}` : PAYMENT_LABEL[o.payment_method]}
                  </span>
                </p>
                {o.note && <p className="mt-1 text-[12px] italic text-muted">{o.note}</p>}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
