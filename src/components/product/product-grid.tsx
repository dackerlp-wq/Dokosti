import { ProductCard } from "@/components/product/product-card";
import type { Product } from "@/lib/catalog";

/** Mřížka produktů: 4 sloupce na šířku stránky, 3 vedle bočního panelu. */
export function ProductGrid({ products, columns = 4 }: { products: Product[]; columns?: 3 | 4 }) {
  if (products.length === 0) {
    return <p className="text-muted">Zatím tu nic není. Stavte se v prodejně, nabídka se mění podle závozů.</p>;
  }
  return (
    <div className={`grid grid-cols-2 gap-3 md:grid-cols-3 ${columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
      {products.map((p) => (
        <ProductCard key={p.slug} product={p} />
      ))}
    </div>
  );
}
