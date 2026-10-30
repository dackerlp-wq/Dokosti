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
import { Section, SectionHeader } from "@/components/ui/section";
import { ANIMAL_LABEL, LINE_INFO, STORAGE_LABEL, facetLabel, productFacets, productName } from "@/lib/catalog";
import { parseComposition, parseStorage, type StorageKind } from "@/lib/facts";
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
  const keyNumbers = [
    product.meatPct !== undefined && { value: formatPct(product.meatPct), label: "masa a vnitřností" },
    product.nutrition?.bonePct !== undefined && { value: formatPct(product.nutrition.bonePct), label: "jedlé kosti" },
    product.nutrition?.organPct !== undefined && { value: formatPct(product.nutrition.organPct), label: "vnitřností" },
    product.nutrition?.kcalPer100g !== undefined && { value: `${product.nutrition.kcalPer100g.toLocaleString("cs-CZ")} kcal`, label: "ve 100 g" },
  ].filter((n): n is { value: string; label: string } => Boolean(n));
  const facets = productFacets(product);
  // Sekce pod nákupem se střídají papírová / bílá (nákup nahoře je bílý), v pořadí, v jakém se zobrazí.
  const facts = parseComposition(product.composition);
  const withPct = facts.ingredients.filter((i) => i.pct !== undefined && i.pct >= 1).slice(0, 6);
  const otherIngredients = facts.ingredients.filter((i) => !withPct.includes(i)).slice(0, 12).map((i) => i.name.charAt(0).toLowerCase() + i.name.slice(1));
  const parsedAnything = withPct.length > 0 || facts.nutrients.length > 0 || facts.minor.length > 0 || facts.micros.length > 0;
  const storage = parseStorage(product.storageNote);
  const shown = { dose: !!pickableDose, comp: !!product.composition || keyNumbers.length > 0, how: !!(product.dosage || storage.length > 0), upsell: upsell.length > 0, cross: crosssell.length > 0, related: related.length > 0 };
  const tones = {} as Record<keyof typeof shown, "white" | "paper">;
  (Object.keys(shown) as (keyof typeof shown)[]).filter((k) => shown[k]).forEach((k, i) => (tones[k] = i % 2 === 0 ? "paper" : "white"));
  const tiles = [
    { icon: product.animals.includes("kocka") && !product.animals.includes("pes") ? Cat : Dog, text: product.animals.map((a) => ANIMAL_LABEL[a]).join(" a ").replace(" a Pro ", " a ") },
    { icon: product.storage === "mrazene" ? Snowflake : product.storage === "chlazene" ? Thermometer : Package, text: STORAGE_LABEL[product.storage] },
    { icon: Scale, text: byWeight ? "Na váhu" : formatWeight(product.weightGrams) },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <div className="mx-auto max-w-site px-5 pt-5 pb-10 md:pb-15">
        <Breadcrumb items={[{ href: "/", label: "Úvod" }, { href: `/rada/${line.slug}`, label: line.name }, { label: productName(product) }]} />

        <div className="mt-7.5 grid gap-10 md:grid-cols-2 md:items-start">
          <div className="flex flex-col gap-5">
            <div className="relative">
              <ProductImage product={product} sizes="(min-width: 768px) 50vw, 100vw" className="h-[300px] md:h-[435px]" priority />
              {product.meatPct !== undefined && (
                <div className="absolute bottom-5 left-5 flex size-26 flex-col items-center justify-center rounded-full bg-green text-center text-cream">
                  <span className="text-[26px]/[28px] font-extrabold">{formatPct(product.meatPct)}</span>
                  <span className="text-[12px]/[16px] font-semibold">masa</span>
                </div>
              )}
            </div>
            <ul className="grid grid-cols-3 gap-2.5">
              {tiles.map((t) => (
                <li key={t.text} className="flex flex-col items-center gap-1.5 rounded-card bg-paper px-2.5 py-3.5 text-center">
                  <t.icon className="size-7 text-green" strokeWidth={1.75} aria-hidden />
                  <span className="text-[13px]/[18px] font-semibold text-green">{t.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            {(product.isNew || onSale) && (
              <div className="mb-3.5 flex flex-wrap gap-2.5">
                {product.isNew && <Flag kind="new" />}
                {onSale && <Flag kind="sale" />}
              </div>
            )}
            <p className="text-eyebrow text-muted uppercase">
              {line.name}
              {facets.length > 0 && (
                <>
                  {" · "}
                  {facets.map((m, i) => (
                    <span key={m}>
                      {i > 0 && ", "}
                      <Link href={`/rada/${line.slug}/${m}`} className="hover:text-brick-text hover:underline">
                        {facetLabel(product.line, m)}
                      </Link>
                    </span>
                  ))}
                </>
              )}
            </p>
            <h1 className="mb-3.5 font-display text-display-lg text-green md:text-display-xl">{productName(product)}</h1>
            {product.intro && <p className="mb-5">{product.intro}</p>}

            {product.benefit && (
              <div className="mb-6 flex items-start gap-4 rounded-card bg-paper p-5">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-green text-cream">
                  <Leaf className="size-7" strokeWidth={1.5} aria-hidden />
                </span>
                <div>
                  <p className="text-eyebrow text-muted uppercase">Co to {product.animals.includes("pes") ? "psovi" : "kočce"} dá</p>
                  <p className="text-heading-md text-green">{product.benefit}</p>
                  {product.benefitDetail && <p className="mt-1.5 text-[15px]/[24px]">{product.benefitDetail}</p>}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1.5 border-t border-line pt-5">
              <span className={`text-price-lg ${onSale ? "text-brick-text" : "text-green"}`}>
                {formatPrice(product.priceCzk)}
                {byWeight && <span className="text-small"> za kg</span>}
              </span>
              {onSale && <s className="text-small">{formatPrice(product.originalPriceCzk!)}</s>}
              {!byWeight && product.weightGrams >= 50 && (
                <span className="text-small">
                  {formatWeight(product.weightGrams)} · {formatPrice(pricePerKg(product.priceCzk, product.weightGrams))}/kg
                </span>
              )}
              <StockStatus stock={stock} />
            </div>

            <div className="mt-4">
              {byWeight ? <p className="text-small">Toto zboží vážíme na místě, přes e-shop ho zatím objednat nejde. Stavte se, nebo napište, kolik chcete připravit.</p> : <BuyPanel product={product} />}
            </div>

            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-small">
              <li className="inline-flex items-center gap-1.5">
                <Truck className="size-4.5 text-green" strokeWidth={1.75} aria-hidden />
                <Link href="/doprava" className="hover:text-brick-text hover:underline">
                  Rozvážíme sami po Kladensku
                </Link>
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Store className="size-4.5 text-green" strokeWidth={1.75} aria-hidden />
                Osobní odběr v prodejně
              </li>
              {producer && <li>Výrobce: {producer}</li>}
            </ul>
          </div>
        </div>
      </div>

      {pickableDose && (
        <Section tone={tones.dose}>
          <SectionHeader eyebrow="Dávkování" title={`Kolik dát vašemu ${pickableDose.pes ? "psovi" : "kočce"}`}>
            <p>Vyberte velikost. Dávka je na den, zamíchejte ji do krmiva.</p>
          </SectionHeader>
          <DosePicker dose={pickableDose} />
        </Section>
      )}

      {(product.composition || keyNumbers.length > 0) && (
        <Section tone={tones.comp}>
          <SectionHeader eyebrow="Složení podle výrobce" title="Co je uvnitř" />
          {keyNumbers.length > 0 && (
            <ul className="mx-auto mb-10 grid max-w-narrow grid-cols-2 gap-3.5 md:grid-cols-4">
              {keyNumbers.map((n) => (
                <li key={n.label} className="rounded-card border border-line bg-white p-4 text-center">
                  <p className="text-[26px]/[32px] font-extrabold text-green">{n.value}</p>
                  <p className="text-small">{n.label}</p>
                </li>
              ))}
            </ul>
          )}
          {(withPct.length > 0 || facts.nutrients.length > 0 || facts.minor.length > 0) && (
            <div className="grid gap-10 md:grid-cols-2">
              {withPct.length > 0 && (
                <div>
                  <h3 className="mb-5 text-heading-md font-bold text-green">Hlavní suroviny</h3>
                  <Bars rows={withPct.map((i) => ({ label: i.name, pct: i.pct!, strong: i === withPct[0] }))} scale={100} />
                  {otherIngredients.length > 0 && (
                    <p className="mt-5 text-small">
                      <span className="font-semibold text-ink">Dál obsahuje: </span>
                      {otherIngredients.join(", ")}
                      {facts.ingredients.length - withPct.length > otherIngredients.length && " a další"}.
                    </p>
                  )}
                </div>
              )}
              {(facts.nutrients.length > 0 || facts.minor.length > 0) && (
                <div>
                  <h3 className="mb-5 text-heading-md font-bold text-green">Živiny</h3>
                  {facts.nutrients.length > 0 && <Bars rows={facts.nutrients.map((n) => ({ label: n.label, pct: n.pct, strong: n.key === "protein" }))} scale={Math.max(...facts.nutrients.map((n) => n.pct)) > 50 ? 100 : 50} />}
                  {facts.minor.length > 0 && (
                    <ul className="mt-5 flex flex-wrap gap-2">
                      {facts.minor.map((n) => (
                        <li key={n.key} className="rounded-full bg-paper px-3.5 py-1 text-small">
                          {n.label} <span className="font-bold text-green">{pct(n.pct)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
          {facts.micros.length > 0 && (
            <div className="mt-10">
              <h3 className="mb-5 text-heading-md font-bold text-green">
                Vitamíny, minerály a účinné látky{facts.microsPer && <span className="font-normal text-muted"> {facts.microsPer}</span>}
              </h3>
              <ul className="grid grid-cols-2 gap-2.5 xs:grid-cols-3 lg:grid-cols-6">
                {facts.micros.map((m) => (
                  <li key={m.name} className="rounded-card border border-line bg-white p-3.5 text-center">
                    <p className="text-[15px]/[20px] font-bold text-green">{m.name}</p>
                    <p className="text-small">{m.amount}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {product.composition && (
            parsedAnything ? (
              <details className="group mx-auto mt-10 max-w-text">
                <summary className="cursor-pointer list-none text-center text-button text-brick-text hover:underline">Celé složení od výrobce</summary>
                <p className="mt-3.5 text-small">{product.composition}</p>
              </details>
            ) : (
              <p className="mx-auto max-w-text">{product.composition}</p>
            )
          )}
        </Section>
      )}

      {(product.dosage || storage.length > 0) && (
        <Section tone={tones.how}>
          <SectionHeader title="Jak podávat a skladovat" />
          {storage.length > 0 && (
            <ul className={`grid gap-3.5 xs:grid-cols-2 ${storage.length >= 4 ? "lg:grid-cols-4" : storage.length === 3 ? "lg:grid-cols-3" : ""}`}>
              {storage.map((t) => {
                const Icon = STORAGE_ICON[t.kind];
                return (
                  <li key={t.kind} className="flex flex-col items-center rounded-card border border-line bg-white p-5 text-center">
                    <span className="mb-3.5 flex size-14 items-center justify-center rounded-full bg-green text-cream">
                      <Icon className="size-7" strokeWidth={1.5} aria-hidden />
                    </span>
                    <p className="text-eyebrow text-muted uppercase">{t.title}</p>
                    {t.value && <p className="text-[26px]/[32px] font-extrabold text-green">{t.value}</p>}
                    <p className="mt-1.5 text-[14px]/[22px]">{t.text}</p>
                  </li>
                );
              })}
            </ul>
          )}
          {product.dosage && (
            <div className="mx-auto mt-10 flex max-w-text items-start gap-4 rounded-card bg-white p-5 shadow-card">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-paper text-green">
                <Utensils className="size-7" strokeWidth={1.5} aria-hidden />
              </span>
              <div>
                <h3 className="mb-1 text-heading-md font-bold text-green">Podávání</h3>
                <p className="text-[15px]/[26px]">{product.dosage}</p>
              </div>
            </div>
          )}
          <p className="mt-7.5 text-center text-small">
            Dávkování je orientační, přesnou dávku spočítá{" "}
            <Link href="/kalkulacka" className="text-brick-text underline">
              kalkulačka dávky
            </Link>
            . Při zdravotních potížích se poraďte s veterinářem.
          </p>
        </Section>
      )}

      {upsell.length > 0 && (
        <Section tone={tones.upsell}>
          <SectionHeader eyebrow="Lepší volba" title="Vyplatí se víc" />
          <ProductCarousel products={upsell} label="Lepší volba" />
        </Section>
      )}
      {crosssell.length > 0 && (
        <Section tone={tones.cross}>
          <SectionHeader eyebrow="Hodí se k tomu" title="Zákazníci k tomu přidávají" />
          <ProductCarousel products={crosssell} label="Hodí se k tomu" />
        </Section>
      )}
      {related.length > 0 && (
        <Section tone={tones.related}>
          <SectionHeader eyebrow={line.name} title="Další z řady" more={<LinkArrow href={`/rada/${line.slug}`}>Vše z řady</LinkArrow>} />
          <ProductCarousel products={related} label={`Další z řady ${line.name}`} />
        </Section>
      )}
    </>
  );
}
