import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LineHero } from "@/components/product/line-hero";
import { LineProducts } from "@/components/product/line-products";
import { Section, SectionHeader } from "@/components/ui/section";
import { LINE_INFO, MEAT_LABEL, MEAT_TITLE, isLineSlug, isMeatKey } from "@/lib/catalog";
import { lineMeatPairs, meatIllustration } from "@/lib/menu";
import { getProducts, getProductsByLine } from "@/lib/products";

type Props = { params: Promise<{ slug: string; maso: string }> };

/** „Kosti“ → „kosti“, ale „BARF mixy“ zůstane (zkratka). */
const lowerFirst = (s: string) => s.replace(/^(\p{Lu})(\p{Ll})/u, (_, a: string, b: string) => a.toLowerCase() + b);
const plural = (n: number) => `${n} ${n === 1 ? "produkt" : n < 5 ? "produkty" : "produktů"}`;

/** Podkategorie řady podle druhu masa, např. /rada/barf/kureci. Jen kombinace, které mají produkty. */
export async function generateStaticParams() {
  return lineMeatPairs(await getProducts()).map((p) => ({ slug: p.line, maso: p.meat }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, maso } = await params;
  if (!isLineSlug(slug) || !isMeatKey(maso)) return {};
  const title = `${MEAT_TITLE[maso]} ${lowerFirst(LINE_INFO[slug].name)}`;
  return { title, description: `${title}: ${LINE_INFO[slug].tagline}` };
}

export default async function LineMeatPage({ params }: Props) {
  const { slug, maso } = await params;
  if (!isLineSlug(slug) || !isMeatKey(maso)) notFound();
  const line = LINE_INFO[slug];
  const products = await getProductsByLine(slug);
  const inMeat = products.filter((p) => p.meats?.includes(maso));
  if (inMeat.length === 0) notFound();

  return (
    <>
      <LineHero
        line={line}
        illustration={meatIllustration(maso)}
        eyebrow={
          <>
            <Link href={`/rada/${slug}`} className="hover:text-brick-text hover:underline">
              {line.name}
            </Link>{" "}
            · {MEAT_LABEL[maso]}
          </>
        }
        title={
          <>
            {MEAT_TITLE[maso]} {lowerFirst(line.name)}
          </>
        }
      />
      <Section tone="paper">
        <SectionHeader eyebrow={plural(inMeat.length)} title="Vyberte podle masa" />
        <LineProducts products={products} line={slug} initialMeat={maso} />
      </Section>
    </>
  );
}
