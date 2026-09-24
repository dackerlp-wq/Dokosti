"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import type { Product } from "@/lib/catalog";

export type CartLine = { slug: string; qty: number };

type CartState = {
  lines: CartLine[];
  /** Řádky doplněné o produkt; chybějící produkty (smazané z katalogu) se vynechají. */
  items: { product: Product; qty: number }[];
  count: number;
  subtotalCzk: number;
  add: (slug: string, qty?: number) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
  /** false při serverovém renderu a první hydrataci, kdy košík z localStorage ještě neznáme. */
  ready: boolean;
};

const STORAGE_KEY = "dokosti-cart";
const EMPTY: CartLine[] = [];

/* Malý store nad localStorage. useSyncExternalStore drží server i klient v souladu. */
let lines: CartLine[] | null = null;
const listeners = new Set<() => void>();

function read(): CartLine[] {
  if (lines) return lines;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    lines = raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    lines = [];
  }
  return lines;
}

function write(next: CartLine[]) {
  lines = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* bez localStorage košík přežije jen do obnovení stránky */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      lines = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const actions = {
  add(slug: string, qty = 1) {
    const prev = read();
    const existing = prev.find((l) => l.slug === slug);
    write(existing ? prev.map((l) => (l.slug === slug ? { ...l, qty: l.qty + qty } : l)) : [...prev, { slug, qty }]);
  },
  setQty(slug: string, qty: number) {
    const prev = read();
    write(qty <= 0 ? prev.filter((l) => l.slug !== slug) : prev.map((l) => (l.slug === slug ? { ...l, qty } : l)));
  },
  remove(slug: string) {
    write(read().filter((l) => l.slug !== slug));
  },
  clear() {
    write([]);
  },
};

const CartContext = createContext<CartState | null>(null);

/** `products` dodá layout ze serveru, košík podle nich dopočítá ceny. */
export function CartProvider({ products, children }: { products: Product[]; children: React.ReactNode }) {
  const current = useSyncExternalStore(subscribe, read, () => EMPTY);
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const value = useMemo<CartState>(() => {
    const items = current.flatMap((l) => {
      const product = products.find((p) => p.slug === l.slug);
      return product ? [{ product, qty: l.qty }] : [];
    });
    return {
      lines: current,
      items,
      count: items.reduce((n, i) => n + i.qty, 0),
      subtotalCzk: items.reduce((n, i) => n + i.qty * i.product.priceCzk, 0),
      ...actions,
      ready,
    };
  }, [current, ready, products]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart musí být uvnitř CartProvider");
  return ctx;
}
