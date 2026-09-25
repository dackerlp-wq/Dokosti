import { notFound } from "next/navigation";
import { Batches, type BatchRow } from "@/components/admin/batches";
import { ProductForm } from "@/components/admin/product-form";
import type { ProductRow } from "@/lib/admin";
import { productName } from "@/lib/catalog";
import { getAuthSupabase } from "@/lib/supabase/auth";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getAuthSupabase();
  const [{ data }, { data: batches }, { data: all }] = await Promise.all([
    db.from("products").select("*").eq("id", id).maybeSingle(),
    db.from("stock_batches").select("id, batch_no, expires_on, qty, note").eq("product_id", id).order("expires_on"),
    db.from("products").select("slug, line, variant").neq("id", id).order("line").order("variant"),
  ]);
  if (!data) notFound();
  const product = data as ProductRow;
  const others = ((all ?? []) as Pick<ProductRow, "slug" | "line" | "variant">[]).map((p) => ({ slug: p.slug, name: productName(p) }));

  return (
    <>
      <h1>{productName(product)}</h1>
      <div className="mt-5">
        <ProductForm product={product} others={others} />
      </div>
      {(product.storage === "mrazene" || product.storage === "chlazene") && (
        <div className="mt-6 max-w-3xl">
          <Batches productId={product.id} batches={(batches ?? []) as BatchRow[]} />
        </div>
      )}
    </>
  );
}
