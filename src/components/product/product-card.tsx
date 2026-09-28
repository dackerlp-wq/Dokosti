import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { ProductImage } from "@/components/product/product-image";
import { LINE_INFO, STORAGE_LABEL, productName, type Product } from "@/lib/catalog";
import { formatPrice, formatWeight } from "@/lib/format";
import { stockLabel } from "@/lib/stock";

export function ProductCard({ product }: { product: Product }) {
  const href = `/produkt/${product.slug}`;
  const onSale = product.originalPriceCzk !== undefined && product.originalPriceCzk > product.priceCzk;
  const stock = stockLabel(product);

  return (
    <article className="flex flex-col rounded-[var(--radius-card)] border border-line bg-paper p-2.5">
      <Link href={href} className="relative block">
        <ProductImage product={product} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" />
        {(product.isNew || onSale) && (
          <div className="absolute left-2 top-2 flex gap-1.5">
            {product.isNew && <Badge kind="novinka">Novinka</Badge>}
            {onSale && <Badge kind="sleva">Sleva</Badge>}
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-0.5 pt-3">
        <span className="label text-brick-text">
          {LINE_INFO[product.line].name} <span className="text-muted">· {STORAGE_LABEL[product.storage]}</span>
        </span>
        <h3 className="text-[17px] md:text-[18px]">
          <Link href={href} className="hover:underline">
            {productName(product)}
          </Link>
        </h3>
        <p className="text-xs text-muted">
          {product.unit === "kg" ? "na váhu, jen v prodejně" : formatWeight(product.weightGrams)}
          <span className={`ml-2 ${stock.kind === "skladem" ? "text-green" : stock.kind === "posledni" ? "text-brick-text" : "text-muted"}`}>· {stock.text}</span>
        </p>
        <p className="mt-auto pt-2 font-display text-[18px] font-semibold">
          {onSale && (
            <span className="mr-2 text-sm font-normal text-muted line-through">
              {formatPrice(product.originalPriceCzk!)}
            </span>
          )}
          <span className={onSale ? "text-brick-text" : ""}>{formatPrice(product.priceCzk)}</span>
          {product.unit === "kg" && <span className="text-sm font-normal text-muted">/kg</span>}
        </p>
        <div className="pt-2">
          {product.unit === "kg" ? (
            <p className="label inline-flex min-h-10 w-full items-center justify-center rounded-[var(--radius-control)] border border-line text-[11px] text-muted">V prodejně na váhu</p>
          ) : (
            <AddToCartButton product={product} className="w-full" />
          )}
        </div>
      </div>
    </article>
  );
}
