import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Cat, Dog, Droplets, Home, Leaf, Lightbulb, Package, PackageOpen, Scale, Snowflake, Store, Thermometer, Truck, Utensils } from "lucide-react";
import { BuyPanel } from "@/components/product/buy-panel";
import { DosePicker } from "@/components/product/dose-picker";
import { ProductCarousel } from "@/components/product/product-grid";
import { ProductImage } from "@/components/product/product-image";
import { JsonLd } from "@/components/seo/json-ld";
import { Flag, StockStatus } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { LinkArrow } from "@/components/ui/link-arrow";
import { ANIMAL_LABEL, LINE_INFO, STORAGE_LABEL, facetLabel, productFacets, productName } from "@/lib/catalog";
import { meatSplit, parseComposition, parseStorage, type StorageKind } from "@/lib/facts";
import { formatPct, formatPrice, formatWeight, pricePerKg } from "@/lib/format";
import { getProduct, getProducts, getProductsByLine } from "@/lib/products";
import { SITE_URL } from "@/lib/seo";
import { stockState } from "@/lib/stock";

type Props = { params: Promise<{ slug: string }> };

/** Procenta i pro malá čísla („0,02 %“). */
const pct = (v: number) => `${v.toLocaleString("cs-CZ", { maximumFractionDigits: v < 1 ? 2 : 1 })} %`;

const STORAGE_ICON: Record<StorageKind, typeof Snowflake> = { freezer: Snowflake, thaw: Droplets, open: PackageOpen, shelf: CalendarClock, place: Home, tip: Lightbulb };

/** Vodorovné pruhy s procenty: první (nebo označený) zeleně, ostatní okrově. `scale` je 100 % šířky. */
function Bars({ rows, scale }: { rows: { label: string; pct: number; strong?: boolean }[]; scale: number }) {
  return (
    <ul className="flex flex-col gap-3.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,1fr)_56px] items-center gap-x-3.5 gap-y-1 sm:grid-cols-[180px_minmax(0,1fr)_56px]">
          <span className="text-[15px]/[21px] font-semibold text-ink">{r.label}</span>
          <span className="order-last col-span-2 h-3.5 overflow-hidden rounded-control bg-cream sm:order-none sm:col-span-1" aria-hidden>
            <span className={`block h-full ${r.strong ? "bg-green" : "bg-ochre"}`} style={{ width: `${Math.min(100, (r.pct / scale) * 100)}%` }} />
          </span>
          <span className="text-right text-[15px] font-bold text-green">{pct(r.pct)}</span>
        </li>
      ))}
    </ul>
  );
}

export async function generateStaticParams() {
  return (await getProducts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};
  return {
    title: productName(product),
    description: product.intro,
    alternates: { canonical: `${SITE_URL}/produkt/${product.slug}` },
    openGraph: { title: productName(product), description: product.intro, images: product.image ? [product.image] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const line = LINE_INFO[product.line];
  const stock = stockState(product);
  const onSale = product.originalPriceCzk !== undefined && product.originalPriceCzk > product.priceCzk;
  const byWeight = product.unit === "kg";
  const all = await getProducts();
  const bySlug = (slugs: string[] = []) => slugs.map((s) => all.find((p) => p.slug === s)).filter((p): p is NonNullable<typeof p> => Boolean(p));
  const upsell = bySlug(product.upsell);
  const crosssell = bySlug(product.crosssell);
  const related = (await getProductsByLine(product.line))
    .filter((p) => p.slug !== product.slug && !upsell.some((u) => u.slug === p.slug) && !crosssell.some((c) => c.slug === p.slug))
    .slice(0, 8);
  const producer = product.producer && !product.producer.startsWith("[") ? product.producer : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: productName(product),
    description: product.intro,
    image: product.image ?? undefined,
    brand: producer ? { "@type": "Brand", name: producer } : undefined,
    category: line.name,
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/produkt/${product.slug}`,
      priceCurrency: "CZK",
      price: product.priceCzk,
      availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };


  const pickableDose = product.dose && (product.dose.pes ?? product.dose.kocka) && ["tiers", "body"].includes((product.dose.pes ?? product.dose.kocka)!.per) ? product.dose : null;
  const facts = parseComposition(product.composition);
  // U masa a BARFu sečteme podíl masa (s kostmi) a vnitřností z procent surovin od výrobce.
  const split = ["barf", "kosti", "maso"].includes(product.line) && product.meatPct === undefined ? meatSplit(facts.ingredients) : null;
  const keyNumbers = [
    product.meatPct !== undefined && { value: formatPct(product.meatPct), label: "masa a vnitřností" },
    split && split.meat > 0 && { value: formatPct(split.meat), label: split.meatLabel },
    split && split.cartilage > 0 && { value: formatPct(split.cartilage), label: "chrupavky" },
    product.nutrition?.bonePct !== undefined && { value: formatPct(product.nutrition.bonePct), label: split ? "z toho jedlé kosti" : "jedlé kosti" },
    split ? split.organs > 0 && { value: formatPct(split.organs), label: "vnitřností" } : product.nutrition?.organPct !== undefined && { value: formatPct(product.nutrition.organPct), label: "vnitřností" },
    product.nutrition?.kcalPer100g !== undefined && { value: `${product.nutrition.kcalPer100g.toLocaleString("cs-CZ")} kcal`, label: "ve 100 g" },
  ].filter((n): n is { value: string; label: string } => Boolean(n));
  const facets = productFacets(product);
  // Sekce pod nákupem se střídají papírová / bílá (nákup nahoře je bílý), v pořadí, v jakém se zobrazí.
  const withPct = facts.ingredients.filter((i) => i.pct !== undefined && i.pct >= 1).slice(0, 6);
  const otherIngredients = facts.ingredients.filter((i) => !withPct.includes(i)).slice(0, 12).map((i) => i.name.charAt(0).toLowerCase() + i.name.slice(1));
  const parsedAnything = withPct.length > 0 || facts.nutrients.length > 0 || facts.minor.length > 0 || facts.micros.length > 0;
  const storage = parseStorage(product.storageNote);
  const tiles = [
    { icon: product.animals.includes("kocka") && !product.animals.includes("pes") ? Cat : Dog, text: product.animals.map((a) => ANIMAL_LABEL[a]).join(" a ").replace(" a Pro ", " a ") },
    { icon: product.storage === "mrazene" ? Snowflake : product.storage === "chlazene" ? Thermometer : Package, text: STORAGE_LABEL[product.storage] },
    { icon: Scale, text: byWeight ? "Na váhu" : formatWeight(product.weightGrams) },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      {/* Horní část jako úvod: krémový přechod, fotka v bílé kartě vlevo, nákup v bílé kartě vpravo. */}
      <section className="bg-gradient-to-b from-cream to-paper px-5 pt-5 pb-10 md:pb-14">
        <div className="mx-auto max-w-site">
          <Breadcrumb items={[{ href: "/", label: "Úvod" }, { href: `/rada/${line.slug}`, label: line.name }, { label: productName(product) }]} />

          <div className="mt-6 grid gap-6 md:grid-cols-2 md:items-start md:gap-10">
            {/* Fotky produktů mají bílé pozadí, proto bílá karta. */}
            <div className="relative overflow-hidden rounded-panel border border-line bg-white p-6 md:p-8">
              {(product.isNew || onSale) && (
                <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-1.5">
                  {product.isNew && <Flag kind="new" />}
                  {onSale && <Flag kind="sale" />}
                </div>
              )}
              <ProductImage product={product} sizes="(min-width: 768px) 560px, 100vw" className="h-[280px] md:h-[420px]" priority />
              {product.meatPct !== undefined && (
                <div className="absolute right-4 bottom-4 flex size-22 flex-col items-center justify-center rounded-full bg-green text-center text-cream md:size-24">
                  <span className="font-display text-[1.5rem] leading-none font-black">{formatPct(product.meatPct)}</span>
                  <span className="text-[11px] font-semibold">masa</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-5">
              <div>
                <p className="text-small font-semibold text-muted">
                  <Link href={`/rada/${line.slug}`} className="hover:text-brick-text hover:underline">
                    {line.name}
                  </Link>
                  {facets.map((m) => (
                    <span key={m}>
                      {" · "}
                      <Link href={`/rada/${line.slug}/${m}`} className="hover:text-brick-text hover:underline">
                        {facetLabel(product.line, m)}
                      </Link>
                    </span>
                  ))}
                </p>
                <h1 className="mt-1.5 font-display text-[2rem] leading-[1.1] font-black text-ink md:text-[2.625rem]">{productName(product)}</h1>
                {product.intro && <p className="mt-3 text-[1.0625rem]">{product.intro}</p>}
              </div>

              <ul className="flex flex-wrap gap-2">
                {tiles.map((t) => (
                  <li key={t.text} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-small font-semibold text-green">
                    <t.icon className="size-4" strokeWidth={1.75} aria-hidden />
                    {t.text}
                  </li>
                ))}
              </ul>

              <div className="rounded-panel border border-line bg-white p-5 md:p-6">
                <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                  <div>
                    {onSale && <s className="block text-small text-muted">{formatPrice(product.originalPriceCzk!)}</s>}
                    <span className={`font-display text-[2.25rem] leading-none font-black ${onSale ? "text-brick-text" : "text-green"}`}>
                      {formatPrice(product.priceCzk)}
                      {byWeight && <span className="text-[1rem] font-bold text-muted"> / kg</span>}
                    </span>
                    {!byWeight && product.weightGrams >= 50 && (
                      <span className="mt-1 block text-small text-muted">
                        {formatWeight(product.weightGrams)} · {formatPrice(pricePerKg(product.priceCzk, product.weightGrams))}/kg
                      </span>
                    )}
                  </div>
                  <StockStatus stock={stock} />
                </div>
                <div className="mt-5">
                  {byWeight ? <p className="text-small">Toto zboží vážíme na místě, přes e-shop ho zatím objednat nejde. Stavte se, nebo napište, kolik chcete připravit.</p> : <BuyPanel product={product} />}
                </div>
                <ul className="mt-5 grid gap-2 border-t border-line pt-4 text-small sm:grid-cols-2">
                  <li className="inline-flex items-center gap-2">
                    <Truck className="size-4.5 shrink-0 text-brick" strokeWidth={1.75} aria-hidden />
                    <Link href="/doprava" className="hover:text-brick-text hover:underline">
                      Rozvážíme sami po Kladensku
                    </Link>
                  </li>
                  <li className="inline-flex items-center gap-2">
                    <Store className="size-4.5 shrink-0 text-brick" strokeWidth={1.75} aria-hidden />
                    Osobní odběr v prodejně
                  </li>
                </ul>
              </div>

              {product.benefit && (
                <div className="flex items-start gap-4 rounded-panel bg-green p-5 text-cream">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-ochre">
                    <Leaf className="size-5.5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold tracking-wide text-ochre uppercase">Co to {product.animals.includes("pes") ? "psovi" : "kočce"} dá</p>
                    <p className="font-display text-[1.25rem] font-bold text-white">{product.benefit}</p>
                    {product.benefitDetail && <p className="mt-1 text-small text-cream/85">{product.benefitDetail}</p>}
                  </div>
                </div>
              )}
              {producer && <p className="text-small text-muted">Výrobce: {producer}</p>}
            </div>
          </div>
        </div>
      </section>

      {pickableDose && (
        <section className="border-y border-line bg-white px-5 py-10 md:py-12">
          <div className="mx-auto max-w-site">
            <h2 className="font-display text-display-md text-ink">Kolik dát vašemu {pickableDose.pes ? "psovi" : "kočce"}</h2>
            <p className="mt-2 mb-6">Vyberte velikost. Dávka je na den, zamíchejte ji do krmiva.</p>
            <DosePicker dose={pickableDose} />
          </div>
        </section>
      )}

      {/* Složení a podávání vedle sebe v bílých kartách, ať stránka není dlouhá. */}
      {((product.composition || keyNumbers.length > 0) || product.dosage || storage.length > 0) && (
        <section className="px-5 pt-2 pb-10 md:pb-14">
          <div className="mx-auto grid max-w-site items-start gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            {(product.composition || keyNumbers.length > 0) && (
              <div className="rounded-panel border border-line bg-white p-6 md:p-8">
                <h2 className="font-display text-display-md text-ink">Co je uvnitř</h2>
                <p className="mt-1 text-small text-muted">Složení podle výrobce</p>
                {keyNumbers.length > 0 && (
                  <ul className="mt-6 flex flex-wrap gap-3">
                    {keyNumbers.map((n) => (
                      <li key={n.label} className="min-w-[120px] flex-1 rounded-card bg-paper px-4 py-3">
                        <p className="font-display text-[1.75rem] leading-tight font-black text-green">{n.value}</p>
                        <p className="text-small">{n.label}</p>
                      </li>
                    ))}
                  </ul>
                )}
                {withPct.length > 0 && (
                  <div className="mt-7">
                    <h3 className="mb-4 text-[1rem] font-bold text-ink">Hlavní suroviny</h3>
                    <Bars rows={withPct.map((i) => ({ label: i.name, pct: i.pct!, strong: i === withPct[0] }))} scale={100} />
                    {otherIngredients.length > 0 && (
                      <p className="mt-4 text-small">
                        <span className="font-semibold text-ink">Dál obsahuje: </span>
                        {otherIngredients.join(", ")}
                        {facts.ingredients.length - withPct.length > otherIngredients.length && " a další"}.
                      </p>
                    )}
                  </div>
                )}
                {(facts.nutrients.length > 0 || facts.minor.length > 0) && (
                  <div className="mt-7">
                    <h3 className="mb-4 text-[1rem] font-bold text-ink">Živiny</h3>
                    {facts.nutrients.length > 0 && <Bars rows={facts.nutrients.map((n) => ({ label: n.label, pct: n.pct, strong: n.key === "protein" }))} scale={Math.max(...facts.nutrients.map((n) => n.pct)) > 50 ? 100 : 50} />}
                    {facts.minor.length > 0 && (
                      <ul className="mt-4 flex flex-wrap gap-2">
                        {facts.minor.map((n) => (
                          <li key={n.key} className="rounded-full bg-paper px-3.5 py-1 text-small">
                            {n.label} <span className="font-bold text-green">{pct(n.pct)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {facts.micros.length > 0 && (
                  <div className="mt-7">
                    <h3 className="mb-4 text-[1rem] font-bold text-ink">
                      Vitamíny, minerály a účinné látky{facts.microsPer && <span className="font-normal text-muted"> {facts.microsPer}</span>}
                    </h3>
                    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {facts.micros.map((m) => (
                        <li key={m.name} className="rounded-card bg-paper p-3 text-center">
                          <p className="text-[15px]/[20px] font-bold text-green">{m.name}</p>
                          <p className="text-small">{m.amount}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {product.composition &&
                  (parsedAnything && product.composition.length < 140 && facts.ingredients.every((i) => i.pct !== undefined) ? null : parsedAnything ? (
                    <details className="mt-6">
                      <summary className="cursor-pointer list-none text-button text-brick-text hover:underline">Celé složení od výrobce</summary>
                      <p className="mt-2 text-small">{product.composition}</p>
                    </details>
                  ) : (
                    <p className="mt-6">{product.composition}</p>
                  ))}
              </div>
            )}

            {(product.dosage || storage.length > 0) && (
              <div className="flex flex-col gap-5 rounded-panel bg-green p-6 text-cream md:p-8">
                <h2 className="font-display text-display-md text-white">Jak podávat a skladovat</h2>
                {product.dosage && (
                  <div className="flex items-start gap-3">
                    <Utensils className="mt-0.5 size-5 shrink-0 text-ochre" strokeWidth={1.75} aria-hidden />
                    <p className="text-[15px]/[24px] text-cream/90">{product.dosage}</p>
                  </div>
                )}
                {storage.length > 0 && (
                  <ul className="flex flex-col gap-3">
                    {storage.map((t) => {
                      const Icon = STORAGE_ICON[t.kind];
                      return (
                        <li key={t.kind} className="flex items-start gap-3 rounded-control bg-white/5 p-3.5">
                          <Icon className="mt-0.5 size-5 shrink-0 text-ochre" strokeWidth={1.75} aria-hidden />
                          <div>
                            <p className="text-small font-bold text-white">
                              {t.title}
                              {t.value && <span className="font-display text-ochre"> {t.value}</span>}
                            </p>
                            <p className="text-small text-cream/85">{t.text}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p className="mt-auto text-small text-cream/75">
                  Dávkování je orientační, přesnou dávku pro vaše zvíře spočítá{" "}
                  <Link href="/krmeni-na-miru" className="font-semibold text-white underline">
                    plán Krmení na míru
                  </Link>
                  . Při zdravotních potížích se poraďte s veterinářem.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {[
        { list: upsell, title: "Vyplatí se víc", label: "Lepší volba" },
        { list: crosssell, title: "Zákazníci k tomu přidávají", label: "Hodí se k tomu" },
        { list: related, title: `Další z řady ${line.name}`, label: `Další z řady ${line.name}`, more: true },
      ]
        .filter((b) => b.list.length > 0)
        .map((b, i) => (
          <section key={b.label} className={`px-5 py-10 md:py-12 ${i % 2 === 0 ? "border-y border-line bg-white" : ""}`}>
            <div className="mx-auto max-w-site">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <h2 className="font-display text-display-md text-ink">{b.title}</h2>
                {b.more && <LinkArrow href={`/rada/${line.slug}`}>Vše z řady</LinkArrow>}
              </div>
              <ProductCarousel products={b.list} label={b.label} />
            </div>
          </section>
        ))}
    </>
  );
}
