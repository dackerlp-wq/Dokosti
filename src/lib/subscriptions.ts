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
  items: { product_slug: string; qty: number; name: string | null; price_czk: number | null; weight_grams: number | null; available: boolean | null }[];
};

export type SubscriptionStatus = "aktivni" | "pozastaveno" | "zruseno";
export const SUBSCRIPTION_STATUS_LABEL: Record<SubscriptionStatus, string> = { aktivni: "Aktivní", pozastaveno: "Pozastaveno", zruseno: "Zrušeno" };

export type ManageAction = "skip" | "unskip" | "pause" | "resume" | "cancel" | "interval" | "items" | "note";

export async function getSubscriptionByToken(db: SupabaseClient, token: string): Promise<SubscriptionView | null> {
  if (!/^[0-9a-f]{32}$/.test(token)) return null;
  const { data, error } = await db.rpc("subscription_by_token", { p_token: token });
  if (error || !data) return null;
  return data as SubscriptionView;
}

/** Cena zboží za jednu dodávku podle aktuálních cen (bez slevy). */
export function subscriptionSubtotal(s: SubscriptionView) {
  return s.items.reduce((n, i) => n + (i.price_czk ?? 0) * i.qty, 0);
}
