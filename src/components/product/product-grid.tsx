import { ProductCard } from "@/components/product/product-card";
import type { Product } from "@/lib/catalog";

export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return <p className="text-muted">Zatím tu nic není. Stavte se v prodejně, nabídka se mění podle závozů.</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.slug} product={p} />
      ))}
    </div>
  );
}
