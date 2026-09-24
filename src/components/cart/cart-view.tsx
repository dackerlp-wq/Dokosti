"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/components/cart/cart-context";
import { ProductImage } from "@/components/product/product-image";
import { ButtonLink } from "@/components/ui/button";
import { productName } from "@/lib/catalog";
import { formatPrice, formatWeight } from "@/lib/format";

export function CartView({ freeDeliveryFromCzk }: { freeDeliveryFromCzk: number | null }) {
  const { items, subtotalCzk, setQty, remove, ready } = useCart();

  if (!ready) return <p className="text-muted">Načítám košík…</p>;

  if (items.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-line bg-paper p-8 text-center">
        <p className="text-muted">V košíku zatím nic není.</p>
        <div className="mt-6">
          <ButtonLink href="/rada/zaklad">Vybrat krmivo</ButtonLink>
        </div>
      </div>
    );
  }

  const toFree = freeDeliveryFromCzk === null ? 0 : freeDeliveryFromCzk - subtotalCzk;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-paper">
        {items.map(({ product, qty }) => (
          <li key={product.slug} className="grid grid-cols-[80px_1fr] gap-4 p-4 sm:grid-cols-[96px_1fr_auto]">
            <Link href={`/produkt/${product.slug}`}>
              <ProductImage product={product} sizes="96px" />
            </Link>
            <div>
              <h3 className="text-[17px]">
                <Link href={`/produkt/${product.slug}`} className="hover:underline">
                  {productName(product)}
                </Link>
              </h3>
              <p className="text-sm text-muted">
                {formatWeight(product.weightGrams)} · {formatPrice(product.priceCzk)} / ks
              </p>
              <div className="mt-3 flex items-center gap-2">
                <QtyButton label="Ubrat" onClick={() => setQty(product.slug, qty - 1)}>
                  <Minus strokeWidth={1.75} className="h-4 w-4" />
                </QtyButton>
                <span className="w-8 text-center font-display font-semibold" aria-live="polite">
                  {qty}
                </span>
                <QtyButton label="Přidat" onClick={() => setQty(product.slug, qty + 1)}>
                  <Plus strokeWidth={1.75} className="h-4 w-4" />
                </QtyButton>
                <button
                  type="button"
                  onClick={() => remove(product.slug)}
                  className="ml-2 inline-flex min-h-10 items-center gap-1 rounded-[var(--radius-control)] px-2 text-sm text-muted hover:text-brick-text"
                >
                  <Trash2 strokeWidth={1.75} className="h-4 w-4" /> Odebrat
                </button>
              </div>
            </div>
            <p className="col-start-2 font-display text-[17px] font-semibold sm:col-start-3 sm:text-right">
              {formatPrice(product.priceCzk * qty)}
            </p>
          </li>
        ))}
      </ul>

      <aside className="h-fit rounded-[var(--radius-card)] border border-line bg-paper p-5">
        <h2 className="text-[20px]">Souhrn</h2>
        <dl className="mt-4 space-y-2">
          <div className="flex justify-between">
            <dt className="text-muted">Zboží</dt>
            <dd>{formatPrice(subtotalCzk)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Doprava</dt>
            <dd className="text-muted">podle způsobu</dd>
          </div>
        </dl>
        {toFree > 0 && (
          <p className="mt-4 rounded-[var(--radius-control)] bg-cream p-3 text-sm text-muted">
            Ještě {formatPrice(toFree)} a rozvoz po Kladně máte zdarma.
          </p>
        )}
        <div className="mt-6">
          <ButtonLink href="/pokladna" className="w-full">
            Pokračovat k dodání
          </ButtonLink>
        </div>
        <p className="mt-3 text-center text-sm text-muted">
          <Link href="/rada/zaklad" className="hover:underline">
            Zpět do nabídky
          </Link>
        </p>
      </aside>
    </div>
  );
}

function QtyButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] border border-line bg-cream text-green hover:border-green"
    >
      {children}
    </button>
  );
}
