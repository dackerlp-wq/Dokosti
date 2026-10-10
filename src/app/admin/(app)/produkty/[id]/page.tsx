import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { buttonClass } from "@/components/ui/button";
import { Batches, type BatchRow } from "@/components/admin/batches";
import { ProductForm } from "@/components/admin/product-form";
import { StockMovements } from "@/components/admin/stock-movements";
import type { ProductRow, StockMovementRow } from "@/lib/admin";
import { productName } from "@/lib/catalog";
import { getAdmin, getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [db, admin] = await Promise.all([getAuthSupabase(), getAdmin()]);
  const [{ data }, { data: batches }, { data: all }, { data: movements }, { data: suppliers }] = await Promise.all([
    db.from("products").select("*").eq("id", id).maybeSingle(),
    db.from("stock_batches").select("id, batch_no, expires_on, qty, note").eq("product_id", id).order("expires_on"),
    db.from("products").select("slug, line, variant").neq("id", id).order("line").order("variant"),
    db.from("stock_movements").select("*").eq("product_id", id).order("created_at", { ascending: false }).limit(30),
    db.from("suppliers").select("id, name, lead_days").eq("active", true).order("name"),
  ]);
  if (!data) notFound();
  const product = data as ProductRow;
  const others = ((all ?? []) as Pick<ProductRow, "slug" | "line" | "variant">[]).map((p) => ({ slug: p.slug, name: productName(p) }));

  return (
    <>
      <PageHeader
        crumbs={[{ href: "/admin/produkty", label: "Produkty" }]}
        title={productName(product)}
        actions={
          <>
            <Link href={`/admin/sklad/${product.id}`} className={buttonClass("secondary")}>
              Sklad a pohyby
            </Link>
            <Link href={`/admin/produkty/cenovky?produkt=${product.id}`} className={buttonClass("secondary")}>
              Cenovka
            </Link>
            {admin?.isManager && (
              <Link href={`/admin/akce?produkt=${product.id}`} className={buttonClass("secondary")}>
                Akční cena
              </Link>
            )}
          </>
        }
      />
      <div className="mt-5">
        <ProductForm product={product} others={others} manager={admin?.isManager ?? false} suppliers={(suppliers ?? []) as { id: string; name: string; lead_days: number }[]} />
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
