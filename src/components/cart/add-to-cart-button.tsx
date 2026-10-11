"use client";

import { Check, ShoppingBasket } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { useCart } from "@/components/cart/cart-context";
import type { Product } from "@/lib/catalog";
import { maxQty } from "@/lib/stock";

/**
 * Cihlové tlačítko „Do košíku“. Po přidání se na pár vteřin změní na odkaz „V košíku“ vedoucí do košíku.
 * Hlídá evidovaný stav skladu.
 */
export function AddToCartButton({ product, qty = 1, size = "sm", label = "Do košíku", className = "" }: { product: Product; qty?: number; size?: "sm" | "md" | "lg"; label?: string; className?: string }) {
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
      <Button variant="secondary" size={size} className={className} disabled>
        Naskladňujeme
      </Button>
    );
  }

  if (added) {
    return (
      <Link href="/kosik" className={buttonClass("secondary", className, size)} aria-live="polite">
        <Check strokeWidth={1.75} className="size-5" aria-hidden /> V košíku
      </Link>
    );
  }

  return (
    <Button
      variant="action"
      size={size}
      className={className}
      disabled={full}
      title={full ? `Skladem je ${limit} ks, všechny už máte v košíku.` : undefined}
      onClick={() => {
        add(product.slug, qty);
        setAdded(true);
      }}
    >
      {size !== "sm" && <ShoppingBasket strokeWidth={1.75} className="size-5" aria-hidden />}
      {full ? `V košíku máte vše (${limit} ks)` : label}
    </Button>
  );
}
