import { cache } from "react";
import { PRODUCTS, type Animal, type BoneClass, type LineSlug, type Nutrition, type Product, type Storage } from "@/lib/catalog";
import { getSupabase } from "@/lib/supabase/server";

/** Řádek tabulky products v Supabase (snake_case). */
type ProductRow = {
  slug: string;
  line: LineSlug;
  variant: string;
  animals: Animal[];
  storage: Storage;
  weight_grams: number;
  price_czk: number;
  original_price_czk: number | null;
  producer: string;
  intro: string;
  composition: string;
  storage_note: string;
  dosage: string;
  in_stock: boolean;
  is_new: boolean;
  image_url: string | null;
  upsell_slugs: string[] | null;
  crosssell_slugs: string[] | null;
  kcal_per_100g: number | null;
  bone_pct: number | null;
  organ_pct: number | null;
  liver_pct: number | null;
  taurine_mg_per_kg: number | null;
  bone_class: BoneClass | null;
  is_complete: boolean;
};

/** Výživové údaje z řádku; null hodnoty vynechá, aby `nutrition` bylo prázdné jen když nic není. */
export function nutritionFromRow(r: Pick<ProductRow, "kcal_per_100g" | "bone_pct" | "organ_pct" | "liver_pct" | "taurine_mg_per_kg" | "bone_class" | "is_complete">): Nutrition | undefined {
  const n: Nutrition = {};
  if (r.kcal_per_100g != null) n.kcalPer100g = Number(r.kcal_per_100g);
  if (r.bone_pct != null) n.bonePct = Number(r.bone_pct);
  if (r.organ_pct != null) n.organPct = Number(r.organ_pct);
  if (r.liver_pct != null) n.liverPct = Number(r.liver_pct);
  if (r.taurine_mg_per_kg != null) n.taurineMgPerKg = Number(r.taurine_mg_per_kg);
  if (r.bone_class) n.boneClass = r.bone_class;
  if (r.is_complete) n.isComplete = true;
  return Object.keys(n).length ? n : undefined;
}

function fromRow(r: ProductRow): Product {
  return {
    slug: r.slug,
    line: r.line,
    variant: r.variant,
    animals: r.animals,
    storage: r.storage,
    weightGrams: r.weight_grams,
    priceCzk: r.price_czk,
    originalPriceCzk: r.original_price_czk ?? undefined,
    producer: r.producer,
    intro: r.intro,
    composition: r.composition,
    storageNote: r.storage_note,
    dosage: r.dosage,
    inStock: r.in_stock,
    isNew: r.is_new,
    image: r.image_url,
    upsell: r.upsell_slugs ?? [],
    crosssell: r.crosssell_slugs ?? [],
    nutrition: nutritionFromRow(r),
  };
}

/**
 * Publikované produkty ze Supabase. Bez připojení, nebo když je tabulka prázdná,
 * vrátí ukázková data z catalog.ts. Cache platí po dobu jednoho requestu.
 */
export const getProducts = cache(async (): Promise<Product[]> => {
  const db = getSupabase();
  if (!db) return PRODUCTS;

  const { data, error } = await db
    .from("products")
    .select(
      "slug, line, variant, animals, storage, weight_grams, price_czk, original_price_czk, producer, intro, composition, storage_note, dosage, in_stock, is_new, image_url, upsell_slugs, crosssell_slugs, kcal_per_100g, bone_pct, organ_pct, liver_pct, taurine_mg_per_kg, bone_class, is_complete",
    )
    .eq("is_published", true)
    .order("sort_order")
    .order("variant");

  if (error) {
    console.error("products.select", error);
    return PRODUCTS;
  }
  if (!data || data.length === 0) return PRODUCTS;
  return (data as ProductRow[]).map(fromRow);
});

export async function getProduct(slug: string) {
  return (await getProducts()).find((p) => p.slug === slug) ?? null;
}

export async function getProductsByLine(line: LineSlug) {
  return (await getProducts()).filter((p) => p.line === line);
}
