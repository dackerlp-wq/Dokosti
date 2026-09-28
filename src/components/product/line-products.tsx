"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { ProductGrid } from "@/components/product/product-grid";
import { type Animal, isMeatKey, type LineSlug, MEAT_LABEL, MEATS, type MeatKey, type Product, type Storage, STORAGE_LABEL } from "@/lib/catalog";

type Sort = "doporucene" | "nejlevnejsi" | "nejdrazsi" | "novinky";
type Pack = "male" | "stredni" | "velke";
const SORT_LABEL: Record<Sort, string> = { doporucene: "Doporučené", nejlevnejsi: "Nejlevnější", nejdrazsi: "Nejdražší", novinky: "Novinky" };
const PACK_LABEL: Record<Pack, string> = { male: "do 500 g", stredni: "500 g až 1 kg", velke: "nad 1 kg" };
const packOf = (p: Product): Pack => (p.unit === "kg" || p.weightGrams > 1000 ? "velke" : p.weightGrams > 500 ? "stredni" : "male");

type Filters = { meats: MeatKey[]; animal: Animal | null; inStock: boolean; storage: Storage[]; pack: Pack[]; sort: Sort };

/**
 * Produkty řady s filtry (druh masa, zvíře, skladem, skladování, balení) a řazením.
 * Stav je v adrese: jeden druh masa má vlastní stránku /rada/[řada]/[maso], víc druhů je ?maso=a,b.
 * Stránka zůstává statická, filtruje se v prohlížeči.
 */
export function LineProducts({ products, line, initialMeat = null }: { products: Product[]; line: LineSlug; initialMeat?: MeatKey | null }) {
  return (
    <Suspense fallback={<Inner products={products} line={line} initialMeat={initialMeat} params={new URLSearchParams()} />}>
      <FromUrl products={products} line={line} initialMeat={initialMeat} />
    </Suspense>
  );
}

function FromUrl(props: { products: Product[]; line: LineSlug; initialMeat: MeatKey | null }) {
  const params = useSearchParams();
  return <Inner {...props} params={params} />;
}

function parse(params: URLSearchParams, initialMeat: MeatKey | null): Filters {
  const meatsRaw = (params.get("maso") ?? "").split(",").filter(isMeatKey);
  const zvire = params.get("zvire");
  const sort = params.get("razeni") as Sort | null;
  return {
    meats: meatsRaw.length ? meatsRaw : initialMeat ? [initialMeat] : [],
    animal: zvire === "pes" || zvire === "kocka" ? zvire : null,
    inStock: params.get("skladem") === "1",
    storage: (params.get("skladovani") ?? "").split(",").filter((s): s is Storage => s in STORAGE_LABEL),
    pack: (params.get("baleni") ?? "").split(",").filter((s): s is Pack => s in PACK_LABEL),
    sort: sort && sort in SORT_LABEL ? sort : "doporucene",
  };
}

function apply(products: Product[], f: Filters, skip?: keyof Filters) {
  let list = products.filter(
    (p) =>
      (skip === "meats" || !f.meats.length || f.meats.some((m) => p.meats?.includes(m))) &&
      (skip === "animal" || !f.animal || p.animals.includes(f.animal)) &&
      (skip === "inStock" || !f.inStock || p.inStock) &&
      (skip === "storage" || !f.storage.length || f.storage.includes(p.storage)) &&
      (skip === "pack" || !f.pack.length || f.pack.includes(packOf(p))),
  );
  if (f.sort === "nejlevnejsi") list = [...list].sort((a, b) => a.priceCzk - b.priceCzk);
  if (f.sort === "nejdrazsi") list = [...list].sort((a, b) => b.priceCzk - a.priceCzk);
  if (f.sort === "novinky") list = [...list].sort((a, b) => Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)));
  return list;
}

function Inner({ products, line, initialMeat, params }: { products: Product[]; line: LineSlug; initialMeat: MeatKey | null; params: URLSearchParams }) {
  const router = useRouter();
  const pathname = usePathname();
  const f = useMemo(() => parse(params, initialMeat), [params, initialMeat]);
  const [more, setMore] = useState(f.storage.length > 0 || f.pack.length > 0);
  const list = apply(products, f);

  const meatOptions = MEATS.map((key) => ({ key, count: apply(products, f, "meats").filter((p) => p.meats?.includes(key)).length })).filter((m) => products.some((p) => p.meats?.includes(m.key)));
  const storageOptions = (Object.keys(STORAGE_LABEL) as Storage[]).filter((s) => products.some((p) => p.storage === s));
  const packOptions = (Object.keys(PACK_LABEL) as Pack[]).filter((k) => products.some((p) => packOf(p) === k));
  const animalOptions = (["pes", "kocka"] as Animal[]).filter((a) => products.some((p) => p.animals.includes(a)));
  const active = f.meats.length + (f.animal ? 1 : 0) + (f.inStock ? 1 : 0) + f.storage.length + f.pack.length;

  function go(next: Filters) {
    // Jeden druh masa má vlastní stránku (SEO), jinak parametr.
    const base = `/rada/${line}`;
    const q = new URLSearchParams();
    const single = next.meats.length === 1 ? next.meats[0] : null;
    if (!single && next.meats.length) q.set("maso", next.meats.join(","));
    if (next.animal) q.set("zvire", next.animal);
    if (next.inStock) q.set("skladem", "1");
    if (next.storage.length) q.set("skladovani", next.storage.join(","));
    if (next.pack.length) q.set("baleni", next.pack.join(","));
    if (next.sort !== "doporucene") q.set("razeni", next.sort);
    const path = single ? `${base}/${single}` : base;
    const url = q.toString() ? `${path}?${q}` : path;
    if (url !== (pathname + (params.toString() ? `?${params}` : ""))) router.replace(url, { scroll: false });
  }
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const chip = (on: boolean) => `label inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[11px] ${on ? "border-green bg-green text-cream" : "border-line bg-paper text-green hover:border-green"}`;

  return (
    <>
      <div className="mt-5 space-y-3 border-y border-line py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-2" role="group" aria-label="Pro koho">
            <button type="button" onClick={() => go({ ...f, animal: null })} aria-pressed={!f.animal} className={chip(!f.animal)}>
              Vše
            </button>
            {animalOptions.map((a) => (
              <button key={a} type="button" onClick={() => go({ ...f, animal: f.animal === a ? null : a })} aria-pressed={f.animal === a} className={chip(f.animal === a)}>
                {a === "pes" ? "Pro psy" : "Pro kočky"}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => go({ ...f, inStock: !f.inStock })} aria-pressed={f.inStock} className={chip(f.inStock)}>
            Jen skladem
          </button>
          {(storageOptions.length > 1 || packOptions.length > 1) && (
            <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more} className={chip(more)}>
              <SlidersHorizontal strokeWidth={1.75} className="h-3.5 w-3.5" /> Další filtry
            </button>
          )}
          <label className="ml-auto flex items-center gap-2 text-sm text-muted">
            <span className="hidden sm:inline">Řadit</span>
            <select value={f.sort} onChange={(e) => go({ ...f, sort: e.target.value as Sort })} aria-label="Řazení" className="min-h-9 w-auto py-1 text-sm">
              {(Object.keys(SORT_LABEL) as Sort[]).map((s) => (
                <option key={s} value={s}>
                  {SORT_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {meatOptions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Druh masa">
            <span className="label text-[11px] text-muted">Druh masa</span>
            {meatOptions.map((m) => {
              const on = f.meats.includes(m.key);
              return (
                <button key={m.key} type="button" onClick={() => go({ ...f, meats: toggle(f.meats, m.key) })} aria-pressed={on} disabled={!on && m.count === 0} className={`${chip(on)} disabled:opacity-40`}>
                  {MEAT_LABEL[m.key]}
                  <span className={on ? "opacity-80" : "text-muted"}>{m.count}</span>
                </button>
              );
            })}
          </div>
        )}

        {more && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {storageOptions.length > 1 && (
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Skladování">
                <span className="label text-[11px] text-muted">Skladování</span>
                {storageOptions.map((s) => (
                  <button key={s} type="button" onClick={() => go({ ...f, storage: toggle(f.storage, s) })} aria-pressed={f.storage.includes(s)} className={chip(f.storage.includes(s))}>
                    {STORAGE_LABEL[s]}
                  </button>
                ))}
              </div>
            )}
            {packOptions.length > 1 && (
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Velikost balení">
                <span className="label text-[11px] text-muted">Balení</span>
                {packOptions.map((k) => (
                  <button key={k} type="button" onClick={() => go({ ...f, pack: toggle(f.pack, k) })} aria-pressed={f.pack.includes(k)} className={chip(f.pack.includes(k))}>
                    {PACK_LABEL[k]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 text-sm text-muted">
          <span aria-live="polite">
            {list.length} {list.length === 1 ? "produkt" : list.length < 5 ? "produkty" : "produktů"}
          </span>
          {active > 0 && (
            <button type="button" onClick={() => go({ meats: [], animal: null, inStock: false, storage: [], pack: [], sort: f.sort })} className="inline-flex items-center gap-1 text-green underline">
              <X strokeWidth={1.75} className="h-3.5 w-3.5" /> Zrušit filtry ({active})
            </button>
          )}
        </div>
      </div>
      <div className="mt-5">
        {list.length === 0 && active > 0 ? <p className="text-muted">Tomuhle výběru nic neodpovídá. Zkuste některý filtr zrušit.</p> : <ProductGrid products={list} />}
      </div>
    </>
  );
}
