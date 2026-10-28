"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { ProductGrid } from "@/components/product/product-grid";
import { type Animal, type FacetKey, facetLabel, isLineFacet, lineFacets, type LineSlug, productFacets, type Product, type Storage, STORAGE_LABEL } from "@/lib/catalog";

type Sort = "doporucene" | "nejlevnejsi" | "nejdrazsi" | "novinky";
type Pack = "male" | "stredni" | "velke";
const SORT_LABEL: Record<Sort, string> = { doporucene: "Doporučené", nejlevnejsi: "Nejlevnější", nejdrazsi: "Nejdražší", novinky: "Novinky" };
const PACK_LABEL: Record<Pack, string> = { male: "do 500 g", stredni: "500 g až 1 kg", velke: "nad 1 kg" };
const packOf = (p: Product): Pack => (p.unit === "kg" || p.weightGrams > 1000 ? "velke" : p.weightGrams > 500 ? "stredni" : "male");

type Filters = { meats: FacetKey[]; animal: Animal | null; inStock: boolean; storage: Storage | null; pack: Pack | null; sort: Sort };

/**
 * Produkty řady: filtr podle masa (u Navíc podle účelu) je řádek odkazů nad mřížkou (každý má vlastní stránku /rada/[řada]/[klíč]),
 * ostatní volby (pro koho, skladem, skladování, balení, řazení) jsou v úzké liště a drží se v adrese.
 * Stránka zůstává statická, filtruje se v prohlížeči.
 */
export function LineProducts({ products, line, initialMeat = null }: { products: Product[]; line: LineSlug; initialMeat?: FacetKey | null }) {
  return (
    <Suspense fallback={<Inner products={products} line={line} initialMeat={initialMeat} params={new URLSearchParams()} />}>
      <FromUrl products={products} line={line} initialMeat={initialMeat} />
    </Suspense>
  );
}

function FromUrl(props: { products: Product[]; line: LineSlug; initialMeat: FacetKey | null }) {
  const params = useSearchParams();
  return <Inner {...props} params={params} />;
}

function parse(params: URLSearchParams, line: LineSlug, initialMeat: FacetKey | null): Filters {
  const meatsRaw = (params.get("maso") ?? "").split(",").filter((v): v is FacetKey => isLineFacet(line, v));
  const zvire = params.get("zvire");
  const sort = params.get("razeni") as Sort | null;
  const storage = params.get("skladovani");
  const pack = params.get("baleni");
  return {
    meats: meatsRaw.length ? meatsRaw : initialMeat ? [initialMeat] : [],
    animal: zvire === "pes" || zvire === "kocka" ? zvire : null,
    inStock: params.get("skladem") === "1",
    storage: storage && storage in STORAGE_LABEL ? (storage as Storage) : null,
    pack: pack && pack in PACK_LABEL ? (pack as Pack) : null,
    sort: sort && sort in SORT_LABEL ? sort : "doporucene",
  };
}

function apply(products: Product[], f: Filters, skip?: keyof Filters) {
  let list = products.filter(
    (p) =>
      (skip === "meats" || !f.meats.length || f.meats.some((m) => productFacets(p).includes(m))) &&
      (skip === "animal" || !f.animal || p.animals.includes(f.animal)) &&
      (skip === "inStock" || !f.inStock || p.inStock) &&
      (skip === "storage" || !f.storage || p.storage === f.storage) &&
      (skip === "pack" || !f.pack || packOf(p) === f.pack),
  );
  if (f.sort === "nejlevnejsi") list = [...list].sort((a, b) => a.priceCzk - b.priceCzk);
  if (f.sort === "nejdrazsi") list = [...list].sort((a, b) => b.priceCzk - a.priceCzk);
  if (f.sort === "novinky") list = [...list].sort((a, b) => Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)));
  return list;
}

const plural = (n: number) => `${n} ${n === 1 ? "produkt" : n < 5 ? "produkty" : "produktů"}`;

function Inner({ products, line, initialMeat, params }: { products: Product[]; line: LineSlug; initialMeat: FacetKey | null; params: URLSearchParams }) {
  const router = useRouter();
  const pathname = usePathname();
  const f = useMemo(() => parse(params, line, initialMeat), [params, line, initialMeat]);
  const list = apply(products, f);

  const count = (skip: keyof Filters, test: (p: Product) => boolean) => apply(products, f, skip).filter(test).length;
  const meatOptions = lineFacets(line).filter((key) => products.some((p) => productFacets(p).includes(key))).map((key) => ({ key, count: count("meats", (p) => productFacets(p).includes(key)) }));
  const storageOptions = (Object.keys(STORAGE_LABEL) as Storage[]).filter((s) => products.some((p) => p.storage === s));
  const packOptions = (Object.keys(PACK_LABEL) as Pack[]).filter((k) => products.some((p) => packOf(p) === k));
  const animalOptions = (["pes", "kocka"] as Animal[]).filter((a) => products.some((p) => p.animals.includes(a)));
  const active = (f.animal ? 1 : 0) + (f.inStock ? 1 : 0) + (f.storage ? 1 : 0) + (f.pack ? 1 : 0);

  /** Ostatní volby než maso: parametry v adrese, stránka druhu masa zůstává. */
  function query(next: Filters) {
    const q = new URLSearchParams();
    if (next.meats.length > 1) q.set("maso", next.meats.join(","));
    if (next.animal) q.set("zvire", next.animal);
    if (next.inStock) q.set("skladem", "1");
    if (next.storage) q.set("skladovani", next.storage);
    if (next.pack) q.set("baleni", next.pack);
    if (next.sort !== "doporucene") q.set("razeni", next.sort);
    return q.toString();
  }
  function go(next: Filters) {
    const q = query(next);
    const url = q ? `${pathname}?${q}` : pathname;
    if (url !== (pathname + (params.toString() ? `?${params}` : ""))) router.replace(url, { scroll: false });
  }
  const reset = () => go({ ...f, animal: null, inStock: false, storage: null, pack: null });
  const single = f.meats.length === 1 ? f.meats[0] : null;
  const keep = query({ ...f, meats: [] });
  const meatHref = (key: FacetKey | null) => `/rada/${line}${key ? `/${key}` : ""}${keep ? `?${keep}` : ""}`;

  const meatLink = "inline-flex min-h-10 items-center rounded-control px-3.5 text-button transition-colors duration-300";
  const select = "min-h-10 w-auto py-1 text-small";

  return (
    <div>
      {meatOptions.length > 0 && (
        <nav aria-label={line === "navic" ? "Účel" : "Druh masa"} className="mb-5 flex flex-wrap justify-center gap-1.25">
          <Link href={meatHref(null)} aria-current={!single && !f.meats.length ? "page" : undefined} className={`${meatLink} ${!f.meats.length ? "bg-green text-cream" : "text-green hover:text-brick-text"}`}>
            Vše
          </Link>
          {meatOptions.map((m) => (
            <Link key={m.key} href={meatHref(m.key)} aria-current={single === m.key ? "page" : undefined} className={`${meatLink} capitalize ${single === m.key ? "bg-green text-cream" : "text-green hover:text-brick-text"}`}>
              {facetLabel(m.key)}
              <span className={`ml-1.5 text-small font-normal ${single === m.key ? "text-cream/80" : "text-muted"}`}>{m.count}</span>
            </Link>
          ))}
        </nav>
      )}

      <div className="mb-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 text-small">
        <span aria-live="polite" className="font-semibold text-green">
          {plural(list.length)}
        </span>
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={f.inStock} onChange={() => go({ ...f, inStock: !f.inStock })} className="size-4 min-h-0 w-4 p-0 accent-green" />
          Jen skladem
        </label>
        {animalOptions.length > 1 && (
          <label className="inline-flex items-center gap-2">
            Pro koho
            <select value={f.animal ?? ""} onChange={(e) => go({ ...f, animal: (e.target.value || null) as Animal | null })} aria-label="Pro koho" className={select}>
              <option value="">Psi i kočky</option>
              {animalOptions.map((a) => (
                <option key={a} value={a}>
                  {a === "pes" ? "Pro psy" : "Pro kočky"}
                </option>
              ))}
            </select>
          </label>
        )}
        {storageOptions.length > 1 && (
          <label className="inline-flex items-center gap-2">
            Skladování
            <select value={f.storage ?? ""} onChange={(e) => go({ ...f, storage: (e.target.value || null) as Storage | null })} aria-label="Skladování" className={select}>
              <option value="">Vše</option>
              {storageOptions.map((s) => (
                <option key={s} value={s}>
                  {STORAGE_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
        )}
        {packOptions.length > 1 && (
          <label className="inline-flex items-center gap-2">
            Balení
            <select value={f.pack ?? ""} onChange={(e) => go({ ...f, pack: (e.target.value || null) as Pack | null })} aria-label="Balení" className={select}>
              <option value="">Vše</option>
              {packOptions.map((k) => (
                <option key={k} value={k}>
                  {PACK_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="inline-flex items-center gap-2">
          Řadit
          <select value={f.sort} onChange={(e) => go({ ...f, sort: e.target.value as Sort })} aria-label="Řazení" className={select}>
            {(Object.keys(SORT_LABEL) as Sort[]).map((s) => (
              <option key={s} value={s}>
                {SORT_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        {active > 0 && (
          <button type="button" onClick={reset} className="text-brick-text underline">
            Zrušit filtry
          </button>
        )}
      </div>

      {list.length === 0 && (active > 0 || f.meats.length > 0) ? (
        <p className="text-center">
          Tomuhle výběru nic neodpovídá.{" "}
          <button type="button" onClick={reset} className="text-brick-text underline">
            Zrušit filtry
          </button>
        </p>
      ) : (
        <ProductGrid products={list} columns={3} />
      )}
    </div>
  );
}
