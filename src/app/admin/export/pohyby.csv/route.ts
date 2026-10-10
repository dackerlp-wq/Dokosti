import { STOCK_KIND_LABEL } from "@/lib/admin";
import { productName } from "@/lib/catalog";
import { loadMovementLog } from "@/lib/stock-data";
import { getAdmin, getAuthSupabase } from "@/lib/supabase/auth";

/** Export pohybů skladu: CSV se středníkem. Stejné filtry jako stránka Pohyby. */
export async function GET(request: Request) {
  const admin = await getAdmin();
  if (!admin) return new Response("Nepřihlášený uživatel", { status: 401 });
  const sp = new URL(request.url).searchParams;
  const db = await getAuthSupabase();
  const { rows, products } = await loadMovementLog(db, { q: sp.get("q") ?? undefined, typ: sp.get("typ") ?? undefined, od: sp.get("od") ?? undefined, do: sp.get("do") ?? undefined }, 0);

  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Datum", "Produkt", "Jednotka", "Pohyb", "Změna", ...(admin.isManager ? ["Nákupní cena / j."] : []), "Zdroj", "Poznámka"];
  const lines = rows.map((m) => {
    const p = products.get(m.product_id);
    return [
      new Date(m.created_at).toLocaleString("cs-CZ"),
      p ? productName(p) : "",
      p?.unit ?? "",
      STOCK_KIND_LABEL[m.kind],
      Number(m.qty).toLocaleString("cs-CZ", { maximumFractionDigits: 3, useGrouping: false }),
      ...(admin.isManager ? [m.unit_cost_czk ?? ""] : []),
      m.order_id ? "objednávka" : m.pos_sale_id ? "kasa" : m.receipt_id ? "příjemka" : "",
      m.note,
    ]
      .map(esc)
      .join(";");
  });
  const csv = "﻿" + [head.map(esc).join(";"), ...lines].join("\r\n");
  const od = sp.get("od");
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="pohyby-skladu${od ? "-od-" + od : ""}.csv"` },
  });
}
