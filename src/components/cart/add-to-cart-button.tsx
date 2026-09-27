"use client";

import { ArrowRight, Check, ShoppingBasket } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart/cart-context";
import type { Product } from "@/lib/catalog";
import { maxQty } from "@/lib/stock";

/** Přidání do košíku. Po přidání nabídne přechod do košíku, hlídá evidovaný stav skladu. */
export function AddToCartButton({ product, qty = 1, className = "" }: { product: Product; qty?: number; className?: string }) {
  const { add, lines } = useCart();
  const [added, setAdded] = useState(false);
  const inCart = lines.find((l) => l.slug === product.slug)?.qty ?? 0;
  const limit = maxQty(product);
  const full = inCart + qty > limit;

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 6000);
    return () => clearTimeout(t);
  }, [added]);

  if (limit === 0) {
    return (
      <Button variant="secondary" className={className} disabled>
        Momentálně není
      </Button>
    );
  }

  if (added) {
    return (
      <span className={`flex flex-wrap items-center gap-2 ${className}`}>
        <Button variant="secondary" className="flex-1" onClick={() => setAdded(false)} aria-live="polite">
          <Check strokeWidth={1.75} className="h-5 w-5" /> V košíku
        </Button>
        <Link href="/kosik" className="label inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-[var(--radius-control)] bg-brick px-4 text-[12px] text-cream hover:bg-brick-text">
          Do košíku <ArrowRight strokeWidth={1.75} className="h-4 w-4" />
        </Link>
      </span>
    );
  }

  return (
    <Button
      className={className}
      disabled={full}
      title={full ? `Skladem je ${limit} ks, všechny už máte v košíku.` : undefined}
      onClick={() => {
        add(product.slug, qty);
        setAdded(true);
      }}
    >
      <ShoppingBasket strokeWidth={1.75} className="h-5 w-5" />
      {full ? `V košíku máte vše (${limit} ks)` : "Do košíku"}
    </Button>
  );
}
