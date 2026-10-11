import type { Metadata } from "next";
import { SearchBox } from "@/components/layout/search-box";
import { ProductGrid } from "@/components/product/product-grid";
import { PageIntro } from "@/components/ui/page-intro";
import { Section } from "@/components/ui/section";
import { LINE_INFO, productName } from "@/lib/catalog";
import { getProducts } from "@/lib/products";

export const metadata: Metadata = { title: "Hledání", robots: { index: false } };

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const terms = fold(q).split(/\s+/).filter(Boolean);
  const all = await getProducts();
  const results = terms.length
    ? all.filter((p) => {
        const hay = fold([productName(p), LINE_INFO[p.line].name, p.producer, p.intro, p.composition].join(" "));
        return terms.every((t) => hay.includes(t));
      })
    : [];

  return (
    <>
      <PageIntro eyebrow="Hledání" title="Co hledáte?">
        <SearchBox products={all} className="mx-auto max-w-[560px] text-left" autoFocus={!q} />
        <p className="mt-5" aria-live="polite">
          {!terms.length ? "Zadejte, co hledáte: druh masa, řadu nebo výrobce." : results.length === 0 ? `Pro „${q}“ jsme nic nenašli. Zkuste jiné slovo nebo se stavte v prodejně.` : `${results.length} ${results.length === 1 ? "výsledek" : results.length < 5 ? "výsledky" : "výsledků"} pro „${q}“`}
        </p>
      </PageIntro>
      {results.length > 0 && (
        <Section tone="paper">
          <ProductGrid products={results} columns={4} />
        </Section>
      )}
    </>
  );
}
