"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, Suspense, useEffect, useMemo, useState } from "react";
import { ProductGrid } from "@/components/product/product-grid";
import { type Animal, isMeatKey, type LineSlug, MEAT_LABEL, MEATS, type MeatKey, type Product, type Storage, STORAGE_LABEL } from "@/lib/catalog";

type Sort = "doporucene" | "nejlevnejsi" | "nejdrazsi" | "novinky";
type Pack = "male" | "stredni" | "velke";
const SORT_LABEL: Record<Sort, string> = { doporucene: "Doporučené", nejlevnejsi: "Nejlevnější", nejdrazsi: "Nejdražší", novinky: "Novinky" };
const PACK_LABEL: Record<Pack, string> = { male: "do 500 g", stredni: "500 g až 1 kg", velke: "nad 1 kg" };
const packOf = (p: Product): Pack => (p.unit === "kg" || p.weightGrams > 1000 ? "velke" : p.weightGrams > 500 ? "stredni" : "male");

type Filters = { meats: MeatKey[]; animal: Animal | null; inStock: boolean; storage: Storage[]; pack: Pack[]; sort: Sort };
const EMPTY: Omit<Filters, "sort"> = { meats: [], animal: null, inStock: false, storage: [], pack: [] };

/**
 * Produkty řady s filtry v bočním panelu (druh masa, pro koho, skladem, skladování, balení) a řazením nad mřížkou.
 * Na mobilu se panel vysouvá tlačítkem „Filtry“.
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

const plural = (n: number) => `${n} ${n === 1 ? "produkt" : n < 5 ? "produkty" : "produktů"}`;

function Inner({ products, line, initialMeat, params }: { products: Product[]; line: LineSlug; initialMeat: MeatKey | null; params: URLSearchParams }) {
  const router = useRouter();
  const pathname = usePathname();
  const f = useMemo(() => parse(params, initialMeat), [params, initialMeat]);
  const [open, setOpen] = useState(false);
  const list = apply(products, f);

  // Počty u voleb: kolik produktů by zbylo, kdyby se zapnula jen tahle volba (ostatní filtry platí).
  const count = (skip: keyof Filters, test: (p: Product) => boolean) => apply(products, f, skip).filter(test).length;
  const meatOptions = MEATS.filter((key) => products.some((p) => p.meats?.includes(key))).map((key) => ({ key, count: count("meats", (p) => Boolean(p.meats?.includes(key))) }));
  const storageOptions = (Object.keys(STORAGE_LABEL) as Storage[]).filter((s) => products.some((p) => p.storage === s));
  const packOptions = (Object.keys(PACK_LABEL) as Pack[]).filter((k) => products.some((p) => packOf(p) === k));
  const animalOptions = (["pes", "kocka"] as Animal[]).filter((a) => products.some((p) => p.animals.includes(a)));
  const active = f.meats.length + (f.animal ? 1 : 0) + (f.inStock ? 1 : 0) + f.storage.length + f.pack.length;

  // Vysunutý panel na mobilu: zámek scrollu a zavření klávesou Esc.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

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
  const reset = () => go({ ...EMPTY, sort: f.sort });

  const panel = (
    <div className="space-y-6">
      {meatOptions.length > 0 && (
        <Group title="Druh masa">
          {meatOptions.map((m) => (
            <Option key={m.key} checked={f.meats.includes(m.key)} onChange={() => go({ ...f, meats: toggle(f.meats, m.key) })} label={MEAT_LABEL[m.key]} count={m.count} className="capitalize" />
          ))}
        </Group>
      )}
      {animalOptions.length > 0 && (
        <Group title="Pro koho">
          <Option kind="radio" checked={!f.animal} onChange={() => go({ ...f, animal: null })} label="Psi i kočky" count={count("animal", () => true)} />
          {animalOptions.map((a) => (
            <Option key={a} kind="radio" checked={f.animal === a} onChange={() => go({ ...f, animal: a })} label={a === "pes" ? "Pro psy" : "Pro kočky"} count={count("animal", (p) => p.animals.includes(a))} />
          ))}
        </Group>
      )}
      <Group title="Dostupnost">
        <Option checked={f.inStock} onChange={() => go({ ...f, inStock: !f.inStock })} label="Jen skladem" count={count("inStock", (p) => p.inStock)} />
      </Group>
      {storageOptions.length > 1 && (
        <Group title="Skladování">
          {storageOptions.map((s) => (
            <Option key={s} checked={f.storage.includes(s)} onChange={() => go({ ...f, storage: toggle(f.storage, s) })} label={STORAGE_LABEL[s]} count={count("storage", (p) => p.storage === s)} />
          ))}
        </Group>
      )}
      {packOptions.length > 1 && (
        <Group title="Balení">
          {packOptions.map((k) => (
            <Option key={k} checked={f.pack.includes(k)} onChange={() => go({ ...f, pack: toggle(f.pack, k) })} label={PACK_LABEL[k]} count={count("pack", (p) => packOf(p) === k)} />
          ))}
        </Group>
      )}
      {active > 0 && (
        <button type="button" onClick={reset} className="inline-flex items-center gap-1 text-sm text-green underline">
          <X strokeWidth={1.75} className="h-3.5 w-3.5" /> Zrušit filtry ({active})
        </button>
      )}
    </div>
  );

  return (
    <div className="mt-6 lg:grid lg:grid-cols-[240px_1fr] lg:gap-8">
      {/* Boční panel na desktopu */}
      <aside className="hidden lg:block" aria-label="Filtry">
        {/* Přilepený u horního okraje; když je delší než okno, roluje uvnitř, aby byly všechny volby po ruce. */}
        <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[var(--radius-card)] border border-line bg-paper p-5">
          <p className="label mb-4 text-brick-text">Filtry</p>
          {panel}
        </div>
      </aside>

      {/* Vysouvací panel na mobilu */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Zavřít filtry" onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/40" />
          <div role="dialog" aria-modal="true" aria-label="Filtry" className="absolute inset-y-0 left-0 flex w-[min(320px,85vw)] flex-col bg-paper">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <p className="label text-brick-text">Filtry</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Zavřít" className="inline-flex h-10 w-10 items-center justify-center text-green">
                <X strokeWidth={1.75} className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">{panel}</div>
            <div className="border-t border-line p-4">
              <button type="button" onClick={() => setOpen(false)} className="label inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-control)] bg-green text-cream">
                Zobrazit {plural(list.length)}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setOpen(true)} className="label inline-flex min-h-10 items-center gap-1.5 rounded-[var(--radius-control)] border border-line bg-paper px-3 text-[11px] text-green lg:hidden">
              <SlidersHorizontal strokeWidth={1.75} className="h-4 w-4" /> Filtry{active > 0 && ` (${active})`}
            </button>
            <span className="text-sm text-muted" aria-live="polite">
              {plural(list.length)}
            </span>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted">
            <span className="hidden sm:inline">Řadit</span>
            <select value={f.sort} onChange={(e) => go({ ...f, sort: e.target.value as Sort })} aria-label="Řazení" className="min-h-10 w-auto py-1 text-sm">
              {(Object.keys(SORT_LABEL) as Sort[]).map((s) => (
                <option key={s} value={s}>
                  {SORT_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Aktivní filtry jako štítky (hlavně pro mobil, kde je panel zavřený) */}
        {active > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2 lg:hidden" aria-label="Aktivní filtry">
            {f.animal && <Tag onRemove={() => go({ ...f, animal: null })}>{f.animal === "pes" ? "Pro psy" : "Pro kočky"}</Tag>}
            {f.inStock && <Tag onRemove={() => go({ ...f, inStock: false })}>Jen skladem</Tag>}
            {f.meats.map((m) => (
              <Tag key={m} onRemove={() => go({ ...f, meats: toggle(f.meats, m) })}>
                <span className="capitalize">{MEAT_LABEL[m]}</span>
              </Tag>
            ))}
            {f.storage.map((s) => (
              <Tag key={s} onRemove={() => go({ ...f, storage: toggle(f.storage, s) })}>
                {STORAGE_LABEL[s]}
              </Tag>
            ))}
            {f.pack.map((k) => (
              <Tag key={k} onRemove={() => go({ ...f, pack: toggle(f.pack, k) })}>
                {PACK_LABEL[k]}
              </Tag>
            ))}
          </ul>
        )}

        <div className="mt-4">
          {list.length === 0 && active > 0 ? (
            <p className="text-muted">
              Tomuhle výběru nic neodpovídá.{" "}
              <button type="button" onClick={reset} className="text-green underline">
                Zrušit filtry
              </button>
            </p>
          ) : (
            <ProductGrid products={list} columns={3} />
          )}
        </div>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="label mb-2 text-[11px] text-muted">{title}</legend>
      <div className="space-y-0.5">{children}</div>
    </fieldset>
  );
}

function Option({ kind = "checkbox", checked, onChange, label, count, className = "" }: { kind?: "checkbox" | "radio"; checked: boolean; onChange: () => void; label: string; count: number; className?: string }) {
  const off = !checked && count === 0;
  return (
    <label className={`flex min-h-9 cursor-pointer items-center gap-2.5 text-sm ${off ? "text-muted/60" : "text-ink"}`}>
      <input type={kind} checked={checked} onChange={onChange} disabled={off} className="h-4 min-h-0 w-4 shrink-0 accent-green" />
      <span className={`flex-1 ${className}`}>{label}</span>
      <span className="text-xs text-muted">{count}</span>
    </label>
  );
}

function Tag({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return (
    <li>
      <button type="button" onClick={onRemove} className="inline-flex min-h-8 items-center gap-1 rounded-full border border-green bg-green px-3 text-xs text-cream">
        {children}
        <X strokeWidth={1.75} className="h-3 w-3" />
      </button>
    </li>
  );
}
