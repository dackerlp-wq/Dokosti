import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

/** Export teplotního deníku pro kontrolu (CSV, poslední rok nebo období od–do). */
export async function GET(request: Request) {
  await requireAdmin();
  const sp = new URL(request.url).searchParams;
  const od = sp.get("od") ?? new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
  const doo = sp.get("do");
  const db = await getAuthSupabase();
  let q = db.from("temperature_log").select("measured_at, value_c, ok, note, created_by_name, devices(name, min_c, max_c)").gte("measured_at", `${od}T00:00:00`).order("measured_at");
  if (doo) q = q.lte("measured_at", `${doo}T23:59:59`);
  const { data } = await q.limit(20000);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Datum a čas", "Zařízení", "Rozsah", "Teplota °C", "V pořádku", "Poznámka", "Zapsal"];
  const lines = ((data ?? []) as unknown as { measured_at: string; value_c: number; ok: boolean; note: string; created_by_name: string; devices: { name: string; min_c: number; max_c: number } | null }[]).map((r) =>
    [new Date(r.measured_at).toLocaleString("cs-CZ"), r.devices?.name ?? "", r.devices ? `${r.devices.min_c} až ${r.devices.max_c}` : "", String(r.value_c).replace(".", ","), r.ok ? "ano" : "NE", r.note, r.created_by_name].map(esc).join(";"),
  );
  const csv = "﻿" + [head.map(esc).join(";"), ...lines].join("\r\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="teploty-${od}.csv"` } });
}
