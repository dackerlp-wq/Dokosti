"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { formatDay } from "@/lib/admin";
import { flashError, flashOk } from "@/lib/flash";
import { getAuthSupabase, requireManager } from "@/lib/supabase/auth";

/** Naplánuje směnu (jeden den, od–do). Opakování: zaškrtnuté dny v týdnu až do zadaného data. */
export async function addShiftPlan(fd: FormData) {
  const admin = await requireManager();
  const employeeId = String(fd.get("employee_id") ?? "");
  const day = String(fd.get("day") ?? "");
  const starts = String(fd.get("starts") ?? "08:00");
  const ends = String(fd.get("ends") ?? "16:00");
  const until = String(fd.get("until") ?? "");
  const weekdays = fd.getAll("weekdays").map(Number).filter((d) => d >= 0 && d <= 6);
  const note = String(fd.get("note") ?? "").trim().slice(0, 200);
  if (!employeeId || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !(ends > starts)) return flashError("Vyberte člověka, den a čas od–do.");
  const db = await getAuthSupabase();
  const { data: e } = await db.from("employees").select("name").eq("id", employeeId).maybeSingle();
  const days: string[] = [];
  if (until && weekdays.length) {
    const d = new Date(`${day}T12:00:00`);
    const end = new Date(`${until}T12:00:00`);
    for (let i = 0; i < 120 && d <= end; i++) {
      if (weekdays.includes(d.getDay())) days.push(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() + 1);
    }
  } else days.push(day);
  if (days.length === 0) return flashError("Podle zadání nevychází žádný den.");
  const { error } = await db.from("shift_plans").insert(days.map((dd) => ({ employee_id: employeeId, day: dd, starts, ends, note, created_by: admin.id })));
  if (error) return flashError(error.message);
  await logActivity(db, admin, { kind: "plan.smena", subject: "shift", subjectId: "", text: `${e?.name ?? "Zaměstnanec"}: naplánováno ${days.length === 1 ? formatDay(days[0]) : `${days.length} směn do ${formatDay(days[days.length - 1])}`} ${starts}–${ends}` });
  revalidatePath("/admin/plan-smen");
  revalidatePath("/admin/kalendar");
  revalidatePath("/admin");
  await flashOk(days.length === 1 ? "Směna naplánována." : `Naplánováno ${days.length} směn.`);
}

export async function removeShiftPlan(fd: FormData) {
  const admin = await requireManager();
  const id = String(fd.get("id") ?? "");
  const db = await getAuthSupabase();
  const { data: p } = await db.from("shift_plans").select("day, starts, ends, employees(name)").eq("id", id).maybeSingle();
  const { error } = await db.from("shift_plans").delete().eq("id", id);
  if (error) return flashError(error.message);
  const row = p as unknown as { day: string; starts: string; ends: string; employees: { name: string } | null } | null;
  await logActivity(db, admin, { kind: "plan.zruseno", subject: "shift", subjectId: "", text: `${row?.employees?.name ?? "Zaměstnanec"}: zrušena plánovaná směna ${row ? formatDay(row.day) : ""} ${row?.starts.slice(0, 5) ?? ""}–${row?.ends.slice(0, 5) ?? ""}` });
  revalidatePath("/admin/plan-smen");
  revalidatePath("/admin/kalendar");
  revalidatePath("/admin");
  await flashOk("Směna z plánu odebrána.");
}
