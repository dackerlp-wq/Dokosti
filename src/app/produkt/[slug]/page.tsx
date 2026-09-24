import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
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
  return { title: productName(product), description: product.intro };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const line = LINE_INFO[product.line];
  const onSale = product.originalPriceCzk !== undefined && product.originalPriceCzk > product.priceCzk;
  const related = (await getProductsByLine(product.line))
    .filter((p) => p.slug !== product.slug)
    .slice(0, 4);

  return (
    <div className="container-dk py-10 md:py-14">
      <nav aria-label="Drobečková navigace" className="label mb-6 flex flex-wrap gap-2 text-[13px] text-muted">
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

      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        <div className="rounded-[var(--radius-card)] border border-line bg-paper p-3">
          <ProductImage product={product} sizes="(min-width: 768px) 50vw, 100vw" />
        </div>

        <div>
          <div className="mb-3 flex flex-wrap gap-2">
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

          <h1 className="text-[34px] md:text-[44px]">{productName(product)}</h1>
          <p className="mt-4 text-lg">{product.intro}</p>

          <div className="mt-6 flex flex-wrap items-baseline gap-3">
            <span className={`font-display text-[32px] font-semibold ${onSale ? "text-brick-text" : ""}`}>
              {formatPrice(product.priceCzk)}
            </span>
            {onSale && (
              <span className="text-lg text-muted line-through">{formatPrice(product.originalPriceCzk!)}</span>
            )}
            <span className="text-muted">
              {formatWeight(product.weightGrams)} · {formatPrice(pricePerKg(product.priceCzk, product.weightGrams))}
              /kg
            </span>
          </div>

          <div className="mt-6">
            <AddToCartButton product={product} className="w-full sm:w-auto sm:min-w-56" />
          </div>

          <dl className="mt-10 divide-y divide-line border-y border-line">
            <Row term="Složení">{product.composition}</Row>
            <Row term="Skladování">{product.storageNote}</Row>
            <Row term="Dávkování">{product.dosage}</Row>
            <Row term="Výrobce">{product.producer}</Row>
          </dl>

          <p className="mt-6 text-sm text-muted">
            Dávkování je orientační. Když si nejste jistí nebo má zvíře zdravotní potíže, poraďte se s veterinářem
            nebo se stavte v prodejně, spočítáme to spolu.
          </p>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6">Další z řady {line.name}</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[140px_1fr]">
      <dt className="label text-[13px] text-brick-text">{term}</dt>
      <dd className="text-muted">{children}</dd>
    </div>
  );
}
