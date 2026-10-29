import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyPanel } from "@/components/product/buy-panel";
import { ProductCarousel } from "@/components/product/product-grid";
import { ProductImage } from "@/components/product/product-image";
import { JsonLd } from "@/components/seo/json-ld";
import { Flag, StockStatus } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { LinkArrow } from "@/components/ui/link-arrow";
import { Section, SectionHeader } from "@/components/ui/section";
import { ANIMAL_LABEL, LINE_INFO, STORAGE_LABEL, facetLabel, productFacets, productName } from "@/lib/catalog";
import { formatPct, formatPrice, formatWeight, pricePerKg } from "@/lib/format";
import { getProduct, getProducts, getProductsByLine } from "@/lib/products";
import { SITE_URL } from "@/lib/seo";
import { stockState } from "@/lib/stock";

type Props = { params: Promise<{ slug: string }> };

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

  const description: { title: string; text: string }[] = [
    { title: "Složení", text: product.composition },
    { title: "Podávání", text: product.dosage },
    { title: "Skladování", text: product.storageNote },
  ].filter((d) => d.text);

  return (
    <>
      <JsonLd data={jsonLd} />
      <div className="mx-auto max-w-site px-5 pt-5 pb-10 md:pb-15">
        <Breadcrumb items={[{ href: "/", label: "Úvod" }, { href: `/rada/${line.slug}`, label: line.name }, { label: productName(product) }]} />

        <div className="mt-7.5 grid gap-10 md:grid-cols-2 md:items-start">
          {/* Galerie: zatím jedna fotka, vyříznutá na bílé. */}
          <ProductImage product={product} sizes="(min-width: 768px) 50vw, 100vw" className="h-[300px] md:h-[435px]" priority />

          <div>
            {(product.isNew || onSale) && (
              <div className="mb-3.5 flex flex-wrap gap-2.5">
                {product.isNew && <Flag kind="new" />}
                {onSale && <Flag kind="sale" />}
              </div>
            )}
            <p className="text-eyebrow text-muted uppercase">{line.name}</p>
            <h1 className="mb-3.5 font-display text-display-lg text-green md:text-display-xl">{productName(product)}</h1>
            <p className="mb-5">{product.intro}</p>

            <dl className="mb-7.5 grid grid-cols-[120px_1fr] gap-x-5 gap-y-2.5 border-t border-line pt-5 md:grid-cols-[150px_1fr]">
              <dt className="text-label text-muted">Cena:</dt>
              <dd>
                <span className={`text-price-lg ${onSale ? "text-brick-text" : "text-green"}`}>{formatPrice(product.priceCzk)}</span>
                {byWeight && <span className="text-small"> za kg</span>}
                {onSale && <s className="ml-2.5 text-small">{formatPrice(product.originalPriceCzk!)}</s>}
              </dd>
              {product.meatPct !== undefined && (
                <>
                  <dt className="text-label text-muted">Podíl masa:</dt>
                  <dd>
                    <span className="font-semibold text-green">{formatPct(product.meatPct)}</span> masa a vnitřností
                    <span className="text-small text-muted"> · podle složení výrobce</span>
                  </dd>
                </>
              )}
              <dt className="text-label text-muted">Balení:</dt>
              <dd>
                {byWeight ? "na váhu, vážíme v prodejně" : `${formatWeight(product.weightGrams)}, ${STORAGE_LABEL[product.storage].toLowerCase()}`}
                {!byWeight && product.weightGrams >= 50 && <span className="text-small"> · {formatPrice(pricePerKg(product.priceCzk, product.weightGrams))}/kg</span>}
              </dd>
              <dt className="text-label text-muted">Dostupnost:</dt>
              <dd>
                <StockStatus stock={stock} />
              </dd>
              <dt className="text-label text-muted">Pro koho:</dt>
              <dd>
                {product.animals.map((a) => ANIMAL_LABEL[a].replace("Pro ", "")).join(" a ")}
                {productFacets(product).length > 0 && (
                  <>
                    {" · "}
                    {productFacets(product).map((m, i) => (
                      <span key={m}>
                        {i > 0 && ", "}
                        <Link href={`/rada/${line.slug}/${m}`} className="text-brick-text hover:underline">
                          {facetLabel(product.line, m)}
                        </Link>
                      </span>
                    ))}
                  </>
                )}
              </dd>
              {producer && (
                <>
                  <dt className="text-label text-muted">Výrobce:</dt>
                  <dd>{producer}</dd>
                </>
              )}
            </dl>

            {byWeight ? <p className="text-small">Toto zboží vážíme na místě, přes e-shop ho zatím objednat nejde. Stavte se, nebo napište, kolik chcete připravit.</p> : <BuyPanel product={product} />}

            <p className="mt-5 text-small">
              Dávkování je orientační. Kolik přesně dávat vašemu zvířeti spočítá{" "}
              <Link href="/kalkulacka" className="text-brick-text underline">
                kalkulačka dávky
              </Link>
              . Při zdravotních potížích se poraďte s veterinářem.
            </p>
          </div>
        </div>

        {description.length > 0 && (
          <div className="mx-auto mt-10 max-w-text border-t border-line pt-10 md:mt-15">
            {description.map((d) => (
              <section key={d.title} className="mb-7.5">
                <h2 className="mb-2.5 text-heading-md font-bold text-green">{d.title}</h2>
                <p>{d.text}</p>
              </section>
            ))}
          </div>
        )}
      </div>

      {upsell.length > 0 && (
        <Section tone="paper">
          <SectionHeader eyebrow="Lepší volba" title="Vyplatí se víc" />
          <ProductCarousel products={upsell} label="Lepší volba" />
        </Section>
      )}
      {crosssell.length > 0 && (
        <Section tone={upsell.length > 0 ? "white" : "paper"}>
          <SectionHeader eyebrow="Hodí se k tomu" title="Zákazníci k tomu přidávají" />
          <ProductCarousel products={crosssell} label="Hodí se k tomu" />
        </Section>
      )}
      {related.length > 0 && (
        <Section tone={(upsell.length > 0) !== (crosssell.length > 0) ? "white" : "paper"}>
          <SectionHeader eyebrow={line.name} title="Další z řady" more={<LinkArrow href={`/rada/${line.slug}`}>Vše z řady</LinkArrow>} />
          <ProductCarousel products={related} label={`Další z řady ${line.name}`} />
        </Section>
      )}
    </>
  );
}
