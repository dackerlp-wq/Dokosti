"use client";

import { ShoppingBasket } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/components/cart/cart-context";

/** Košík v hlavičce: slovo, ikona 24 px a počet kusů v cihlovém kolečku. */
export function CartLink() {
  const { count, ready } = useCart();
  return (
    <Link href="/kosik" className="relative inline-flex min-h-10 items-center gap-2 px-2 text-nav text-green transition-colors duration-300 hover:text-brick-text" aria-label={`Košík, ${count} položek`}>
      <span className="hidden sm:inline">Košík</span>
      <ShoppingBasket strokeWidth={1.75} className="size-6" aria-hidden />
      {ready && count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brick px-1 text-xs font-bold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
