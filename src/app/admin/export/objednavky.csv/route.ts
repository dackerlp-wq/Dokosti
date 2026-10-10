import { ORDER_STATUS_LABEL, PAYMENT_LABEL, SHIPPING_LABEL, type OrderRow } from "@/lib/admin";
import { buildOrdersQuery } from "@/lib/orders-query";
import { getAdmin, getAuthSupabase } from "@/lib/supabase/auth";

/** Export objednávek pro účetní: CSV se středníkem (otevře se v Excelu s českým nastavením). */
export async function GET(request: Request) {
  if (!(await getAdmin())) return new Response("Nepřihlášený uživatel", { status: 401 });
  const sp = new URL(request.url).searchParams;
  const od = sp.get("od");
  const db = await getAuthSupabase();
  // Stejné pohledy a filtry jako seznam objednávek; bez `zobrazit` všechno v období (pro účetní).
  const { query } = buildOrdersQuery(db, { zobrazit: sp.get("zobrazit") ?? "vse", q: sp.get("q") ?? undefined, zpusob: sp.get("zpusob") ?? undefined, platba: sp.get("platba") ?? undefined, od: od ?? undefined, do: sp.get("do") ?? undefined }, new Date().toISOString().slice(0, 10));
  const { data } = await query.limit(5000);
  const rows = (data ?? []) as OrderRow[];

  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Číslo objednávky", "Doklad", "Datum", "Stav", "Zákazník", "E-mail", "Telefon", "Dodání", "Termín", "Platba", "Zaplaceno", "Zboží Kč", "Sleva Kč", "Doprava Kč", "Celkem Kč"];
  const lines = rows.map((o) =>
    [
      o.order_number,
      o.invoice_number ?? "",
      new Date(o.created_at).toLocaleString("cs-CZ"),
      ORDER_STATUS_LABEL[o.status],
      o.customer_name,
      o.customer_email,
      o.customer_phone,
      SHIPPING_LABEL[o.shipping_method],
      o.delivery_date ?? "",
      PAYMENT_LABEL[o.payment_method],
      o.paid_at ? new Date(o.paid_at).toLocaleDateString("cs-CZ") : "",
      o.subtotal_czk,
      o.discount_czk + o.points_discount_czk,
      o.shipping_czk,
      o.total_czk,
    ]
      .map(esc)
      .join(";"),
  );
  const csv = "﻿" + [head.map(esc).join(";"), ...lines].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="objednavky${od ? "-od-" + od : ""}.csv"`,
    },
  });
}
