"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { flashError, flashOk } from "@/lib/flash";
import { getAuthSupabase, requireManager } from "@/lib/supabase/auth";

function voucherCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const s = [...bytes].map((b) => chars[b % chars.length]).join("");
  return `DK-${s.slice(0, 4)}-${s.slice(4)}`;
}

/** Vystaví dárkový poukaz: slevový kód na částku, jedno použití, platnost rok. Prodej se zapíše jako příjem (sold_czk). */
export async function issueVoucher(fd: FormData) {
  const admin = await requireManager();
  const value = Math.round(Number(fd.get("value")) || 0);
  if (!(value >= 100 && value <= 20000)) return flashError("Hodnota poukazu musí být 100 až 20 000 Kč.");
  const recipient = String(fd.get("recipient") ?? "").trim().slice(0, 120);
  const note = String(fd.get("note") ?? "").trim().slice(0, 300);
  const validTo = String(fd.get("valid_to") ?? "") || new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);
  const sold = fd.get("sold") === "1" ? Math.round(Number(fd.get("sold_czk")) || value) : null;
  const db = await getAuthSupabase();
  let code = voucherCode();
  for (let i = 0; i < 3; i++) {
    const { data: dup } = await db.from("coupons").select("id").eq("code", code).maybeSingle();
    if (!dup) break;
    code = voucherCode();
  }
  const { data, error } = await db.from("coupons").insert({ code, type: "amount", value, min_order_czk: 0, valid_to: validTo, max_uses: 1, active: true, note, kind: "poukaz", recipient, issued_by: admin.id, sold_czk: sold }).select("id").single();
  if (error || !data) return flashError(`Poukaz se nepodařilo vystavit: ${error?.message ?? ""}`);
  await logActivity(db, admin, { kind: "poukaz.vystaven", subject: "coupon", subjectId: data.id, text: `Dárkový poukaz ${code} na ${value} Kč${recipient ? ` pro ${recipient}` : ""}${sold ? `, prodán za ${sold} Kč` : ", zdarma (dar, reklamace)"}` });
  revalidatePath("/admin/poukazy");
  await flashOk(`Poukaz ${code} vystaven.`);
  redirect(`/admin/poukazy/${data.id}`);
}

export async function cancelVoucher(fd: FormData) {
  const admin = await requireManager();
  const id = String(fd.get("id") ?? "");
  const db = await getAuthSupabase();
  const { data: v } = await db.from("coupons").select("code, used_count").eq("id", id).eq("kind", "poukaz").maybeSingle();
  if (!v) return flashError("Poukaz nenalezen.");
  if (v.used_count > 0) return flashError("Poukaz už byl uplatněn, nejde zneplatnit.");
  const { error } = await db.from("coupons").update({ active: false }).eq("id", id);
  if (error) return flashError(error.message);
  await logActivity(db, admin, { kind: "poukaz.zneplatnen", subject: "coupon", subjectId: id, text: `Poukaz ${v.code} zneplatněn: ${String(fd.get("reason") ?? "").trim()}` });
  revalidatePath("/admin/poukazy");
  revalidatePath(`/admin/poukazy/${id}`);
  await flashOk("Poukaz zneplatněn.");
}
