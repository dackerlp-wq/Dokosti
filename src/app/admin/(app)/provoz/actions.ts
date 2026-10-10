"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { CHECKLIST_PERIOD_LABEL, DEVICE_KIND_LABEL, type ChecklistItem, type ChecklistPeriod, type DeviceKind } from "@/lib/admin";
import { flashError, flashOk } from "@/lib/flash";
import { getAuthSupabase, requireAdmin, requireManager } from "@/lib/supabase/auth";

/** Zápis teploty zařízení. Mimo rozsah vyžaduje poznámku, co se udělalo. */
export async function logTemperature(fd: FormData) {
  const admin = await requireAdmin("brigada");
  const deviceId = String(fd.get("device_id") ?? "");
  const value = Number(String(fd.get("value_c") ?? "").replace(",", "."));
  const note = String(fd.get("note") ?? "").trim().slice(0, 300);
  if (!deviceId || !Number.isFinite(value)) return flashError("Zadejte teplotu číslem.");
  const db = await getAuthSupabase();
  const { data: d } = await db.from("devices").select("name, min_c, max_c").eq("id", deviceId).maybeSingle();
  if (!d) return flashError("Zařízení nenalezeno.");
  const ok = value >= Number(d.min_c) && value <= Number(d.max_c);
  if (!ok && !note) return flashError(`${d.name}: ${value} °C je mimo rozsah ${Number(d.min_c)} až ${Number(d.max_c)} °C. Napište, co jste udělali (dovřít dveře, přeskládat, zavolat servis).`);
  const { error } = await db.from("temperature_log").insert({ device_id: deviceId, value_c: value, ok, note, created_by: admin.id, created_by_name: admin.name });
  if (error) return flashError(error.message);
  await logActivity(db, admin, { kind: ok ? "teplota.zapis" : "teplota.mimo", subject: "device", subjectId: deviceId, text: `${d.name}: ${value} °C${ok ? "" : " MIMO ROZSAH"}${note ? ` (${note})` : ""}` });
  revalidatePath("/admin/provoz");
  revalidatePath("/admin");
  await flashOk(ok ? `${d.name}: ${value} °C zapsáno.` : `${d.name}: ${value} °C zapsáno jako mimo rozsah, správce dostane upozornění.`);
}

/** Odškrtnutí položky checklistu za období (den, týden, měsíc, nebo zaškolení zaměstnance). */
export async function toggleChecklistItem(fd: FormData) {
  const admin = await requireAdmin("brigada");
  const checklistId = String(fd.get("checklist_id") ?? "");
  const periodKey = String(fd.get("period_key") ?? "");
  const itemId = String(fd.get("item_id") ?? "");
  const done = fd.get("done") === "1";
  const back = String(fd.get("back") ?? "");
  if (!checklistId || !periodKey || !itemId) return;
  const db = await getAuthSupabase();
  const { data: run } = await db.from("checklist_runs").select("id, done").eq("checklist_id", checklistId).eq("period_key", periodKey).maybeSingle();
  const current = (run?.done ?? {}) as Record<string, { by: string; at: string }>;
  const next = { ...current };
  if (done) next[itemId] = { by: admin.name, at: new Date().toISOString() };
  else delete next[itemId];
  const { error } = run ? await db.from("checklist_runs").update({ done: next }).eq("id", run.id) : await db.from("checklist_runs").insert({ checklist_id: checklistId, period_key: periodKey, done: next });
  if (error) return flashError(error.message);
  const { data: cl } = await db.from("checklists").select("name, items").eq("id", checklistId).maybeSingle();
  const item = ((cl?.items ?? []) as ChecklistItem[]).find((i) => i.id === itemId);
  await logActivity(db, admin, { kind: done ? "checklist.hotovo" : "checklist.vraceno", subject: "checklist", subjectId: checklistId, text: `${cl?.name ?? "Checklist"}: ${item?.text ?? itemId} ${done ? "hotovo" : "vráceno"}` });
  revalidatePath("/admin/provoz");
  revalidatePath("/admin");
  if (back.startsWith("/admin/")) {
    revalidatePath(back.split("?")[0]);
    redirect(back);
  }
}

/** Zařízení (mrazák, chladnička) s povoleným rozsahem teplot (jen správce). */
export async function saveDevice(fd: FormData) {
  const admin = await requireManager();
  const id = String(fd.get("id") ?? "");
  const name = String(fd.get("name") ?? "").trim().slice(0, 80);
  const kind = String(fd.get("kind") ?? "mrazak") as DeviceKind;
  const min = Number(String(fd.get("min_c") ?? "").replace(",", "."));
  const max = Number(String(fd.get("max_c") ?? "").replace(",", "."));
  if (!name || !(kind in DEVICE_KIND_LABEL) || !Number.isFinite(min) || !Number.isFinite(max) || min > max) return flashError("Doplňte název a rozsah teplot (min ≤ max).");
  const row = { name, kind, min_c: min, max_c: max, active: fd.get("active") !== "off", sort_order: Math.round(Number(fd.get("sort_order")) || 0) };
  const db = await getAuthSupabase();
  const { error } = id ? await db.from("devices").update(row).eq("id", id) : await db.from("devices").insert(row);
  if (error) return flashError(error.message);
  await logActivity(db, admin, { kind: id ? "zarizeni.upraveno" : "zarizeni.zalozeno", subject: "device", subjectId: id, text: `${id ? "Upraveno" : "Založeno"} zařízení ${name} (${min} až ${max} °C)` });
  revalidatePath("/admin/provoz");
  revalidatePath("/admin/provoz/zarizeni");
  await flashOk(`${name} uloženo.`);
}

/** Checklist: název, období a položky po řádcích (jen správce). */
export async function saveChecklist(fd: FormData) {
  const admin = await requireManager();
  const id = String(fd.get("id") ?? "");
  const name = String(fd.get("name") ?? "").trim().slice(0, 120);
  const period = String(fd.get("period") ?? "denne") as ChecklistPeriod;
  const lines = String(fd.get("items") ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 40);
  if (!name || !(period in CHECKLIST_PERIOD_LABEL) || lines.length === 0) return flashError("Doplňte název a aspoň jednu položku.");
  const db = await getAuthSupabase();
  // Zachovat id položek, které už existují (kvůli odškrtnutým záznamům), nové dostanou id z textu.
  const { data: prev } = id ? await db.from("checklists").select("items").eq("id", id).maybeSingle() : { data: null };
  const old = ((prev?.items ?? []) as ChecklistItem[]);
  const items: ChecklistItem[] = lines.map((text, i) => {
    const found = old.find((o) => o.text === text);
    return { id: found?.id ?? `${text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").slice(0, 24)}-${i}`, text };
  });
  const row = { name, period, items, active: fd.get("active") !== "off", sort_order: Math.round(Number(fd.get("sort_order")) || 0) };
  const { error } = id ? await db.from("checklists").update(row).eq("id", id) : await db.from("checklists").insert(row);
  if (error) return flashError(error.message);
  await logActivity(db, admin, { kind: id ? "checklist.upraven" : "checklist.zalozen", subject: "checklist", subjectId: id, text: `${id ? "Upraven" : "Založen"} checklist ${name} (${items.length} položek)` });
  revalidatePath("/admin/provoz");
  revalidatePath("/admin/provoz/checklisty");
  await flashOk(`Checklist ${name} uložen.`);
}
