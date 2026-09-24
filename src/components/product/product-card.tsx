import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { ProductImage } from "@/components/product/product-image";
import { STORAGE_LABEL, productName, type Product } from "@/lib/catalog";
import { formatPrice, formatWeight } from "@/lib/format";

export function ProductCard({ product }: { product: Product }) {
  const href = `/produkt/${product.slug}`;
  const onSale = product.originalPriceCzk !== undefined && product.originalPriceCzk > product.priceCzk;

  return (
    <article className="flex flex-col rounded-[var(--radius-card)] border border-line bg-paper p-3">
      <Link href={href} className="relative block">
        <ProductImage product={product} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" />
        {(product.isNew || onSale) && (
          <div className="absolute left-3 top-3 flex gap-2">
            {product.isNew && <Badge kind="novinka">Novinka</Badge>}
            {onSale && <Badge kind="sleva">Sleva</Badge>}
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1 pt-4">
        <span className="label text-brick-text">{STORAGE_LABEL[product.storage]}</span>
        <h3 className="text-[22px] md:text-[24px]">
          <Link href={href} className="hover:underline">
            {productName(product)}
          </Link>
        </h3>
        <p className="text-sm text-muted">{formatWeight(product.weightGrams)}</p>
        <p className="mt-auto pt-3 font-display text-[22px] font-semibold">
          {onSale && (
            <span className="mr-2 text-base font-normal text-muted line-through">
              {formatPrice(product.originalPriceCzk!)}
            </span>
          )}
          <span className={onSale ? "text-brick-text" : ""}>{formatPrice(product.priceCzk)}</span>
        </p>
        <div className="pt-3">
          <AddToCartButton product={product} className="w-full" />
        </div>
      </div>
    </article>
  );
}
