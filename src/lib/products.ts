import { cache } from "react";
import { PRODUCTS, type Animal, type BoneClass, type LineSlug, type Nutrition, type Product, type ProductUnit, type Storage, type SupplementDose, isMeatKey, isNavicKind } from "@/lib/catalog";
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
  stock_qty: number | string | null;
  is_new: boolean;
  image_url: string | null;
  upsell_slugs: string[] | null;
  crosssell_slugs: string[] | null;
  kcal_per_100g: number | null;
  meat_pct: number | string | null;
  kind: string | null;
  dose: SupplementDose | null;
  bone_pct: number | null;
  organ_pct: number | null;
  liver_pct: number | null;
  taurine_mg_per_kg: number | null;
  bone_class: BoneClass | null;
  is_complete: boolean;
  unit: ProductUnit;
  meats: string[] | null;
  purchase_price_czk: number | string | null;
  low_stock_threshold: number | null;
  reco_boost: number | null;
};

/**
 * Výhodnost produktu pro obchod (0–100): marže 60 %, stav skladu 30 % (přebytek tlačit, nedostatek šetřit),
 * ruční přednost z administrace ±30 %. Nákupní cena zůstává na serveru, ven jde jen skóre.
 */
export function recoScore(r: Pick<ProductRow, "price_czk" | "purchase_price_czk" | "stock_qty" | "low_stock_threshold" | "reco_boost">): number {
  const purchase = r.purchase_price_czk == null ? null : Number(r.purchase_price_czk);
  const margin = purchase && r.price_czk > 0 ? (r.price_czk - purchase) / r.price_czk : 0.35;
  const marginScore = Math.max(0, Math.min(1, margin / 0.6));
  const qty = r.stock_qty == null ? null : Number(r.stock_qty);
  const threshold = Math.max(1, r.low_stock_threshold ?? 5);
  const stockScore = qty == null ? 0.5 : qty <= threshold ? 0.2 : qty >= 4 * threshold ? 1 : 0.2 + (0.8 * (qty - threshold)) / (3 * threshold);
  const boost = (r.reco_boost ?? 0) * 0.15;
  return Math.round(100 * Math.max(0, Math.min(1, 0.6 * marginScore + 0.3 * stockScore + 0.05 + boost)));
}

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
    stockQty: r.stock_qty === null || r.stock_qty === undefined ? null : Number(r.stock_qty),
    isNew: r.is_new,
    image: r.image_url,
    upsell: r.upsell_slugs ?? [],
    crosssell: r.crosssell_slugs ?? [],
    nutrition: nutritionFromRow(r),
    meatPct: r.meat_pct == null ? undefined : Number(r.meat_pct),
    kind: r.kind && isNavicKind(r.kind) ? r.kind : undefined,
    dose: r.dose ?? undefined,
    unit: r.unit ?? "ks",
    meats: (r.meats ?? []).filter(isMeatKey),
    recoScore: recoScore(r),
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
      "slug, line, variant, animals, storage, weight_grams, price_czk, original_price_czk, producer, intro, composition, storage_note, dosage, in_stock, is_new, image_url, upsell_slugs, crosssell_slugs, kcal_per_100g, meat_pct, kind, dose, bone_pct, organ_pct, liver_pct, taurine_mg_per_kg, bone_class, is_complete, unit, stock_qty, meats, purchase_price_czk, low_stock_threshold, reco_boost",
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
