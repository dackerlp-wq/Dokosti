import type { Animal, BoneClass, LineSlug, Storage } from "@/lib/catalog";

/** Objednávka tak, jak leží v Supabase. */
export type OrderRow = {
  id: string;
  order_number: string;
  status: OrderStatus;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  street: string;
  city: string;
  zip: string;
  note: string;
  shipping_method: "odber" | "rozvoz" | "prepravce";
  payment_method: "karta" | "prevod" | "hotove";
  subtotal_czk: number;
  shipping_czk: number;
  total_czk: number;
  delivery_date: string | null;
  customer_id: string | null;
  coupon_code: string | null;
  discount_czk: number;
  points_redeemed: number;
  points_discount_czk: number;
  points_earned: number;
  invoice_number: string | null;
  invoice_issued_at: string | null;
  created_at: string;
};

export type CouponRow = {
  id: string;
  code: string;
  type: "percent" | "amount";
  value: number;
  min_order_czk: number;
  valid_from: string | null;
  valid_to: string | null;
  max_uses: number | null;
  used_count: number;
  active: boolean;
  note: string;
  created_at: string;
};

export type LoyaltyRow = {
  id: string;
  points: number;
  reason: string;
  created_at: string;
};

export type CustomerRow = {
  id: string;
  email: string;
  name: string;
  phone: string;
  street: string;
  city: string;
  zip: string;
  note: string;
  orders_count: number;
  total_spent_czk: number;
  points: number;
  created_at: string;
};

export type OrderItemRow = {
  id: string;
  product_slug: string;
  name: string;
  qty: number;
  unit_price_czk: number;
};

export const ORDER_STATUSES = ["nova", "potvrzena", "pripravena", "doruceno", "zrusena"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  nova: "Nová",
  potvrzena: "Potvrzená",
  pripravena: "Připravená",
  doruceno: "Doručeno",
  zrusena: "Zrušená",
};

export const SHIPPING_LABEL = {
  odber: "Osobní odběr",
  rozvoz: "Rozvoz",
  prepravce: "Přepravce",
} as const;

export const PAYMENT_LABEL = {
  karta: "Kartou online",
  prevod: "Převodem",
  hotove: "Na místě",
} as const;

/** Produkt tak, jak leží v Supabase (včetně neveřejných sloupců). */
export type ProductRow = {
  id: string;
  slug: string;
  line: LineSlug;
  variant: string;
  animals: Animal[];
  storage: Storage;
  weight_grams: number;
  price_czk: number;
  original_price_czk: number | null;
  producer: string;
  intro: string;
  composition: string;
  storage_note: string;
  dosage: string;
  in_stock: boolean;
  is_new: boolean;
  image_url: string | null;
  sort_order: number;
  is_published: boolean;
  upsell_slugs: string[];
  crosssell_slugs: string[];
  /** null = množství se neeviduje */
  stock_qty: number | null;
  low_stock_threshold: number;
  /** Údaje z etikety pro kalkulačku, null = neuvedeno. */
  kcal_per_100g: number | null;
  bone_pct: number | null;
  organ_pct: number | null;
  liver_pct: number | null;
  taurine_mg_per_kg: number | null;
  bone_class: BoneClass | null;
  is_complete: boolean;
  updated_at: string;
};

export function isOrderStatus(v: string): v is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(v);
}

const dt = new Intl.DateTimeFormat("cs-CZ", { dateStyle: "medium", timeStyle: "short" });
export function formatDate(iso: string) {
  return dt.format(new Date(iso));
}

const d = new Intl.DateTimeFormat("cs-CZ", { weekday: "short", day: "numeric", month: "numeric" });
/** Datum bez času, např. "út 30. 9." */
export function formatDay(iso: string) {
  return d.format(new Date(iso + "T12:00:00"));
}

/** Z názvu varianty udělá slug: "Základ" + "hovězí mix" → "zaklad-hovezi-mix". */
export function slugify(...parts: string[]) {
  return parts
    .join(" ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
