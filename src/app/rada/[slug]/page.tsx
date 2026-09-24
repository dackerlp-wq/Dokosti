import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/product/product-grid";
import { LineFilters } from "@/components/product/line-filters";
import { LINES, LINE_INFO, getProductsByLine, isLineSlug, type Animal } from "@/lib/catalog";

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
  const products = getProductsByLine(slug).filter((p) => !animal || p.animals.includes(animal));

  return (
    <div className="container-dk py-10 md:py-14">
      <p className="label mb-2 text-brick-text">Řada</p>
      <h1>{line.name}</h1>
      <p className="mt-4 max-w-2xl text-muted">{line.description}</p>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-y border-line py-4">
        <LineFilters active={animal} />
        <span className="text-sm text-muted">
          {products.length} {products.length === 1 ? "produkt" : products.length < 5 ? "produkty" : "produktů"}
        </span>
      </div>

      <div className="mt-8">
        <ProductGrid products={products} />
      </div>
    </div>
  );
}
