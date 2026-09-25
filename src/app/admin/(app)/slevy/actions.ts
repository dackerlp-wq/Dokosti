"use server";

import { redirect } from "next/navigation";
import { getAdmin, getAuthSupabase } from "@/lib/supabase/auth";

export type CouponState = { error: string } | null;

export async function saveCoupon(_prev: CouponState, fd: FormData): Promise<CouponState> {
  if (!(await getAdmin())) return { error: "Nejste přihlášeni." };
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
  redirect("/admin/slevy");
}

export async function deleteCoupon(fd: FormData) {
  if (!(await getAdmin())) throw new Error("Nepřihlášený uživatel");
  const db = await getAuthSupabase();
  await db.from("coupons").delete().eq("id", String(fd.get("id") ?? ""));
  redirect("/admin/slevy");
}
