import type { Metadata } from "next";
import { SearchBox } from "@/components/layout/search-box";
import { ProductGrid } from "@/components/product/product-grid";
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
    <div className="container-dk py-6 md:py-10">
      <h1>Hledání</h1>
      <SearchBox products={all} className="mt-4 max-w-md" autoFocus={!q} />
      <p className="mt-4 text-sm text-muted">
        {!terms.length ? "Zadejte, co hledáte: druh masa, řadu nebo výrobce." : results.length === 0 ? `Pro „${q}“ jsme nic nenašli. Zkuste jiné slovo nebo se stavte v prodejně.` : `${results.length} ${results.length === 1 ? "výsledek" : results.length < 5 ? "výsledky" : "výsledků"} pro „${q}“`}
      </p>
      {results.length > 0 && (
        <div className="mt-5">
          <ProductGrid products={results} />
        </div>
      )}
    </div>
  );
}
