import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LineProducts } from "@/components/product/line-products";
import { LINE_INFO, MEAT_LABEL, MEAT_TITLE, isLineSlug, isMeatKey } from "@/lib/catalog";
import { lineMeatPairs } from "@/lib/menu";
import { getProducts, getProductsByLine } from "@/lib/products";

type Props = { params: Promise<{ slug: string; maso: string }> };

/** „Kosti“ → „kosti“, ale „BARF mixy“ zůstane (zkratka). */
const lowerFirst = (s: string) => s.replace(/^(\p{Lu})(\p{Ll})/u, (_, a: string, b: string) => a.toLowerCase() + b);

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
  if (!products.some((p) => p.meats?.includes(maso))) notFound();

  return (
    <div className="container-dk py-6 md:py-10">
      <p className="label mb-2 text-brick-text">
        <Link href={`/rada/${slug}`} className="hover:underline">
          {line.name}
        </Link>{" "}
        · {MEAT_LABEL[maso]}
      </p>
      <h1>
        {MEAT_TITLE[maso]} {lowerFirst(line.name)}
      </h1>
      <p className="mt-2 max-w-2xl text-muted">{line.description}</p>

      <LineProducts products={products} line={slug} initialMeat={maso} />
    </div>
  );
}
