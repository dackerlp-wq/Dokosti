"use server";

import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { flashError, flashOk } from "@/lib/flash";
import { getAdmin, getAuthSupabase, requireManager } from "@/lib/supabase/auth";

export type CouponState = { error: string } | null;

export async function saveCoupon(_prev: CouponState, fd: FormData): Promise<CouponState> {
  if (!(await getAdmin())?.isManager) return { error: "Slevové kódy spravuje jen správce." };
  const id = String(fd.get("id") ?? "");
  const code = String(fd.get("code") ?? "").trim().toUpperCase().replace(/\s+/g, "");
  const type = String(fd.get("type") ?? "");
  const value = Math.round(Number(fd.get("value")));
  const maxUsesRaw = String(fd.get("max_uses") ?? "").trim();
  if (!/^[A-Z0-9-]{3,30}$/.test(code)) return { error: "Kód: 3–30 znaků, jen písmena, číslice a pomlčka." };
  if (type !== "percent" && type !== "amount") return { error: "Vyberte typ slevy." };
  if (!(value > 0) || (type === "percent" && value > 100)) return { error: "Hodnota slevy není v pořádku." };

  const row = {
    code,
    type,
    value,
    min_order_czk: Math.max(0, Math.round(Number(fd.get("min_order_czk")) || 0)),
    valid_from: String(fd.get("valid_from") ?? "") || null,
    valid_to: String(fd.get("valid_to") ?? "") || null,
    max_uses: maxUsesRaw ? Math.max(1, Math.round(Number(maxUsesRaw))) : null,
    active: fd.get("active") === "on",
    note: String(fd.get("note") ?? "").trim(),
  };
  const db = await getAuthSupabase();
  const { error } = id ? await db.from("coupons").update(row).eq("id", id) : await db.from("coupons").insert(row);
  if (error) return { error: error.code === "23505" ? `Kód ${code} už existuje.` : error.message };
  const admin = (await getAdmin())!;
  await logActivity(db, admin, { kind: id ? "sleva.upravena" : "sleva.zalozena", subject: "coupon", subjectId: id, text: `${id ? "Upraven" : "Založen"} slevový kód ${code} (${type === "percent" ? `${value} %` : `${value} Kč`}${row.active ? "" : ", vypnutý"})` });
  await flashOk(`Kód ${code} uložen.`);
  redirect("/admin/slevy");
}

export async function deleteCoupon(fd: FormData) {
  const admin = await requireManager();
  const db = await getAuthSupabase();
  const id = String(fd.get("id") ?? "");
  const { data: c } = await db.from("coupons").select("code, used_count").eq("id", id).maybeSingle();
  if (c && c.used_count > 0) return flashError(`Kód ${c.code} už byl použit, místo smazání ho vypněte (zůstane v historii objednávek).`);
  const { error } = await db.from("coupons").delete().eq("id", id);
  if (error) return flashError(error.message);
  await logActivity(db, admin, { kind: "sleva.smazana", subject: "coupon", subjectId: id, text: `Smazán slevový kód ${c?.code ?? ""}` });
  await flashOk("Kód smazán.");
  redirect("/admin/slevy");
}
