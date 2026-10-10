"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { flashError, flashOk } from "@/lib/flash";
import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

/** Nový ruční úkol (kdokoli z týmu). */
export async function createTask(fd: FormData) {
  const admin = await requireAdmin("brigada");
  const title = String(fd.get("title") ?? "").trim().slice(0, 200);
  if (!title) return flashError("Napište, co je potřeba udělat.");
  const due = String(fd.get("due_on") ?? "").trim() || null;
  const assigned = String(fd.get("assigned_to") ?? "").trim() || null;
  const db = await getAuthSupabase();
  const { data, error } = await db.from("tasks").insert({ title, detail: String(fd.get("detail") ?? "").trim().slice(0, 1000), due_on: due, assigned_to: assigned, created_by: admin.id }).select("id").single();
  if (error) return flashError(`Úkol se nepodařilo uložit: ${error.message}`);
  await logActivity(db, admin, { kind: "ukol.zalozen", subject: "task", subjectId: data.id, text: `Nový úkol: ${title}` });
  revalidatePath("/admin");
  revalidatePath("/admin/ukoly");
  await flashOk("Úkol přidán.");
}

/** Odškrtnutí nebo vrácení úkolu. Zapíše se kdo a kdy. */
export async function toggleTask(fd: FormData) {
  const admin = await requireAdmin("brigada");
  const id = String(fd.get("id") ?? "");
  const done = fd.get("done") === "1";
  const db = await getAuthSupabase();
  const { data: task } = await db.from("tasks").select("title").eq("id", id).maybeSingle();
  const { error } = await db.from("tasks").update(done ? { done_at: new Date().toISOString(), done_by: admin.id } : { done_at: null, done_by: null }).eq("id", id);
  if (error) return flashError(error.message);
  await logActivity(db, admin, { kind: done ? "ukol.hotovo" : "ukol.vraceno", subject: "task", subjectId: id, text: `${done ? "Hotovo" : "Vráceno"}: ${task?.title ?? "úkol"}` });
  revalidatePath("/admin");
  revalidatePath("/admin/ukoly");
  await flashOk(done ? "Hotovo." : "Úkol vrácen mezi otevřené.");
}

export async function deleteTask(fd: FormData) {
  const admin = await requireAdmin("obsluha");
  const id = String(fd.get("id") ?? "");
  const db = await getAuthSupabase();
  const { data: task } = await db.from("tasks").select("title, kind").eq("id", id).maybeSingle();
  if (task?.kind === "auto") return flashError("Automatický úkol zmizí sám, až se vyřeší to, kvůli čemu vznikl.");
  const { error } = await db.from("tasks").delete().eq("id", id);
  if (error) return flashError(error.message);
  await logActivity(db, admin, { kind: "ukol.smazan", subject: "task", subjectId: id, text: `Smazán úkol: ${task?.title ?? ""}` });
  revalidatePath("/admin");
  revalidatePath("/admin/ukoly");
  await flashOk("Úkol smazán.");
}
