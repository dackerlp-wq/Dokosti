import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDay, formatQty, type OrderRow, type ProductRow } from "@/lib/admin";
import { productName } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

/**
 * Upozornění napříč systémem: jedno místo, které čte Dnes, badge v menu a (později) notifikace.
 * Každé upozornění má závažnost, text a odkaz tam, kde se řeší.
 */
export type Alert = { id: string; level: "hot" | "warn" | "info"; kind: string; text: string; href: string; action: string };

const DAY = 86_400_000;

export async function loadAlerts(db: SupabaseClient, now = new Date()): Promise<Alert[]> {
  const soon = new Date(now.getTime() + 14 * DAY).toISOString().slice(0, 10);
  const unpaidBefore = new Date(now.getTime() - 3 * DAY).toISOString();
  const [{ data: expiring }, { data: stock }, { data: unpaid }, { data: failedSubs }, { data: overdueTasks }] = await Promise.all([
    db.from("stock_batches").select("id, product_id, batch_no, expires_on, qty, products(line, variant, unit)").gt("qty", 0).lte("expires_on", soon).order("expires_on"),
    db.from("products").select("id, line, variant, unit, stock_qty, low_stock_threshold").not("stock_qty", "is", null).order("stock_qty"),
    db.from("orders").select("id, order_number, customer_name, total_czk, created_at").eq("payment_method", "prevod").is("paid_at", null).in("status", ["nova", "potvrzena", "pripravena"]).lte("created_at", unpaidBefore).order("created_at"),
    db.from("subscriptions").select("id, customer_name, last_error").eq("status", "aktivni").not("last_error", "is", null).limit(5),
    db.from("tasks").select("id, title, due_on").is("done_at", null).lt("due_on", now.toISOString().slice(0, 10)).order("due_on").limit(10),
  ]);

  const out: Alert[] = [];
  type Exp = { id: string; product_id: string; batch_no: string; expires_on: string; qty: number; products: { line: ProductRow["line"]; variant: string; unit: ProductRow["unit"] } | null };
  const exp = (expiring ?? []) as unknown as Exp[];
  for (const b of exp) {
    const days = Math.floor((new Date(b.expires_on + "T12:00:00").getTime() - now.getTime()) / DAY);
    out.push({
      id: `exp:${b.id}`,
      level: days <= 3 ? "hot" : "warn",
      kind: "Expirace",
      text: `${b.products ? productName(b.products) : "Produkt"}${b.batch_no ? ` (šarže ${b.batch_no})` : ""}: ${formatQty(b.qty, b.products?.unit ?? "ks")} do ${formatDay(b.expires_on)}${days < 0 ? ", už prošlé" : ""}.`,
      href: `/admin/sklad/${b.product_id}`,
      action: "Šarže",
    });
  }
  const low = ((stock ?? []) as Pick<ProductRow, "id" | "line" | "variant" | "unit" | "stock_qty" | "low_stock_threshold">[]).filter((p) => Number(p.stock_qty) <= p.low_stock_threshold);
  for (const p of low) {
    out.push({ id: `low:${p.id}`, level: Number(p.stock_qty) <= 0 ? "warn" : "info", kind: "Sklad", text: `${productName(p)}: ${Number(p.stock_qty) <= 0 ? "vyprodáno" : `dochází, ${formatQty(p.stock_qty, p.unit)}`}.`, href: `/admin/sklad/${p.id}`, action: "Sklad" });
  }
  for (const o of (unpaid ?? []) as Pick<OrderRow, "id" | "order_number" | "customer_name" | "total_czk" | "created_at">[]) {
    const days = Math.floor((now.getTime() - new Date(o.created_at).getTime()) / DAY);
    out.push({ id: `unpaid:${o.id}`, level: days >= 7 ? "hot" : "warn", kind: "Platba", text: `${o.order_number} · ${o.customer_name}: převodem nezaplaceno ${days} dní, ${formatPrice(o.total_czk)}.`, href: `/admin/objednavky/${o.id}`, action: "Objednávka" });
  }
  for (const s of (failedSubs ?? []) as { id: string; customer_name: string; last_error: string }[]) {
    out.push({ id: `sub:${s.id}`, level: "hot", kind: "Předplatné", text: `${s.customer_name}: objednávka nevznikla (${s.last_error}).`, href: `/admin/predplatne/${s.id}`, action: "Vyřešit" });
  }
  for (const t of (overdueTasks ?? []) as { id: string; title: string; due_on: string }[]) {
    out.push({ id: `task:${t.id}`, level: "warn", kind: "Úkol", text: `${t.title}: termín ${formatDay(t.due_on)} prošel.`, href: "/admin/ukoly", action: "Úkoly" });
  }
  const rank = { hot: 0, warn: 1, info: 2 };
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}
