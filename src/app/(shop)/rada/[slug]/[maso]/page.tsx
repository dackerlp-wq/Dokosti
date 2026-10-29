import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LineHero } from "@/components/product/line-hero";
import { LineProducts } from "@/components/product/line-products";
import { Section, SectionHeader } from "@/components/ui/section";
import { type FacetKey, KIND_INFO, LINE_INFO, MEAT_TITLE, type LineSlug, type MeatKey, type ProductKind, facetHeading, facetLabel, isLineFacet, isLineSlug, isMeatKey, lineHasKinds, productFacets } from "@/lib/catalog";
import { lineMeatPairs, meatIllustration } from "@/lib/menu";
import { getProducts, getProductsByLine } from "@/lib/products";

type Props = { params: Promise<{ slug: string; maso: string }> };

/** „Kosti“ → „kosti“, ale „BARF mixy“ zůstane (zkratka). */
const lowerFirst = (s: string) => s.replace(/^(\p{Lu})(\p{Ll})/u, (_, a: string, b: string) => a.toLowerCase() + b);
/** Nadpis podkategorie: „Kuřecí BARF mixy“, u řad s druhy název druhu („Oleje“, „Žvýkání“). */
const facetTitle = (slug: LineSlug, key: FacetKey) => (lineHasKinds(slug) ? KIND_INFO[key as ProductKind].title : `${MEAT_TITLE[key as MeatKey]} ${lowerFirst(LINE_INFO[slug].name)}`);
const kindText = (slug: LineSlug, key: FacetKey) => (lineHasKinds(slug) ? KIND_INFO[key as ProductKind].text : undefined);
const plural = (n: number) => `${n} ${n === 1 ? "produkt" : n < 5 ? "produkty" : "produktů"}`;

/** Podkategorie řady podle druhu masa (/rada/barf/kureci), u řad s druhy podle druhu (/rada/navic/oleje, /rada/mlsky/zvykani). Jen kombinace, které mají produkty. */
export async function generateStaticParams() {
  return lineMeatPairs(await getProducts()).map((p) => ({ slug: p.line, maso: p.meat }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, maso } = await params;
  if (!isLineSlug(slug) || !isLineFacet(slug, maso)) return {};
  const title = facetTitle(slug, maso);
  return { title, description: `${title}: ${kindText(slug, maso) ?? LINE_INFO[slug].tagline}` };
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
        illustration={!lineHasKinds(slug) && isMeatKey(maso) ? meatIllustration(maso) : null}
        lead={kindText(slug, maso)}
        eyebrow={
          <>
            <Link href={`/rada/${slug}`} className="hover:text-brick-text hover:underline">
              {line.name}
            </Link>{" "}
            · {facetLabel(slug, maso)}
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
