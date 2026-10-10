import type { SearchHit } from "@/components/admin/search-palette";
import { formatDate, formatQty, ORDER_STATUS_LABEL, type OrderStatus, type ProductRow } from "@/lib/admin";
import { productName } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { getAdmin, getAuthSupabase } from "@/lib/supabase/auth";

/** Globální hledání napříč adminem. Vrací nejvýš pár výsledků z každé skupiny. */
export async function GET(request: Request) {
  const admin = await getAdmin();
  if (!admin) return Response.json([], { status: 401 });
  const raw = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (raw.length < 2) return Response.json([]);
  // Znaky se zvláštním významem v PostgREST filtru pryč, jinak by hledání spadlo.
  const q = raw.replace(/[%,()"]/g, "").slice(0, 60);
  const like = `%${q}%`;
  const db = await getAuthSupabase();

  const [orders, customers, products, sales, receipts, tasks] = await Promise.all([
    db.from("orders").select("id, order_number, customer_name, total_czk, status, created_at").or(`order_number.ilike.${like},customer_name.ilike.${like},customer_phone.ilike.${like},customer_email.ilike.${like}`).order("created_at", { ascending: false }).limit(5),
    db.from("customers").select("id, name, email, phone, card_code").or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like},card_code.ilike.${like}`).limit(5),
    db.from("products").select("id, line, variant, unit, stock_qty, price_czk, ean").or(`variant.ilike.${like},ean.ilike.${like},slug.ilike.${like}`).limit(5),
    admin.role === "brigada" ? Promise.resolve({ data: [] }) : db.from("pos_sales").select("id, number, total_czk, created_at").ilike("number", like).order("created_at", { ascending: false }).limit(3),
    admin.role === "brigada" ? Promise.resolve({ data: [] }) : db.from("stock_receipts").select("id, number, supplier, doc_no, created_at").or(`number.ilike.${like},supplier.ilike.${like},doc_no.ilike.${like}`).order("created_at", { ascending: false }).limit(3),
    db.from("tasks").select("id, title, due_on").ilike("title", like).is("done_at", null).limit(3),
  ]);

  const hits: SearchHit[] = [];
  for (const o of (orders.data ?? []) as { id: string; order_number: string; customer_name: string; total_czk: number; status: OrderStatus; created_at: string }[])
    hits.push({ group: "Objednávka", title: `${o.order_number} · ${o.customer_name}`, detail: `${ORDER_STATUS_LABEL[o.status]} · ${formatPrice(o.total_czk)} · ${formatDate(o.created_at)}`, href: `/admin/objednavky/${o.id}` });
  for (const c of (customers.data ?? []) as { id: string; name: string; email: string | null; phone: string; card_code: string | null }[])
    hits.push({ group: "Zákazník", title: c.name || c.email || "(bez jména)", detail: [c.email, c.phone, c.card_code ? `karta ${c.card_code}` : ""].filter(Boolean).join(" · "), href: `/admin/zakaznici/${c.id}` });
  for (const p of (products.data ?? []) as Pick<ProductRow, "id" | "line" | "variant" | "unit" | "stock_qty" | "price_czk" | "ean">[])
    hits.push({ group: "Produkt", title: productName(p), detail: `${formatPrice(p.price_czk)} · ${p.stock_qty === null ? "sklad se neeviduje" : `skladem ${formatQty(p.stock_qty, p.unit)}`}${p.ean ? ` · EAN ${p.ean}` : ""}`, href: `/admin/produkty/${p.id}` });
  for (const s of (sales.data ?? []) as { id: string; number: string; total_czk: number; created_at: string }[]) hits.push({ group: "Účtenka", title: s.number, detail: `${formatPrice(s.total_czk)} · ${formatDate(s.created_at)}`, href: `/admin/kasa/uctenka/${s.id}` });
  for (const r of (receipts.data ?? []) as { id: string; number: string; supplier: string; doc_no: string; created_at: string }[]) hits.push({ group: "Příjemka", title: `${r.number}${r.supplier ? ` · ${r.supplier}` : ""}`, detail: `${r.doc_no ? `doklad ${r.doc_no} · ` : ""}${formatDate(r.created_at)}`, href: `/admin/sklad/prijemky#${r.id}` });
  for (const t of (tasks.data ?? []) as { id: string; title: string; due_on: string | null }[]) hits.push({ group: "Úkol", title: t.title, detail: t.due_on ? `do ${t.due_on}` : "bez termínu", href: "/admin/ukoly" });
  return Response.json(hits);
}
