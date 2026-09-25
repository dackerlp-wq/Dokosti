import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_URL } from "@/lib/seo";
import { ProductGrid } from "@/components/product/product-grid";
import { ProductImage } from "@/components/product/product-image";
import { Badge } from "@/components/ui/badge";
import { ANIMAL_LABEL, LINE_INFO, STORAGE_LABEL, productName } from "@/lib/catalog";
import { getProduct, getProducts, getProductsByLine } from "@/lib/products";
import { formatPrice, formatWeight, pricePerKg } from "@/lib/format";

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
  const onSale = product.originalPriceCzk !== undefined && product.originalPriceCzk > product.priceCzk;
  const all = await getProducts();
  const bySlug = (slugs: string[] = []) => slugs.map((s) => all.find((p) => p.slug === s)).filter((p): p is NonNullable<typeof p> => Boolean(p));
  const upsell = bySlug(product.upsell);
  const crosssell = bySlug(product.crosssell);
  const related = (await getProductsByLine(product.line))
    .filter((p) => p.slug !== product.slug && !upsell.some((u) => u.slug === p.slug) && !crosssell.some((c) => c.slug === p.slug))
    .slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: productName(product),
    description: product.intro,
    image: product.image ?? undefined,
    brand: product.producer && !product.producer.startsWith("[") ? { "@type": "Brand", name: product.producer } : undefined,
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

  return (
    <div className="container-dk py-6 md:py-10">
      <JsonLd data={jsonLd} />
      <nav aria-label="Drobečková navigace" className="label mb-4 flex flex-wrap gap-2 text-[11px] text-muted">
        <Link href="/" className="hover:text-green hover:underline">
          Úvod
        </Link>
        <span aria-hidden>·</span>
        <Link href={`/rada/${line.slug}`} className="hover:text-green hover:underline">
          {line.name}
        </Link>
        <span aria-hidden>·</span>
        <span className="text-ink">{product.variant}</span>
      </nav>

      <div className="grid gap-6 md:grid-cols-[minmax(0,420px)_1fr] md:gap-10">
        <div className="rounded-[var(--radius-card)] border border-line bg-paper p-3">
          <ProductImage product={product} sizes="(min-width: 768px) 50vw, 100vw" />
        </div>

        <div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            <Badge kind={product.inStock ? "skladem" : "neutral"}>
              {product.inStock ? "Skladem" : "Momentálně není"}
            </Badge>
            {product.isNew && <Badge kind="novinka">Novinka</Badge>}
            {onSale && <Badge kind="sleva">Sleva</Badge>}
            <Badge>{STORAGE_LABEL[product.storage]}</Badge>
            {product.animals.map((a) => (
              <Badge key={a}>{ANIMAL_LABEL[a]}</Badge>
            ))}
          </div>

          <h1 className="text-[28px] md:text-[34px]">{productName(product)}</h1>
          <p className="mt-3">{product.intro}</p>

          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            <span className={`font-display text-[26px] font-semibold ${onSale ? "text-brick-text" : ""}`}>
              {formatPrice(product.priceCzk)}
            </span>
            {onSale && (
              <span className="text-muted line-through">{formatPrice(product.originalPriceCzk!)}</span>
            )}
            <span className="text-sm text-muted">
              {formatWeight(product.weightGrams)} · {formatPrice(pricePerKg(product.priceCzk, product.weightGrams))}
              /kg
            </span>
          </div>

          <div className="mt-5">
            <AddToCartButton product={product} className="w-full sm:w-auto sm:min-w-48" />
          </div>

          <dl className="mt-8 divide-y divide-line border-y border-line text-sm">
            <Row term="Složení">{product.composition}</Row>
            <Row term="Skladování">{product.storageNote}</Row>
            <Row term="Dávkování">{product.dosage}</Row>
            <Row term="Výrobce">{product.producer}</Row>
          </dl>

          <p className="mt-4 text-xs text-muted">
            Dávkování je orientační. Kolik přesně dávat vašemu zvířeti spočítá{" "}
            <Link href="/jak-zacit-s-barfem#kalkulacka" className="text-green underline">
              kalkulačka na stránce Jak začít
            </Link>
            . Při zdravotních potížích se poraďte s veterinářem.
          </p>
        </div>
      </div>

      {upsell.length > 0 && (
        <section className="mt-12">
          <p className="label mb-1 text-[11px] text-brick-text">Lepší volba</p>
          <h2 className="mb-4">Vyplatí se víc</h2>
          <ProductGrid products={upsell} />
        </section>
      )}
      {crosssell.length > 0 && (
        <section className="mt-12">
          <p className="label mb-1 text-[11px] text-brick-text">Hodí se k tomu</p>
          <h2 className="mb-4">Zákazníci k tomu přidávají</h2>
          <ProductGrid products={crosssell} />
        </section>
      )}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4">Další z řady {line.name}</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[120px_1fr]">
      <dt className="label text-[11px] text-brick-text">{term}</dt>
      <dd className="text-muted">{children}</dd>
    </div>
  );
}
