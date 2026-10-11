"use client";

import { useState } from "react";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import type { Product } from "@/lib/catalog";
import { maxQty } from "@/lib/stock";

/** Patička karty: pole s počtem kusů, „ks“ a malé tlačítko Do košíku. */
export function CardBuy({ product }: { product: Product }) {
  const [qty, setQty] = useState(1);
  const limit = maxQty(product);
  const max = Number.isFinite(limit) ? Math.max(1, limit) : 99;
  return (
    <div className="relative z-20 flex items-center gap-1.25">
      <input
        inputMode="numeric"
        value={qty}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          setQty(Math.min(max, Math.max(1, Number.isFinite(n) ? n : 1)));
        }}
        aria-label="Počet kusů"
        disabled={limit === 0}
        className="size-10 min-h-0 px-0 text-center text-body"
      />
      <span className="text-small">ks</span>
      <AddToCartButton product={product} qty={qty} size="sm" />
    </div>
  );
}
