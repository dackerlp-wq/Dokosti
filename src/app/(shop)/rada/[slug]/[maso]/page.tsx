import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LineHero } from "@/components/product/line-hero";
import { LineProducts } from "@/components/product/line-products";
import { Section, SectionHeader } from "@/components/ui/section";
import { type FacetKey, LINE_INFO, MEAT_TITLE, NAVIC_KIND_INFO, type LineSlug, facetHeading, facetLabel, isLineFacet, isLineSlug, isMeatKey, isNavicKind, productFacets } from "@/lib/catalog";
import { lineMeatPairs, meatIllustration } from "@/lib/menu";
import { getProducts, getProductsByLine } from "@/lib/products";

type Props = { params: Promise<{ slug: string; maso: string }> };

/** „Kosti“ → „kosti“, ale „BARF mixy“ zůstane (zkratka). */
const lowerFirst = (s: string) => s.replace(/^(\p{Lu})(\p{Ll})/u, (_, a: string, b: string) => a.toLowerCase() + b);
/** Nadpis podkategorie: „Kuřecí BARF mixy“, u Navíc název účelu („Oleje“). */
const facetTitle = (slug: LineSlug, key: FacetKey) => (isNavicKind(key) ? NAVIC_KIND_INFO[key].title : `${MEAT_TITLE[key]} ${lowerFirst(LINE_INFO[slug].name)}`);
const plural = (n: number) => `${n} ${n === 1 ? "produkt" : n < 5 ? "produkty" : "produktů"}`;

/** Podkategorie řady podle druhu masa (/rada/barf/kureci), u Navíc podle účelu (/rada/navic/oleje). Jen kombinace, které mají produkty. */
export async function generateStaticParams() {
  return lineMeatPairs(await getProducts()).map((p) => ({ slug: p.line, maso: p.meat }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, maso } = await params;
  if (!isLineSlug(slug) || !isLineFacet(slug, maso)) return {};
  const title = facetTitle(slug, maso);
  return { title, description: isNavicKind(maso) ? `${title}: ${NAVIC_KIND_INFO[maso].text}` : `${title}: ${LINE_INFO[slug].tagline}` };
}

export default async function LineMeatPage({ params }: Props) {
  const { slug, maso } = await params;
  if (!isLineSlug(slug) || !isLineFacet(slug, maso)) notFound();
  const line = LINE_INFO[slug];
  const products = await getProductsByLine(slug);
  const inMeat = products.filter((p) => productFacets(p).includes(maso));
  if (inMeat.length === 0) notFound();

  return (
    <>
      <LineHero
        line={line}
        illustration={isMeatKey(maso) ? meatIllustration(maso) : null}
        lead={isNavicKind(maso) ? NAVIC_KIND_INFO[maso].text : undefined}
        eyebrow={
          <>
            <Link href={`/rada/${slug}`} className="hover:text-brick-text hover:underline">
              {line.name}
            </Link>{" "}
            · {facetLabel(maso)}
          </>
        }
        title={facetTitle(slug, maso)}
      />
      <Section tone="paper">
        <SectionHeader eyebrow={plural(inMeat.length)} title={facetHeading(slug)} />
        <LineProducts products={products} line={slug} initialMeat={maso} />
      </Section>
    </>
  );
}
