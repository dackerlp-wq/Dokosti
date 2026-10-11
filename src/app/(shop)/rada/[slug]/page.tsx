import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LineHero } from "@/components/product/line-hero";
import { LineProducts } from "@/components/product/line-products";
import { Section, SectionHeader } from "@/components/ui/section";
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

const plural = (n: number) => `${n} ${n === 1 ? "produkt" : n < 5 ? "produkty" : "produktů"}`;

export default async function LinePage({ params }: Props) {
  const { slug } = await params;
  if (!isLineSlug(slug)) notFound();

  const line = LINE_INFO[slug];
  const products = await getProductsByLine(slug);
  const hasMeats = products.some((p) => p.meats?.length);

  return (
    <>
      <LineHero line={line} title={line.name} />
      <Section tone="paper">
        <SectionHeader eyebrow={plural(products.length)} title={hasMeats ? "Vyberte podle masa" : `Co máme v řadě ${line.name}`} />
        <LineProducts products={products} line={slug} />
      </Section>
    </>
  );
}
