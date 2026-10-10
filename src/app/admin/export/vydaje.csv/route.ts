import { EXPENSE_CATEGORY_LABEL, EXPENSE_SOURCE_LABEL, isMonth, type ExpenseRow } from "@/lib/admin";
import { getAuthSupabase, requireManager } from "@/lib/supabase/auth";

/** Výdaje pro účetní (CSV): měsíc nebo vše. */
export async function GET(request: Request) {
  await requireManager();
  const sp = new URL(request.url).searchParams;
  const month = sp.get("mesic");
  const db = await getAuthSupabase();
  let q = db.from("expenses").select("*").order("day");
  if (isMonth(month ?? undefined)) q = q.gte("day", `${month}-01`).lte("day", `${month}-31`);
  const { data } = await q.limit(10000);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Datum", "Popis", "Kategorie", "Dodavatel", "Doklad", "Zdroj", "Částka", "Splatnost", "Zaplaceno", "Poznámka"];
  const lines = ((data ?? []) as ExpenseRow[]).map((r) => [r.day, r.description, EXPENSE_CATEGORY_LABEL[r.category], r.supplier, r.document_no, EXPENSE_SOURCE_LABEL[r.source_type], String(Number(r.amount_czk)).replace(".", ","), r.due_on ?? "", r.paid_at ? r.paid_at.slice(0, 10) : "", r.note].map(esc).join(";"));
  const csv = "﻿" + [head.map(esc).join(";"), ...lines].join("\r\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="vydaje-${month ?? "vse"}.csv"` } });
}
