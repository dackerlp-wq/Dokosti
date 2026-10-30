import type { SupabaseClient } from "@supabase/supabase-js";

/** Předplatné tak, jak ho vrací RPC subscription_by_token. */
export type SubscriptionView = {
  id: string;
  token: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_method: "odber" | "rozvoz" | "prepravce";
  payment_method: "karta" | "prevod" | "hotove";
  street: string;
  city: string;
  zip: string;
  note: string;
  interval_days: number;
  weekday: number;
  next_date: string;
  skip_next: boolean;
  status: SubscriptionStatus;
  created_at: string;
  last_error: string | null;
  /** Kolik dodávek z předplatného už vzniklo (bez první objednávky z pokladny). */
  orders_count?: number;
  /** Posílat e-mail s náhledem dodávky před uzávěrkou (Ukázat dodávku předem). */
  preview?: boolean;
  /** Denní dávka z plánu Krmení na míru, pro rozpis krmení v e-mailu. */
  daily_grams?: number | null;
  items: SubscriptionItem[];
};

export type SubscriptionItem = {
  product_slug: string;
  qty: number;
  every_nth?: number;
  /** Střídání druhů masa: jen v dodávce A, jen v B, nebo v obou (null). */
  rotation?: "A" | "B" | null;
  /** Jednorázový doplněk: přišel v první dodávce, dál jen když ho zákazník přidá (add_next). */
  once?: boolean;
  add_next?: boolean;
  name: string | null;
  price_czk: number | null;
  weight_grams: number | null;
  available: boolean | null;
};

export type SubscriptionStatus = "aktivni" | "pozastaveno" | "zruseno";
export const SUBSCRIPTION_STATUS_LABEL: Record<SubscriptionStatus, string> = { aktivni: "Aktivní", pozastaveno: "Pozastaveno", zruseno: "Zrušeno" };

export type ManageAction = "skip" | "unskip" | "pause" | "resume" | "cancel" | "interval" | "items" | "note" | "add_next" | "preview";

export async function getSubscriptionByToken(db: SupabaseClient, token: string): Promise<SubscriptionView | null> {
  if (!/^[0-9a-f]{32}$/.test(token)) return null;
  const { data, error } = await db.rpc("subscription_by_token", { p_token: token });
  if (error || !data) return null;
  return data as SubscriptionView;
}

/** Střídají se v předplatném dvě sestavy masa (A a B)? */
export function hasRotation(s: Pick<SubscriptionView, "items">) {
  return s.items.some((i) => i.rotation === "B");
}

/**
 * Pořadí dodávky: kolik dodávek už z předplatného vzniklo (včetně první z pokladny).
 * Nejbližší dodávka má tedy pořadí orders_count; první objednávka byla 0 (dodávka A).
 */
export function nextDeliveryIndex(s: Pick<SubscriptionView, "orders_count">) {
  return s.orders_count ?? 0;
}

/** Sestava dodávky podle pořadí: A, B, A, B … */
export function deliveryLetter(index: number): "A" | "B" {
  return index % 2 === 0 ? "A" : "B";
}

/**
 * Co půjde do dodávky s daným pořadím: položky sestavy (A/B), položky „jen každou N.“
 * ve správném kole a jednorázové doplňky jen tehdy, když je zákazník přidal.
 */
export function itemsForDelivery(s: Pick<SubscriptionView, "items">, index: number): SubscriptionItem[] {
  const letter = deliveryLetter(index);
  const rotating = hasRotation(s);
  return s.items.filter((i) => {
    if (rotating && i.rotation && i.rotation !== letter) return false;
    if (i.once) return Boolean(i.add_next);
    return index % (i.every_nth ?? 1) === 0;
  });
}

/** Jednorázové doplňky, které podle denní dávky docházejí a do dodávky zatím přidané nejsou. */
export function runningOut(s: Pick<SubscriptionView, "items">, index: number): SubscriptionItem[] {
  return s.items.filter((i) => i.once && !i.add_next && index > 0 && index % (i.every_nth ?? 1) === 0);
}

/** Cena zboží nejbližší dodávky podle aktuálních cen (bez slevy). */
export function subscriptionSubtotal(s: SubscriptionView) {
  return itemsForDelivery(s, nextDeliveryIndex(s)).reduce((n, i) => n + (i.price_czk ?? 0) * i.qty, 0);
}
