import type { Animal, LineSlug, Storage } from "@/lib/catalog";

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
  updated_at: string;
};

export function isOrderStatus(v: string): v is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(v);
}

const dt = new Intl.DateTimeFormat("cs-CZ", { dateStyle: "medium", timeStyle: "short" });
export function formatDate(iso: string) {
  return dt.format(new Date(iso));
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
