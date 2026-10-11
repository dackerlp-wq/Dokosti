import { ProductCard } from "@/components/product/product-card";
import type { Product } from "@/lib/catalog";

/** Mřížka produktů: 3 sloupce ve výpisu řady, 4 na šířku stránky. Mezera 20 px. */
export function ProductGrid({ products, columns = 3 }: { products: Product[]; columns?: 3 | 4 }) {
  if (products.length === 0) {
    return <p className="text-center">Zatím tu nic není. Stavte se v prodejně, nabídka se mění podle závozů.</p>;
  }
  return (
    <div className={`grid gap-5 xs:grid-cols-2 ${columns === 4 ? "lg:grid-cols-3 xl:grid-cols-4" : "lg:grid-cols-3"}`}>
      {products.map((p) => (
        <ProductCard key={p.slug} product={p} />
      ))}
    </div>
  );
}

/** Karusel produktů po čtyřech: posouvá se jen na pokyn uživatele (vodorovný posun se zarážkami). */
export function ProductCarousel({ products, label = "Produkty" }: { products: Product[]; label?: string }) {
  if (products.length === 0) return null;
  return (
    <ul aria-label={label} className="-mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-2.5 [scrollbar-width:thin]">
      {products.map((p) => (
        <li key={p.slug} className="w-[min(100%,280px)] shrink-0 snap-start xs:w-[calc((100%-20px)/2)] lg:w-[calc((100%-40px)/3)] xl:w-[calc((100%-60px)/4)]">
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  );
}
