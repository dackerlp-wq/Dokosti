"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { ATTENDANCE_KIND_LABEL, type AttendanceKind } from "@/lib/admin";
import { flashError, flashOk } from "@/lib/flash";
import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

/**
 * Ruční záznam docházky: práce mimo kasu (rozvoz, úklid), dovolená, nemoc, svátek.
 * Obsluha zapisuje jen sobě, správce komukoli.
 */
export async function addAttendance(fd: FormData) {
  const admin = await requireAdmin("brigada");
  const db = await getAuthSupabase();
  const kind = String(fd.get("kind") ?? "prace") as AttendanceKind;
  const day = String(fd.get("day") ?? "");
  const from = String(fd.get("from") ?? "");
  const to = String(fd.get("to") ?? "");
  const hoursRaw = String(fd.get("hours") ?? "").trim().replace(",", ".");
  const note = String(fd.get("note") ?? "").trim().slice(0, 300);
  if (!(kind in ATTENDANCE_KIND_LABEL) || !day) return flashError("Vyberte den a druh.");
  let employeeId = String(fd.get("employee_id") ?? "").trim() || null;
  let userId: string | null = admin.id;
  if (admin.isManager && employeeId) {
    const { data: e } = await db.from("employees").select("user_id").eq("id", employeeId).maybeSingle();
    userId = e?.user_id ?? null;
  } else {
    const { data: me } = await db.from("employees").select("id").eq("user_id", admin.id).maybeSingle();
    employeeId = me?.id ?? null;
  }
  const started = kind === "prace" && from ? `${day}T${from}:00` : null;
  const ended = kind === "prace" && to ? `${day}T${to}:00` : null;
  const hours = hoursRaw ? Number(hoursRaw) : null;
  if (kind === "prace" && !(started && ended) && !(hours && hours > 0)) return flashError("U práce zadejte od–do, nebo počet hodin.");
  if (kind !== "prace" && !(hours && hours > 0)) return flashError(`U položky ${ATTENDANCE_KIND_LABEL[kind].toLowerCase()} zadejte počet hodin (např. 8).`);
  const { error } = await db.from("attendance").insert({ employee_id: employeeId, user_id: userId, day, started_at: started, ended_at: ended, hours: started && ended ? null : hours, kind, source: "rucne", note, created_by: admin.id });
  if (error) return flashError(`Nepodařilo se uložit: ${error.message}`);
  await logActivity(db, admin, { kind: "dochazka.rucne", subject: "attendance", subjectId: employeeId ?? "", text: `Docházka ${day}: ${ATTENDANCE_KIND_LABEL[kind]}${hours ? ` ${hours} h` : from && to ? ` ${from}–${to}` : ""}${note ? ` (${note})` : ""}` });
  revalidatePath("/admin/dochazka");
  revalidatePath("/admin/zamestnanci");
  await flashOk("Záznam uložen.");
}

export async function deleteAttendance(fd: FormData) {
  const admin = await requireAdmin("spravce");
  const id = String(fd.get("id") ?? "");
  const db = await getAuthSupabase();
  const { data: r } = await db.from("attendance").select("day, kind, source").eq("id", id).maybeSingle();
  if (!r) return flashError("Záznam nenalezen.");
  if (r.source === "kasa") return flashError("Záznam ze směny v kase nejde smazat, patří k uzávěrce. Opravte ho ručním záznamem s poznámkou.");
  const { error } = await db.from("attendance").delete().eq("id", id);
  if (error) return flashError(error.message);
  await logActivity(db, admin, { kind: "dochazka.smazano", subject: "attendance", subjectId: "", text: `Smazán ruční záznam docházky ${r.day} (${r.kind})` });
  revalidatePath("/admin/dochazka");
  await flashOk("Záznam smazán.");
}
