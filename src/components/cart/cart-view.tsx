"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/components/cart/cart-context";
import { clearPlan, planValid, useCartPlan } from "@/lib/cart-plan";
import { ProductImage } from "@/components/product/product-image";
import { ButtonLink } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { productName, type Product } from "@/lib/catalog";
import { formatPrice, formatWeight } from "@/lib/format";
import { maxQty } from "@/lib/stock";

export function CartView({ freeDeliveryFromCzk, catalog }: { freeDeliveryFromCzk: number | null; catalog: Product[] }) {
  const { items, lines, subtotalCzk, setQty, remove, ready, add } = useCart();
  const stored = useCartPlan();
  const plan = planValid(stored, lines) ? stored : null;
  // Plán z Krmení na míru, ze kterého zákazník něco odebral: nabídnout vrácení, jinak pokladna bere běžný nákup.
  const broken = stored && !plan && stored.lines.some((l) => lines.some((c) => c.slug === l.slug)) ? stored : null;
  const inCart = new Set(items.map((i) => i.product.slug));
  const suggestions = catalog
    .filter((p) => p.inStock && p.unit !== "kg" && !inCart.has(p.slug) && items.some((i) => i.product.crosssell?.includes(p.slug)))
    .slice(0, 4);

  if (!ready) return <p className="text-muted">Načítám košík…</p>;

  if (items.length === 0) {
    return (
      <div className="rounded-card border border-line bg-white p-8 text-center">
        <p>V košíku zatím nic není.</p>
        <div className="mt-6">
          <ButtonLink href="/rada/barf" variant="action" size="md">
            Vybrat krmivo
          </ButtonLink>
        </div>
      </div>
    );
  }

  function isPlanned(slug: string) {
    return Boolean(plan?.lines.some((l) => l.slug === slug));
  }
  const toFree = freeDeliveryFromCzk === null ? 0 : freeDeliveryFromCzk - subtotalCzk;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-3">
      {plan && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-card bg-paper px-5 py-3">
          <p>
            <b className="text-green">Plán pro {plan.forName}</b>
            <span className="text-small">
              {" "}
              · {plan.intervalDays ? `pravidelně každé ${plan.intervalDays === 14 ? "2 týdny" : "4 týdny"}` : "jednorázově"}
              {plan.b.length ? ", maso se střídá" : ""}. Co přidáte navíc, přijde jen v první dodávce, v pokladně to můžete změnit.
            </span>
          </p>
          <button type="button" onClick={clearPlan} className="text-small font-semibold text-muted underline hover:text-brick-text">
            Nakoupit bez plánu
          </button>
        </div>
      )}
      {broken && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-card bg-paper px-5 py-3 text-small">
          <p>Z plánu pro {broken.forName} jste něco odebrali, pokladna ho proto vezme jako běžný nákup.</p>
          <button
            type="button"
            onClick={() => broken.lines.forEach((l) => setQty(l.slug, Math.max(l.qty, lines.find((c) => c.slug === l.slug)?.qty ?? 0)))}
            className="font-semibold text-brick-text underline"
          >
            Vrátit plán do košíku
          </button>
        </div>
      )}
      <ul className="divide-y divide-line rounded-card border border-line bg-white">
        {[...items].sort((a, b) => Number(isPlanned(b.product.slug)) - Number(isPlanned(a.product.slug))).map(({ product, qty }) => {
          const limit = maxQty(product);
          return (
          <li key={product.slug} className="grid grid-cols-[80px_1fr] gap-5 p-5 sm:grid-cols-[96px_1fr_auto]">
            <Link href={`/produkt/${product.slug}`}>
              <ProductImage product={product} sizes="96px" className="h-20 sm:h-24" />
            </Link>
            <div>
              <h3 className="text-heading-md font-bold">
                <Link href={`/produkt/${product.slug}`} className="hover:underline">
                  {productName(product)}
                </Link>
              </h3>
              <p className="text-small">
                {formatWeight(product.weightGrams)} · {formatPrice(product.priceCzk)} / ks
                {plan && (isPlanned(product.slug) ? <span className="ml-2 rounded-control bg-paper px-1.5 text-[11px]/[18px] font-bold text-green uppercase">z plánu</span> : <span className="ml-2 text-muted">navíc k plánu</span>)}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <QuantityStepper size="sm" value={qty} onChange={(v) => setQty(product.slug, v)} max={limit === Infinity ? 99 : Math.max(1, limit)} />
                <span className="text-small">ks</span>
                <button
                  type="button"
                  onClick={() => remove(product.slug)}
                  className="ml-2 inline-flex min-h-10 items-center gap-1 rounded-control px-2 text-small text-muted hover:text-brick-text"
                >
                  <Trash2 strokeWidth={1.75} className="h-4 w-4" /> Odebrat
                </button>
              </div>
            </div>
            {limit === 0 ? (
              <p role="alert" className="col-start-2 text-sm text-brick-text">
                Momentálně není skladem, před objednávkou ho prosím odeberte.
              </p>
            ) : qty > limit ? (
              <p role="alert" className="col-start-2 text-sm text-brick-text">
                Skladem je jen {limit} ks.{" "}
                <button type="button" onClick={() => setQty(product.slug, limit)} className="underline">
                  Upravit na {limit}
                </button>
              </p>
            ) : qty === limit ? (
              <p className="col-start-2 text-xs text-muted">Víc kusů teď skladem není.</p>
            ) : null}
            <p className="col-start-2 text-price text-green sm:col-start-3 sm:text-right">
              {formatPrice(product.priceCzk * qty)}
            </p>
          </li>
          );
        })}
      </ul>
      </div>

      <aside className="h-fit rounded-card bg-paper p-5">
        <h2 className="text-heading-lg">Souhrn</h2>
        <dl className="mt-4 space-y-2">
          <div className="flex justify-between">
            <dt className="text-muted">Zboží</dt>
            <dd className="font-semibold text-ink">{formatPrice(subtotalCzk)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Doprava</dt>
            <dd className="text-muted">podle způsobu</dd>
          </div>
        </dl>
        {toFree > 0 && (
          <p className="mt-4 rounded-control bg-white p-3 text-small">
            Ještě {formatPrice(toFree)} a rozvoz po Kladně máte zdarma.
          </p>
        )}
        <div className="mt-6">
          <ButtonLink href="/pokladna" variant="action" size="md" className="w-full">
            Pokračovat k dopravě
          </ButtonLink>
        </div>
        <p className="mt-3 text-center text-sm text-muted">
          <Link href="/rada/barf" className="hover:underline">
            Zpět do nabídky
          </Link>
        </p>
      </aside>

      {suggestions.length > 0 && (
        <section className="lg:col-span-2">
          <p className="mb-1 text-eyebrow uppercase text-muted">Hodí se k tomu</p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {suggestions.map((p) => (
              <li key={p.slug} className="flex items-center gap-3 rounded-card border border-line bg-white p-3 shadow-card">
                <div className="w-16 shrink-0">
                  <ProductImage product={p} sizes="64px" className="h-16" />
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <Link href={`/produkt/${p.slug}`} className="font-semibold hover:underline">
                    {productName(p)}
                  </Link>
                  <p className="text-muted">
                    {formatWeight(p.weightGrams)} · {formatPrice(p.priceCzk)}
                  </p>
                  <button type="button" onClick={() => add(p.slug)} className="mt-1 text-small font-semibold text-brick-text hover:underline">
                    Přidat
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

