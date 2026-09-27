"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LineFilters } from "@/components/product/line-filters";
import { ProductGrid } from "@/components/product/product-grid";
import type { Animal, Product } from "@/lib/catalog";

/** Produkty řady s filtrem pes/kočka. Filtr čte z URL v prohlížeči, stránka tak zůstává statická. */
export function LineProducts({ products }: { products: Product[] }) {
  return (
    <Suspense fallback={<Inner products={products} animal={null} />}>
      <FromUrl products={products} />
    </Suspense>
  );
}

function FromUrl({ products }: { products: Product[] }) {
  const zvire = useSearchParams().get("zvire");
  const animal: Animal | null = zvire === "pes" || zvire === "kocka" ? zvire : null;
  return <Inner products={products} animal={animal} />;
}

function Inner({ products, animal }: { products: Product[]; animal: Animal | null }) {
  const list = products.filter((p) => !animal || p.animals.includes(animal));
  return (
    <>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-line py-3">
        <LineFilters active={animal} />
        <span className="text-sm text-muted">
          {list.length} {list.length === 1 ? "produkt" : list.length < 5 ? "produkty" : "produktů"}
        </span>
      </div>
      <div className="mt-5">
        <ProductGrid products={list} />
      </div>
    </>
  );
}
