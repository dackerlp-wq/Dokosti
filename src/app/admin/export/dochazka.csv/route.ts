import { ATTENDANCE_KIND_LABEL, type AttendanceRow, type EmployeeRow } from "@/lib/admin";
import { getAuthSupabase, requireManager } from "@/lib/supabase/auth";

/** Podklady pro mzdy: docházka za měsíc po dnech (CSV se středníkem). */
export async function GET(request: Request) {
  await requireManager();
  const sp = new URL(request.url).searchParams;
  const month = sp.get("mesic") && /^\d{4}-\d{2}$/.test(sp.get("mesic")!) ? sp.get("mesic")! : new Date().toISOString().slice(0, 7);
  const db = await getAuthSupabase();
  const [{ data: emps }, { data: rows }] = await Promise.all([db.from("employees").select("*"), db.from("attendance").select("*").gte("day", `${month}-01`).lte("day", `${month}-31`).order("day").order("started_at")]);
  const byId = new Map(((emps ?? []) as EmployeeRow[]).map((e) => [e.id, e]));
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const time = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString("cs-CZ", { hour: "numeric", minute: "2-digit" }) : "");
  const head = ["Měsíc", "Zaměstnanec", "Smlouva", "Sazba Kč/h", "Den", "Druh", "Od", "Do", "Pauza min", "Hodin", "Zdroj", "Poznámka"];
  const lines = ((rows ?? []) as AttendanceRow[]).map((r) => {
    const e = r.employee_id ? byId.get(r.employee_id) : undefined;
    return [month, e?.name ?? "(nepropojeno)", e?.contract_type ?? "", e?.hourly_rate_czk ?? "", r.day, ATTENDANCE_KIND_LABEL[r.kind], time(r.started_at), time(r.ended_at), r.break_minutes, r.hours !== null ? String(r.hours).replace(".", ",") : "", r.source, r.note].map(esc).join(";");
  });
  const csv = "﻿" + [head.map(esc).join(";"), ...lines].join("\r\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="dochazka-${month}.csv"` } });
}
