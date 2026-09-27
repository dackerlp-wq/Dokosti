import type { Animal, BoneClass, LineSlug, ProductUnit, Storage } from "@/lib/catalog";

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
  paid_at: string | null;
  discount_note: string;
  created_by: string | null;
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
  email: string | null;
  card_code: string | null;
  name: string;
  phone: string;
  street: string;
  city: string;
  zip: string;
  note: string;
  orders_count: number;
  total_spent_czk: number;
  points: number;
  user_id: string | null;
  source: string;
  registered_at: string | null;
  terms_accepted_at: string | null;
  consent_marketing_email_at: string | null;
  consent_marketing_sms_at: string | null;
  heard_from: string;
  created_at: string;
};

/** Zvíře zákazníka (tabulka pets), strukturovaná část. */
export type PetDbRow = {
  id: string;
  customer_id: string | null;
  name: string;
  species: string | null;
  breed: string;
  born_on: string | null;
  weight_kg: number | string | null;
  neutered: boolean | null;
  activity: string | null;
  condition: string | null;
  feeding_now: string;
  current_food: string;
  exclude: string[];
  note: string;
  rewarded_at: string | null;
  data: Record<string, unknown>;
  updated_at: string;
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
  /** Prodejní jednotka; u kg je cena za kilogram a sklad v kg. */
  unit: ProductUnit;
  /** Poslední nákupní cena z příjemky, pro marži. Vidí jen správce. */
  purchase_price_czk: number | null;
  ean: string | null;
  updated_at: string;
};

export type AdminRole = "spravce" | "obsluha";
export const ADMIN_ROLE_LABEL: Record<AdminRole, string> = { spravce: "Správce", obsluha: "Obsluha" };

export type StockKind = "prijem" | "prodej_web" | "prodej_kasa" | "storno" | "odpis" | "inventura" | "oprava";
export const STOCK_KIND_LABEL: Record<StockKind, string> = {
  prijem: "Příjem",
  prodej_web: "Prodej web",
  prodej_kasa: "Prodej kasa",
  storno: "Storno",
  odpis: "Odpis",
  inventura: "Inventura",
  oprava: "Oprava",
};
export type StockMovementRow = {
  id: string;
  product_id: string;
  kind: StockKind;
  qty: number;
  unit_cost_czk: number | null;
  order_id: string | null;
  receipt_id: string | null;
  note: string;
  created_at: string;
};

/** Množství se jednotkou: kusy celé, kilogramy na tři desetinná místa. */
export function formatQty(qty: number | string | null, unit: ProductUnit) {
  if (qty === null) return "";
  const n = Number(qty);
  return unit === "kg" ? `${n.toLocaleString("cs-CZ", { maximumFractionDigits: 3 })} kg` : `${Math.round(n)} ks`;
}

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
