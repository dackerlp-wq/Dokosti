"use client";

import { useState } from "react";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import type { Product } from "@/lib/catalog";
import { maxQty } from "@/lib/stock";

/** Řádek nákupu v detailu: krokovač 60 px, „ks“ a velké cihlové tlačítko Vložit do košíku. */
export function BuyPanel({ product }: { product: Product }) {
  const [qty, setQty] = useState(1);
  const limit = maxQty(product);
  const max = Number.isFinite(limit) ? Math.max(1, limit) : 99;
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {limit > 0 && (
        <>
          <QuantityStepper value={qty} onChange={setQty} max={max} />
          <span>ks</span>
        </>
      )}
      <AddToCartButton product={product} qty={qty} size="lg" label="Vložit do košíku" className="flex-1" />
    </div>
  );
}
