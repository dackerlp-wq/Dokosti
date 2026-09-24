"use client";

import { Check, ShoppingBasket } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart/cart-context";
import type { Product } from "@/lib/catalog";

export function AddToCartButton({
  product,
  qty = 1,
  className = "",
}: {
  product: Product;
  qty?: number;
  className?: string;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1500);
    return () => clearTimeout(t);
  }, [added]);

  if (!product.inStock) {
    return (
      <Button variant="secondary" className={className} disabled>
        Momentálně není
      </Button>
    );
  }

  return (
    <Button
      className={className}
      onClick={() => {
        add(product.slug, qty);
        setAdded(true);
      }}
    >
      {added ? <Check strokeWidth={1.75} className="h-5 w-5" /> : <ShoppingBasket strokeWidth={1.75} className="h-5 w-5" />}
      {added ? "V košíku" : "Do košíku"}
    </Button>
  );
}
