import { ORDER_STATUS_LABEL, PAYMENT_LABEL, SHIPPING_LABEL, type OrderRow } from "@/lib/admin";
import { getAdmin, getAuthSupabase } from "@/lib/supabase/auth";

/** Export objednávek pro účetní: CSV se středníkem (otevře se v Excelu s českým nastavením). */
export async function GET(request: Request) {
  if (!(await getAdmin())) return new Response("Nepřihlášený uživatel", { status: 401 });
  const url = new URL(request.url);
  const od = url.searchParams.get("od");
  const doo = url.searchParams.get("do");

  const db = await getAuthSupabase();
  let q = db.from("orders").select("*").order("created_at");
  if (od) q = q.gte("created_at", `${od}T00:00:00`);
  if (doo) q = q.lte("created_at", `${doo}T23:59:59`);
  const { data } = await q;
  const rows = (data ?? []) as OrderRow[];

  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Číslo objednávky", "Doklad", "Datum", "Stav", "Zákazník", "E-mail", "Telefon", "Dodání", "Platba", "Zboží Kč", "Sleva Kč", "Doprava Kč", "Celkem Kč"];
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
      PAYMENT_LABEL[o.payment_method],
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
