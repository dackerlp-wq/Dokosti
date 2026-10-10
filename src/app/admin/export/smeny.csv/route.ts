import type { ShiftRow } from "@/lib/pos";
import { getAuthSupabase, requireManager } from "@/lib/supabase/auth";

/** Uzávěrky směn za měsíc pro účetní (CSV se středníkem). */
export async function GET(request: Request) {
  await requireManager();
  const sp = new URL(request.url).searchParams;
  const month = sp.get("mesic") && /^\d{4}-\d{2}$/.test(sp.get("mesic")!) ? sp.get("mesic")! : new Date().toISOString().slice(0, 7);
  const db = await getAuthSupabase();
  const [{ data }, { data: admins }] = await Promise.all([db.from("pos_shifts").select("*").gte("opened_at", `${month}-01T00:00:00`).lte("opened_at", `${month}-31T23:59:59`).order("opened_at"), db.from("admins").select("user_id, name")]);
  const names = new Map(((admins ?? []) as { user_id: string; name: string }[]).map((a) => [a.user_id, a.name]));
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Otevřeno", "Uzavřeno", "Kdo", "Počáteční hotovost", "Účtenek", "Storn", "Hotově", "Kartou", "QR", "Očekávaná hotovost", "Napočítáno", "Rozdíl", "Vzkaz"];
  const lines = ((data ?? []) as (ShiftRow & { opened_by?: string })[]).map((s) =>
    [new Date(s.opened_at).toLocaleString("cs-CZ"), s.closed_at ? new Date(s.closed_at).toLocaleString("cs-CZ") : "", names.get(s.opened_by ?? "") ?? "", s.opening_cash_czk, s.sales_count, s.cancelled_count, s.cash_sales_czk, s.card_sales_czk, s.qr_sales_czk, s.expected_cash_czk ?? "", s.closing_cash_czk ?? "", s.closed_at ? (s.closing_cash_czk ?? 0) - (s.expected_cash_czk ?? 0) : "", s.note].map(esc).join(";"),
  );
  const csv = "﻿" + [head.map(esc).join(";"), ...lines].join("\r\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="smeny-${month}.csv"` } });
}
