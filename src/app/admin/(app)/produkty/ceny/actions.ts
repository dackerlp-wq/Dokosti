"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { flashError, flashOk } from "@/lib/flash";
import { getAuthSupabase, requireManager } from "@/lib/supabase/auth";

/** Hromadná změna cen: položky už spočítané v náhledu, tady se jen zapíšou (jen správce). */
export async function applyPrices(fd: FormData) {
  const admin = await requireManager();
  let items: { id: string; price: number }[] = [];
  try {
    items = JSON.parse(String(fd.get("items") ?? "[]")) as { id: string; price: number }[];
  } catch {
    return flashError("Položky se nepodařilo přečíst.");
  }
  items = items.filter((i) => i.id && Number.isFinite(i.price) && i.price >= 0);
  if (items.length === 0) return flashError("Žádná změna k zapsání.");
  const db = await getAuthSupabase();
  const { data: before } = await db.from("products").select("id, variant, price_czk, original_price_czk").in("id", items.map((i) => i.id));
  const prev = new Map(((before ?? []) as { id: string; variant: string; price_czk: number; original_price_czk: number | null }[]).map((p) => [p.id, p]));
  let changed = 0;
  for (const i of items) {
    const p = prev.get(i.id);
    if (!p || p.price_czk === i.price) continue;
    // Produkt v akci: nová cena je nová „původní“, akce se po konci vrátí na ni.
    const { error } = await db.from("products").update(p.original_price_czk ? { original_price_czk: i.price } : { price_czk: i.price }).eq("id", i.id);
    if (error) return flashError(`${p.variant}: ${error.message}`);
    if (p.original_price_czk) await db.from("price_actions").update({ original_price_czk: i.price }).eq("product_id", i.id).eq("status", "aktivni");
    changed++;
  }
  await logActivity(db, admin, { kind: "produkty.ceny", subject: "product", subjectId: "", text: `Hromadná změna cen: ${changed} produktů (${String(fd.get("reason") ?? "").trim() || "bez důvodu"})`, data: { items } });
  revalidatePath("/", "layout");
  await flashOk(`Změněno ${changed} cen.`);
}
