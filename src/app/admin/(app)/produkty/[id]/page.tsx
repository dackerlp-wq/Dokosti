import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import type { ProductRow } from "@/lib/admin";
import { productName } from "@/lib/catalog";
import { getAuthSupabase } from "@/lib/supabase/auth";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getAuthSupabase();
  const { data } = await db.from("products").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const product = data as ProductRow;

  return (
    <>
      <h1>{productName(product)}</h1>
      <div className="mt-5">
        <ProductForm product={product} />
      </div>
    </>
  );
}
