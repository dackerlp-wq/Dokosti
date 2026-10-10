import type { SupabaseClient } from "@supabase/supabase-js";
import { SHIPPING_LABEL } from "@/lib/admin";

/** Pohledy a filtry seznamu objednávek, sdílené stránkou a exportem CSV. */
export const OPEN_STATUSES = ["nova", "potvrzena", "pripravena"];
export const ORDER_VIEWS = [
  { id: "vyrizeni", label: "K vyřízení" },
  { id: "dnes", label: "Dnes k výdeji a rozvozu" },
  { id: "nezaplacene", label: "Čeká na platbu" },
  { id: "hotove", label: "Hotové" },
  { id: "zrusene", label: "Zrušené" },
  { id: "vse", label: "Vše" },
] as const;
export type OrderView = (typeof ORDER_VIEWS)[number]["id"];
export type OrderListParams = { zobrazit?: string; q?: string; zpusob?: string; platba?: string; od?: string; do?: string };

/** Znaky se zvláštním významem ve filtru PostgREST pryč, jinak hledání spadne. */
export const cleanQuery = (s: string) => s.replace(/[%,()"]/g, "").trim();

export function buildOrdersQuery(db: SupabaseClient, sp: OrderListParams, today: string) {
  const view: OrderView = ORDER_VIEWS.find((v) => v.id === sp.zobrazit)?.id ?? "vyrizeni";
  let query = db.from("orders").select("*");
  if (view === "vyrizeni") query = query.in("status", OPEN_STATUSES).order("delivery_date", { ascending: true, nullsFirst: false }).order("created_at", { ascending: true });
  else if (view === "dnes") query = query.in("status", OPEN_STATUSES).eq("delivery_date", today).order("shipping_method").order("created_at");
  else if (view === "nezaplacene") query = query.in("status", OPEN_STATUSES).is("paid_at", null).neq("payment_method", "hotove").order("created_at");
  else if (view === "hotove") query = query.eq("status", "doruceno").order("created_at", { ascending: false });
  else if (view === "zrusene") query = query.eq("status", "zrusena").order("created_at", { ascending: false });
  else query = query.order("created_at", { ascending: false });
  const q = cleanQuery(sp.q ?? "");
  if (q) query = query.or(`order_number.ilike.%${q}%,customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%,customer_email.ilike.%${q}%`);
  if (sp.zpusob && sp.zpusob in SHIPPING_LABEL) query = query.eq("shipping_method", sp.zpusob);
  if (sp.platba === "zaplaceno") query = query.not("paid_at", "is", null);
  if (sp.platba === "nezaplaceno") query = query.is("paid_at", null);
  if (sp.od) query = query.gte("created_at", `${sp.od}T00:00:00`);
  if (sp.do) query = query.lte("created_at", `${sp.do}T23:59:59`);
  return { query, view };
}
