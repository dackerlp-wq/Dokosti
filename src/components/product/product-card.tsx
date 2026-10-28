import Link from "next/link";
import { Clock } from "lucide-react";
import { CardBuy } from "@/components/cart/card-buy";
import { ProductImage } from "@/components/product/product-image";
import { Flag, StockStatus } from "@/components/ui/badge";
import { STORAGE_LABEL, productName, type Product } from "@/lib/catalog";
import { formatPct, formatPrice, formatWeight } from "@/lib/format";
import { stockState } from "@/lib/stock";

/**
 * Karta produktu podle design/components/product-card.tsx: bílá s linkou, fotka 200 px vyříznutá,
 * praporky přilepené vlevo, cena vlevo dole, množství a Do košíku vpravo dole. Horní část karty je odkaz na detail.
 */
export function ProductCard({ product, priority }: { product: Product; priority?: boolean }) {
  const href = `/produkt/${product.slug}`;
  const onSale = product.originalPriceCzk !== undefined && product.originalPriceCzk > product.priceCzk;
  const stock = stockState(product);
  const unavailable = stock.state === "out";
  const byWeight = product.unit === "kg";
  const flags = [product.isNew ? ("new" as const) : null, onSale ? ("sale" as const) : null].filter((f): f is "new" | "sale" => f !== null);

  return (
    <article className="group relative flex w-full flex-col rounded-card border border-line bg-white text-left shadow-card transition-[border-color,box-shadow] duration-300 ease-in-out hover:border-brick hover:shadow-card-hover">
      {unavailable && (
        <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center gap-3.5 rounded-card bg-overlay pt-20 text-center text-price text-white" aria-hidden>
          <Clock className="size-14" strokeWidth={1.25} />
          Naskladňujeme
        </div>
      )}

      {(flags.length > 0 || product.meatPct !== undefined) && (
        <div className="absolute top-7.5 -left-px z-20 grid justify-items-start gap-1.25">
          {flags.map((kind) => (
            <Flag key={kind} kind={kind} />
          ))}
          {product.meatPct !== undefined && <Flag kind="favourite">{`${formatPct(product.meatPct)} masa`}</Flag>}
        </div>
      )}

      <div className="mx-5 mt-5">
        <ProductImage product={product} sizes="(min-width: 62rem) 380px, (min-width: 30rem) 50vw, 100vw" priority={priority} />
      </div>

      <div className="flex flex-1 flex-col px-5 pt-6 pb-5">
        <h3 className="mb-2.5 line-clamp-2 text-heading-md text-green">
          {/* after: roztáhne odkaz přes fotku a text, patička s nákupem zůstává nad ním */}
          <Link href={href} className="transition-colors duration-300 after:absolute after:inset-x-0 after:top-0 after:bottom-20 after:z-10 group-hover:text-brick-text">
            {productName(product)}
          </Link>
        </h3>
        <p className="mb-1.25 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-small">
          <span>{byWeight ? "na váhu" : formatWeight(product.weightGrams)}</span>
          <span>{STORAGE_LABEL[product.storage]}</span>
          <StockStatus stock={stock} />
        </p>
        {product.intro && <p className="mb-1.25 line-clamp-3 text-small">{product.intro}</p>}

        <div className="mt-auto flex items-end justify-between gap-2.5 pt-2.5">
          <div>
            <div className="text-label whitespace-nowrap text-muted">{onSale ? <s className="font-normal">{formatPrice(product.originalPriceCzk!)}</s> : "Cena:"}</div>
            <div className={`text-price whitespace-nowrap ${onSale ? "text-brick-text" : "text-green"}`}>
              {formatPrice(product.priceCzk)}
              {byWeight && <span className="text-small font-normal text-muted">/kg</span>}
            </div>
          </div>
          {byWeight ? <p className="relative z-20 text-small text-muted">V prodejně na váhu</p> : <CardBuy product={product} />}
        </div>
      </div>
    </article>
  );
}
