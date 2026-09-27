import { notFound } from "next/navigation";
import { Batches, type BatchRow } from "@/components/admin/batches";
import { ProductForm } from "@/components/admin/product-form";
import { StockMovements } from "@/components/admin/stock-movements";
import type { ProductRow, StockMovementRow } from "@/lib/admin";
import { productName } from "@/lib/catalog";
import { getAdmin, getAuthSupabase } from "@/lib/supabase/auth";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [db, admin] = await Promise.all([getAuthSupabase(), getAdmin()]);
  const [{ data }, { data: batches }, { data: all }, { data: movements }] = await Promise.all([
    db.from("products").select("*").eq("id", id).maybeSingle(),
    db.from("stock_batches").select("id, batch_no, expires_on, qty, note").eq("product_id", id).order("expires_on"),
    db.from("products").select("slug, line, variant").neq("id", id).order("line").order("variant"),
    db.from("stock_movements").select("*").eq("product_id", id).order("created_at", { ascending: false }).limit(30),
  ]);
  if (!data) notFound();
  const product = data as ProductRow;
  const others = ((all ?? []) as Pick<ProductRow, "slug" | "line" | "variant">[]).map((p) => ({ slug: p.slug, name: productName(p) }));

  return (
    <>
      <h1>{productName(product)}</h1>
      <div className="mt-5">
        <ProductForm product={product} others={others} manager={admin?.isManager ?? false} />
      </div>
      <div className="mt-6 max-w-3xl">
        <StockMovements productId={product.id} unit={product.unit} stockQty={product.stock_qty} movements={(movements ?? []) as StockMovementRow[]} manager={admin?.isManager ?? false} />
      </div>
      {(product.storage === "mrazene" || product.storage === "chlazene") && (
        <div className="mt-6 max-w-3xl">
          <Batches productId={product.id} batches={(batches ?? []) as BatchRow[]} />
        </div>
      )}
    </>
  );
}
