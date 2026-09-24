import { cache } from "react";
import { PRODUCTS, type Animal, type LineSlug, type Product, type Storage } from "@/lib/catalog";
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
};

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
      "slug, line, variant, animals, storage, weight_grams, price_czk, original_price_czk, producer, intro, composition, storage_note, dosage, in_stock, is_new, image_url",
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
