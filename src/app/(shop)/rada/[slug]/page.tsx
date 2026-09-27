import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LineProducts } from "@/components/product/line-products";
import { LINES, LINE_INFO, isLineSlug } from "@/lib/catalog";
import { getProductsByLine } from "@/lib/products";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return LINES.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isLineSlug(slug)) return {};
  const line = LINE_INFO[slug];
  return { title: line.name, description: line.tagline };
}

export default async function LinePage({ params }: Props) {
  const { slug } = await params;
  if (!isLineSlug(slug)) notFound();

  const line = LINE_INFO[slug];
  const products = await getProductsByLine(slug);

  return (
    <div className="container-dk py-6 md:py-10">
      <p className="label mb-2 text-brick-text">Řada</p>
      <h1>{line.name}</h1>
      <p className="mt-2 max-w-2xl text-muted">{line.description}</p>

      <LineProducts products={products} />
    </div>
  );
}
