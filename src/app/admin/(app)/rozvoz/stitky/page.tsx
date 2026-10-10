import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "@/components/admin/print-button";
import { formatDay, PAYMENT_LABEL, SHIPPING_LABEL, type OrderItemRow, type OrderRow } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Štítky" };

/** Štítky na balíky a tašky: jeden na otevřenou objednávku (bez doručených a zrušených). */
export default async function LabelsPage({ searchParams }: { searchParams: Promise<{ zpusob?: string; den?: string; objednavka?: string }> }) {
  await requireAdmin();
  const { zpusob, den, objednavka } = await searchParams;
  const db = await getAuthSupabase();
  let q = db.from("orders").select("*").order("delivery_date").order("created_at");
  // Jedna objednávka (z detailu) jde vytisknout v jakémkoli stavu, jinak jen otevřené.
  if (objednavka) q = q.eq("id", objednavka);
  else q = q.in("status", ["nova", "potvrzena", "pripravena"]);
  if (zpusob === "odber" || zpusob === "rozvoz" || zpusob === "prepravce") q = q.eq("shipping_method", zpusob);
  if (den && /^\d{4}-\d{2}-\d{2}$/.test(den)) q = q.eq("delivery_date", den);
  const { data: orders } = await q;
  const chip = (href: string, label: string, on: boolean) => (
    <Link key={href} href={href} className={`label inline-flex min-h-8 items-center rounded-full border px-3 text-[11px] ${on ? "border-green bg-green text-cream" : "border-line bg-paper text-green hover:border-green"}`}>
      {label}
    </Link>
  );
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
          <p className="label text-[11px] text-muted">
            <Link href="/admin/rozvoz" className="hover:underline">
              Rozvoz a odběry
            </Link>{" "}
            · Štítky
          </p>
          <h1>Štítky</h1>
          <p className="text-sm text-muted">
            {list.length} štítků{den ? ` · ${formatDay(den)}` : ""}. Tisk na A4, čtyři na stránku, nastříhat.
          </p>
          {!objednavka && (
            <div className="mt-2 flex flex-wrap gap-2">
              {chip("/admin/rozvoz/stitky", "Vše", !zpusob)}
              {chip("/admin/rozvoz/stitky?zpusob=rozvoz", "Rozvoz", zpusob === "rozvoz")}
              {chip("/admin/rozvoz/stitky?zpusob=odber", "Odběr", zpusob === "odber")}
              {chip("/admin/rozvoz/stitky?zpusob=prepravce", "Přepravce", zpusob === "prepravce")}
            </div>
          )}
        </div>
        <PrintButton />
      </div>
      {list.length === 0 ? (
        <p className="text-muted">Žádné otevřené objednávky.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 print:grid-cols-2 print:gap-0">
          {list.map((o) => {
            const lines = byOrder.get(o.id) ?? [];
            // Kusy jen u kusového zboží; zboží na váhu se do počtu balíků nepočítá.
            const pieces = lines.reduce((n, i) => n + (Number.isInteger(Number(i.qty)) ? Number(i.qty) : 1), 0);
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
