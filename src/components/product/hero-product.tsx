import Link from "next/link";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { ProductImage } from "@/components/product/product-image";
import { Badge } from "@/components/ui/badge";
import { productName, type Product } from "@/lib/catalog";
import { formatPrice, formatWeight } from "@/lib/format";

/** Vybere produkt do hero: nejdřív akční, pak novinku, jinak první skladem. */
export function pickHeroProduct(products: Product[]): Product | null {
  const inStock = products.filter((p) => p.inStock);
  return (
    inStock.find((p) => p.originalPriceCzk !== undefined && p.originalPriceCzk > p.priceCzk) ??
    inStock.find((p) => p.isNew) ??
    inStock[0] ??
    null
  );
}

/** Karta doporučeného produktu na zeleném hero. */
export function HeroProduct({ product }: { product: Product }) {
  const href = `/produkt/${product.slug}`;
  const onSale = product.originalPriceCzk !== undefined && product.originalPriceCzk > product.priceCzk;

  return (
    <article className="grid w-full max-w-sm grid-cols-[112px_1fr] gap-3 rounded-[var(--radius-card)] bg-paper p-3 text-ink">
      <Link href={href} className="relative block">
        <ProductImage product={product} sizes="112px" />
        <div className="absolute left-1.5 top-1.5">
          {onSale ? <Badge kind="sleva">Akce</Badge> : product.isNew ? <Badge kind="novinka">Novinka</Badge> : <Badge kind="skladem">Doporučujeme</Badge>}
        </div>
      </Link>
      <div className="flex flex-col justify-center">
        <h2 className="text-[16px]">
          <Link href={href} className="hover:underline">
            {productName(product)}
          </Link>
        </h2>
        <p className="text-xs text-muted">{formatWeight(product.weightGrams)}</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="font-display text-[18px] font-semibold">
            {onSale && (
              <span className="mr-1.5 text-xs font-normal text-muted line-through">{formatPrice(product.originalPriceCzk!)}</span>
            )}
            <span className={onSale ? "text-brick-text" : ""}>{formatPrice(product.priceCzk)}</span>
          </p>
          <AddToCartButton product={product} />
        </div>
      </div>
    </article>
  );
}
