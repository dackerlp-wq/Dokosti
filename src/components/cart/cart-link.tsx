"use client";

import { ShoppingBasket } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/components/cart/cart-context";

export function CartLink({ onGreen }: { onGreen?: boolean }) {
  const { count, ready } = useCart();
  return (
    <Link
      href="/kosik"
      className={`label relative inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-control)] px-3 ${
        onGreen ? "text-cream hover:bg-green-hover" : "text-green hover:bg-paper"
      }`}
      aria-label={`Košík, ${count} položek`}
    >
      <ShoppingBasket strokeWidth={1.75} className="h-5 w-5" />
      <span className="hidden sm:inline">Košík</span>
      {ready && count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brick px-1 text-[11px] text-cream">
          {count}
        </span>
      )}
    </Link>
  );
}
