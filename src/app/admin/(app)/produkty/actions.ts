"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { slugify } from "@/lib/admin";
import { isLineSlug, type Animal, type Storage, isMeatKey } from "@/lib/catalog";
import { logActivity } from "@/lib/activity";
import { flashError, flashOk } from "@/lib/flash";
import { getAdmin, getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export type ProductFormState = { error: string } | null;

function num(v: FormDataEntryValue | null) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

/** Nepovinné číslo z etikety: prázdné = null. */
function optNum(v: FormDataEntryValue | null, max = Infinity) {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  const n = num(raw);
  return Number.isFinite(n) && n >= 0 && n <= max ? Math.round(n * 10) / 10 : NaN;
}

/** Uloží produkt (nový nebo úprava). Vrací chybu, nebo přesměruje na seznam. */
export async function saveProduct(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const admin = await getAdmin();
  if (!admin) return { error: "Nejste přihlášeni." };

  const id = String(formData.get("id") ?? "");
  const unit = String(formData.get("unit") ?? "ks") === "kg" ? "kg" : "ks";
  const ean = String(formData.get("ean") ?? "").replace(/\s+/g, "");
  if (ean && !/^\d{8,14}$/.test(ean)) return { error: "EAN musí mít 8 až 14 číslic." };
  const line = String(formData.get("line") ?? "");
  const variant = String(formData.get("variant") ?? "").trim();
  const storage = String(formData.get("storage") ?? "") as Storage;
  const animals = formData.getAll("animals").map(String) as Animal[];
  const meats = formData.getAll("meats").map(String).filter(isMeatKey);
  const weight = num(formData.get("weight_grams"));
  const price = num(formData.get("price_czk"));
  const originalRaw = String(formData.get("original_price_czk") ?? "").trim();
  const original = originalRaw ? num(originalRaw) : null;
  const storeRaw = String(formData.get("store_price_czk") ?? "").trim();
  const store = storeRaw ? num(storeRaw) : null;

  if (!isLineSlug(line)) return { error: "Vyberte řadu." };
  if (!variant) return { error: "Doplňte druh masa nebo suroviny." };
  if (!["mrazene", "chlazene", "suche"].includes(storage)) return { error: "Vyberte skladování." };
  if (animals.length === 0) return { error: "Vyberte aspoň jedno zvíře." };
  if (!(weight > 0)) return { error: "Hmotnost musí být větší než 0." };
  if (!(price >= 0)) return { error: "Cena musí být číslo." };
  if (store !== null && !(store > 0)) return { error: "Cena pro prodejnu musí být větší než 0, nebo ji nechte prázdnou." };
  if (original !== null && !(original > price)) return { error: "Původní cena musí být vyšší než aktuální." };

  const nutrition = {
    kcal_per_100g: optNum(formData.get("kcal_per_100g")),
    bone_pct: optNum(formData.get("bone_pct"), 100),
    organ_pct: optNum(formData.get("organ_pct"), 100),
    liver_pct: optNum(formData.get("liver_pct"), 100),
    taurine_mg_per_kg: optNum(formData.get("taurine_mg_per_kg")),
  };
  if (Object.values(nutrition).some((n) => Number.isNaN(n))) return { error: "Údaje z etikety musí být čísla, procenta 0–100." };
  const boneClass = String(formData.get("bone_class") ?? "");

  const row = {
    slug: String(formData.get("slug") ?? "").trim() || slugify(line, variant),
    line,
    variant,
    storage,
    animals,
    meats,
    weight_grams: Math.round(weight),
    price_czk: Math.round(price),
    original_price_czk: original === null ? null : Math.round(original),
    store_price_czk: store === null ? null : Math.round(store),
    producer: String(formData.get("producer") ?? "").trim(),
    intro: String(formData.get("intro") ?? "").trim(),
    composition: String(formData.get("composition") ?? "").trim(),
    storage_note: String(formData.get("storage_note") ?? "").trim(),
    dosage: String(formData.get("dosage") ?? "").trim(),
    image_url: String(formData.get("image_url") ?? "").trim() || null,
    upsell_slugs: formData.getAll("upsell").map(String).filter(Boolean),
    crosssell_slugs: formData.getAll("crosssell").map(String).filter(Boolean),
    sort_order: Math.round(num(formData.get("sort_order")) || 0),
    stock_qty: String(formData.get("stock_qty") ?? "").trim() === "" ? null : Math.max(0, unit === "kg" ? Math.round(num(formData.get("stock_qty")) * 1000) / 1000 : Math.round(num(formData.get("stock_qty")))),
    unit,
    ean: ean || null,
    supplier_id: String(formData.get("supplier_id") ?? "").trim() || null,
    pack_size: String(formData.get("pack_size") ?? "").trim() === "" ? null : Math.max(0, Math.round(num(formData.get("pack_size")) * 1000) / 1000) || null,
    vat_rate: [0, 12, 21].includes(Math.round(num(formData.get("vat_rate")))) ? Math.round(num(formData.get("vat_rate"))) : 12,
    ...(admin.isManager && formData.has("purchase_price_czk")
      ? { purchase_price_czk: String(formData.get("purchase_price_czk") ?? "").trim() === "" ? null : Math.max(0, Math.round(num(formData.get("purchase_price_czk")) * 100) / 100) }
      : {}),
    low_stock_threshold: Math.max(0, Math.round(num(formData.get("low_stock_threshold")) || 0)),
    reco_boost: Math.max(-2, Math.min(2, Math.round(Number(formData.get("reco_boost") ?? 0)) || 0)),
    in_stock: formData.get("in_stock") === "on",
    is_new: formData.get("is_new") === "on",
    is_published: formData.get("is_published") === "on",
    ...nutrition,
    bone_class: boneClass === "jedla" || boneClass === "rekreacni" ? boneClass : null,
    is_complete: formData.get("is_complete") === "on",
  };

  if (row.stock_qty === 0) row.in_stock = false;

  const db = await getAuthSupabase();
  const { error } = id
    ? await db.from("products").update(row).eq("id", id)
    : await db.from("products").insert(row);
  if (error) {
    if (error.code === "23505") return { error: error.message.includes("ean") ? `EAN ${ean} už má jiný produkt.` : `Adresa (slug) „${row.slug}“ už existuje. Zvolte jinou.` };
    return { error: error.message };
  }

  await logActivity(db, admin, { kind: id ? "produkt.ulozen" : "produkt.zalozen", subject: "product", subjectId: id || "", text: `${id ? "Upraven" : "Založen"} produkt ${variant} (${row.price_czk} Kč${row.is_published ? "" : ", nezveřejněno"})` });
  revalidatePath("/", "layout");
  await flashOk(id ? `Produkt ${variant} uložen.` : `Produkt ${variant} založen.`);
  redirect("/admin/produkty");
}

export async function deleteProduct(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const db = await getAuthSupabase();
  const { data: p } = await db.from("products").select("variant").eq("id", id).maybeSingle();
  const { error } = await db.from("products").delete().eq("id", id);
  if (error) {
    await flashError(error.code === "23503" ? "Produkt má objednávky nebo příjemky, nejde smazat. Místo toho ho skryjte z webu." : `Nepodařilo se smazat: ${error.message}`);
    return;
  }
  await logActivity(db, admin, { kind: "produkt.smazan", subject: "product", subjectId: id, text: `Smazán produkt ${p?.variant ?? ""}` });
  revalidatePath("/", "layout");
  await flashOk("Produkt smazán.");
  redirect("/admin/produkty");
}
