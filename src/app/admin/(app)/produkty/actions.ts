"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { slugify } from "@/lib/admin";
import { isLineSlug, LINE_INFO, type Animal, type Storage } from "@/lib/catalog";
import { getAdmin, getAuthSupabase } from "@/lib/supabase/auth";

export type ProductFormState = { error: string } | null;

function num(v: FormDataEntryValue | null) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

/** Uloží produkt (nový nebo úprava). Vrací chybu, nebo přesměruje na seznam. */
export async function saveProduct(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  if (!(await getAdmin())) return { error: "Nejste přihlášeni." };

  const id = String(formData.get("id") ?? "");
  const line = String(formData.get("line") ?? "");
  const variant = String(formData.get("variant") ?? "").trim();
  const storage = String(formData.get("storage") ?? "") as Storage;
  const animals = formData.getAll("animals").map(String) as Animal[];
  const weight = num(formData.get("weight_grams"));
  const price = num(formData.get("price_czk"));
  const originalRaw = String(formData.get("original_price_czk") ?? "").trim();
  const original = originalRaw ? num(originalRaw) : null;

  if (!isLineSlug(line)) return { error: "Vyberte řadu." };
  if (!variant) return { error: "Doplňte druh masa nebo suroviny." };
  if (!["mrazene", "chlazene", "suche"].includes(storage)) return { error: "Vyberte skladování." };
  if (animals.length === 0) return { error: "Vyberte aspoň jedno zvíře." };
  if (!(weight > 0)) return { error: "Hmotnost musí být větší než 0." };
  if (!(price >= 0)) return { error: "Cena musí být číslo." };
  if (original !== null && !(original > price)) return { error: "Původní cena musí být vyšší než aktuální." };

  const row = {
    slug: String(formData.get("slug") ?? "").trim() || slugify(LINE_INFO[line].name, variant),
    line,
    variant,
    storage,
    animals,
    weight_grams: Math.round(weight),
    price_czk: Math.round(price),
    original_price_czk: original === null ? null : Math.round(original),
    producer: String(formData.get("producer") ?? "").trim(),
    intro: String(formData.get("intro") ?? "").trim(),
    composition: String(formData.get("composition") ?? "").trim(),
    storage_note: String(formData.get("storage_note") ?? "").trim(),
    dosage: String(formData.get("dosage") ?? "").trim(),
    image_url: String(formData.get("image_url") ?? "").trim() || null,
    sort_order: Math.round(num(formData.get("sort_order")) || 0),
    in_stock: formData.get("in_stock") === "on",
    is_new: formData.get("is_new") === "on",
    is_published: formData.get("is_published") === "on",
  };

  const db = await getAuthSupabase();
  const { error } = id
    ? await db.from("products").update(row).eq("id", id)
    : await db.from("products").insert(row);
  if (error) {
    if (error.code === "23505") return { error: `Adresa (slug) „${row.slug}“ už existuje. Zvolte jinou.` };
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/admin/produkty");
}

export async function deleteProduct(formData: FormData) {
  if (!(await getAdmin())) throw new Error("Nepřihlášený uživatel");
  const id = String(formData.get("id") ?? "");
  const db = await getAuthSupabase();
  await db.from("products").delete().eq("id", id);
  revalidatePath("/", "layout");
  redirect("/admin/produkty");
}
