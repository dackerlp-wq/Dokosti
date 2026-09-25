import { ProductForm } from "@/components/admin/product-form";
import type { ProductRow } from "@/lib/admin";
import { productName } from "@/lib/catalog";
import { getAuthSupabase } from "@/lib/supabase/auth";

export default async function NewProductPage() {
  const db = await getAuthSupabase();
  const { data } = await db.from("products").select("slug, line, variant").order("line").order("variant");
  const others = ((data ?? []) as Pick<ProductRow, "slug" | "line" | "variant">[]).map((p) => ({ slug: p.slug, name: productName(p) }));
  return (
    <>
      <h1>Nový produkt</h1>
      <div className="mt-5">
        <ProductForm others={others} />
      </div>
    </>
  );
}
