import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/product/product-grid";
import { LineFilters } from "@/components/product/line-filters";
import { LINES, LINE_INFO, isLineSlug, type Animal } from "@/lib/catalog";
import { getProductsByLine } from "@/lib/products";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ zvire?: string }> };

export function generateStaticParams() {
  return LINES.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isLineSlug(slug)) return {};
  const line = LINE_INFO[slug];
  return { title: line.name, description: line.tagline };
}

export default async function LinePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { zvire } = await searchParams;
  if (!isLineSlug(slug)) notFound();

  const line = LINE_INFO[slug];
  const animal: Animal | null = zvire === "pes" || zvire === "kocka" ? zvire : null;
  const products = (await getProductsByLine(slug)).filter((p) => !animal || p.animals.includes(animal));

  return (
    <div className="container-dk py-6 md:py-10">
      <p className="label mb-2 text-brick-text">Řada</p>
      <h1>{line.name}</h1>
      <p className="mt-2 max-w-2xl text-muted">{line.description}</p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-line py-3">
        <LineFilters active={animal} />
        <span className="text-sm text-muted">
          {products.length} {products.length === 1 ? "produkt" : products.length < 5 ? "produkty" : "produktů"}
        </span>
      </div>

      <div className="mt-5">
        <ProductGrid products={products} />
      </div>
    </div>
  );
}
