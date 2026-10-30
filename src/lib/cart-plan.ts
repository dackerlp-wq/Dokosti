"use client";

import { useSyncExternalStore } from "react";
import type { CartLine } from "@/components/cart/cart-context";

/**
 * Plán z Krmení na míru uložený vedle košíku (localStorage), aby přežil odbočku do e-shopu:
 * zákazník si k plánu přidá pamlsky a vrátí se do pokladny přes košík, předplatné z plánu pořád platí.
 * Co v košíku není z plánu (nebo je navíc nad množství z plánu), přijde jen v první dodávce,
 * pokud si to zákazník v pokladně nepřidá do každé dodávky (`keep`).
 */
export type CartPlan = {
  /** Jméno zvířete pro nadpis v košíku („Plán pro Rexe“), už ve 2. pádě. */
  forName: string;
  /** Interval předplatného ze souhrnu plánu (0 = jen jednou). */
  intervalDays: 0 | 14 | 28;
  delivery: string;
  /** Položky dodávky A tak, jak šly do košíku. */
  lines: CartLine[];
  /** Jednorázové doplňky: slug → po kolika dodávkách dochází. */
  once: Record<string, number>;
  /** Položky jen pro dodávku A (ostatní z plánu jsou v obou). */
  aOnly: string[];
  /** Dodávka B. */
  b: { slug: string; qty: number; name: string }[];
  dailyGrams?: number;
  preview: boolean;
};

const KEY = "dokosti-plan";
let cached: CartPlan | null | undefined;
const listeners = new Set<() => void>();

function read(): CartPlan | null {
  if (cached !== undefined) return cached;
  try {
    const raw = window.localStorage.getItem(KEY);
    cached = raw ? (JSON.parse(raw) as CartPlan) : null;
  } catch {
    cached = null;
  }
  return cached;
}

function write(next: CartPlan | null) {
  cached = next;
  try {
    if (next) window.localStorage.setItem(KEY, JSON.stringify(next));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* bez úložiště plán přežije jen do obnovení stránky */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cached = undefined;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

/** Co pokladna posílá do objednávky: plán a položky navíc, které mají chodit v každé dodávce. */
export type PlanHandoff = CartPlan & { keep: string[] };

export const savePlan = (p: CartPlan) => write(p);
export const clearPlan = () => write(null);

export function useCartPlan() {
  return useSyncExternalStore(subscribe, read, () => null);
}

/** Platí plán ještě? Všechny jeho položky musí v košíku zůstat aspoň v plánovaném množství. */
export function planValid(plan: CartPlan | null, cart: CartLine[]): plan is CartPlan {
  return Boolean(plan && plan.lines.length && plan.lines.every((l) => (cart.find((c) => c.slug === l.slug)?.qty ?? 0) >= l.qty));
}

/** Co je v košíku navíc k plánu (slug → kusů navíc). */
export function planExtras(plan: CartPlan, cart: CartLine[]): CartLine[] {
  return cart.flatMap((c) => {
    const planned = plan.lines.find((l) => l.slug === c.slug)?.qty ?? 0;
    return c.qty > planned ? [{ slug: c.slug, qty: c.qty - planned }] : [];
  });
}
