import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "@/components/admin/print-button";
import { formatDay, type OrderItemRow, type OrderRow } from "@/lib/admin";
import { addressOf, todayIso } from "@/lib/delivery";
import { formatPrice } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Trasa rozvozu" };

/** Tisknutelný seznam zastávek pro řidiče: pořadí, adresa, telefon, co vybrat, položky, poznámka. */
export default async function RoutePage({ searchParams }: { searchParams: Promise<{ den?: string }> }) {
  await requireAdmin();
  const { den } = await searchParams;
  const day = den && /^\d{4}-\d{2}-\d{2}$/.test(den) ? den : todayIso();
  const [db, settings] = await Promise.all([getAuthSupabase(), getSettings()]);
  const { data } = await db.from("orders").select("*").eq("shipping_method", "rozvoz").eq("delivery_date", day).in("status", ["nova", "potvrzena", "pripravena"]).order("created_at");
  const list = (data ?? []) as OrderRow[];
  const { data: items } = list.length ? await db.from("order_items").select("*").in("order_id", list.map((o) => o.id)) : { data: [] };
  const byOrder = new Map<string, OrderItemRow[]>();
  for (const i of (items ?? []) as (OrderItemRow & { order_id: string })[]) byOrder.set(i.order_id, [...(byOrder.get(i.order_id) ?? []), i]);
  const cash = list.filter((o) => o.payment_method === "hotove" && !o.paid_at).reduce((n, o) => n + o.total_czk, 0);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="text-eyebrow uppercase text-muted">
            <Link href="/admin/rozvoz" className="hover:underline">
              Rozvoz a odběry
            </Link>{" "}
            · Trasa
          </p>
          <h1>Trasa {formatDay(day)}</h1>
          <p className="text-sm text-muted">
            {list.length} zastávek · {settings.shipping.rozvoz.window}
            {cash > 0 ? ` · vybrat celkem ${formatPrice(cash)}` : ""}
          </p>
        </div>
        <PrintButton />
      </div>
      <h1 className="hidden print:block">Rozvoz {formatDay(day)} · {settings.shop.name}</h1>
      {list.length === 0 ? (
        <p className="text-muted">Na tento den není žádný rozvoz.</p>
      ) : (
        <ol className="divide-y divide-line rounded-card border border-line bg-white print:rounded-none print:border-0">
          {list.map((o, i) => {
            const lines = byOrder.get(o.id) ?? [];
            return (
              <li key={o.id} className="break-inside-avoid grid grid-cols-[32px_1fr_auto] gap-3 p-3 text-[13px]">
                <span className="text-[22px] font-semibold leading-none">{i + 1}</span>
                <div>
                  <p className="text-[15px] font-semibold">
                    {o.customer_name} <span className="font-normal text-muted">· {o.customer_phone}</span>
                  </p>
                  <p>{addressOf(o)}</p>
                  <p className="text-muted">{lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}</p>
                  {o.note && <p className="italic text-muted">„{o.note}“</p>}
                </div>
                <div className="text-right">
                  <p className="text-eyebrow uppercase text-muted">{o.order_number}</p>
                  <p className={o.payment_method === "hotove" && !o.paid_at ? "font-semibold text-brick-text" : "text-muted"}>{o.paid_at ? "zaplaceno" : o.payment_method === "hotove" ? `vybrat ${formatPrice(o.total_czk)}` : "nezaplaceno, převod"}</p>
                  <p className="mt-3 border-b border-line text-[10px] text-muted">podpis / čas</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
