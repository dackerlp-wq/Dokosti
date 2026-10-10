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

export async function loadAlerts(db: SupabaseClient, now = new Date(), opts: { manager?: boolean } = {}): Promise<Alert[]> {
  const soon = new Date(now.getTime() + 14 * DAY).toISOString().slice(0, 10);
  const unpaidBefore = new Date(now.getTime() - 3 * DAY).toISOString();
  const todayIso = now.toISOString().slice(0, 10);
  const [{ data: expiring }, { data: stock }, { data: unpaid }, { data: failedSubs }, { data: overdueTasks }, { data: devices }, { data: temps }, { data: docs }, { data: dueReceipts }, { data: dueExpenses }] = await Promise.all([
    db.from("stock_batches").select("id, product_id, batch_no, expires_on, qty, products(line, variant, unit)").gt("qty", 0).lte("expires_on", soon).order("expires_on"),
    db.from("products").select("id, line, variant, unit, stock_qty, low_stock_threshold").not("stock_qty", "is", null).order("stock_qty"),
    db.from("orders").select("id, order_number, customer_name, total_czk, created_at").eq("payment_method", "prevod").is("paid_at", null).in("status", ["nova", "potvrzena", "pripravena"]).lte("created_at", unpaidBefore).order("created_at"),
    db.from("subscriptions").select("id, customer_name, last_error").eq("status", "aktivni").not("last_error", "is", null).limit(5),
    db.from("tasks").select("id, title, due_on").is("done_at", null).lt("due_on", now.toISOString().slice(0, 10)).order("due_on").limit(10),
    db.from("devices").select("id, name, min_c, max_c").eq("active", true),
    db.from("temperature_log").select("device_id, value_c, ok, measured_at").gte("measured_at", `${todayIso}T00:00:00`),
    opts.manager ? db.from("documents").select("id, title, valid_to").is("archived_at", null).not("valid_to", "is", null).lte("valid_to", new Date(now.getTime() + 60 * DAY).toISOString().slice(0, 10)).order("valid_to") : Promise.resolve({ data: [] }),
    opts.manager ? db.from("stock_receipts").select("id, number, doc_no, supplier, due_on, invoice_total_czk").is("paid_at", null).not("due_on", "is", null).lte("due_on", new Date(now.getTime() + 3 * DAY).toISOString().slice(0, 10)).order("due_on") : Promise.resolve({ data: [] }),
    opts.manager ? db.from("expenses").select("id, description, amount_czk, due_on").is("paid_at", null).neq("source_type", "receipt").not("due_on", "is", null).lte("due_on", new Date(now.getTime() + 3 * DAY).toISOString().slice(0, 10)).order("due_on").limit(10) : Promise.resolve({ data: [] }),
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
  // Teploty: dnešní zápis chybí (po 10. hodině), nebo byl mimo rozsah.
  const hour = Number(new Intl.DateTimeFormat("cs-CZ", { hour: "numeric", hour12: false, timeZone: "Europe/Prague" }).format(now));
  const logs = (temps ?? []) as { device_id: string; value_c: number; ok: boolean; measured_at: string }[];
  for (const d of (devices ?? []) as { id: string; name: string; min_c: number; max_c: number }[]) {
    const mine = logs.filter((t) => t.device_id === d.id);
    if (mine.length === 0 && hour >= 10) out.push({ id: `temp-missing:${d.id}`, level: "warn", kind: "Teploty", text: `${d.name}: dnes chybí zápis teploty.`, href: "/admin/provoz", action: "Zapsat" });
    const bad = mine.find((t) => !t.ok);
    if (bad) out.push({ id: `temp-bad:${d.id}`, level: "hot", kind: "Teploty", text: `${d.name}: ${Number(bad.value_c)} °C mimo rozsah ${Number(d.min_c)} až ${Number(d.max_c)} °C.`, href: "/admin/provoz", action: "Deník" });
  }
  for (const doc of (docs ?? []) as { id: string; title: string; valid_to: string }[]) {
    const days = Math.floor((new Date(doc.valid_to + "T12:00:00").getTime() - now.getTime()) / DAY);
    out.push({ id: `doc:${doc.id}`, level: days <= 7 ? "hot" : "warn", kind: "Dokument", text: `${doc.title}: platnost ${days < 0 ? "skončila" : `končí za ${days} dní`} (${formatDay(doc.valid_to)}).`, href: `/admin/dokumenty/${doc.id}`, action: "Dokument" });
  }
  for (const r of (dueReceipts ?? []) as { id: string; number: string; doc_no: string; supplier: string; due_on: string; invoice_total_czk: number | null }[]) {
    const days = Math.floor((new Date(r.due_on + "T12:00:00").getTime() - now.getTime()) / DAY);
    out.push({ id: `invoice:${r.id}`, level: days < 0 ? "hot" : "warn", kind: "Faktura", text: `${r.supplier || "Dodavatel"} ${r.doc_no || r.number}${r.invoice_total_czk ? ` (${formatPrice(Math.round(Number(r.invoice_total_czk)))})` : ""}: ${days < 0 ? "po splatnosti" : days === 0 ? "splatná dnes" : `splatná za ${days} dní`}.`, href: `/admin/sklad/prijemky#${r.id}`, action: "Příjemky" });
  }
  for (const e of (dueExpenses ?? []) as { id: string; description: string; amount_czk: number; due_on: string }[]) {
    const days = Math.floor((new Date(e.due_on + "T12:00:00").getTime() - now.getTime()) / DAY);
    out.push({ id: `expense:${e.id}`, level: days < 0 ? "hot" : "warn", kind: "Výdaj", text: `${e.description} (${formatPrice(Math.round(Number(e.amount_czk)))}): ${days < 0 ? "po splatnosti" : days === 0 ? "splatný dnes" : `splatný za ${days} dní`}.`, href: "/admin/finance/splatnosti", action: "Zaplatit" });
  }
  const rank = { hot: 0, warn: 1, info: 2 };
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}
