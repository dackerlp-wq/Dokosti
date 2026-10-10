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
  subscription_id: string | null;
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
  sex: string | null;
  breed: string;
  born_on: string | null;
  reproduction: string | null;
  pregnancy_week: number | null;
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
  meats: string[];
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
  /** Dodavatel, obvyklé balení od něj a sazba DPH (migrace 0028). */
  supplier_id: string | null;
  pack_size: number | null;
  vat_rate: number;
  updated_at: string;
};

export type AdminRole = "spravce" | "obsluha" | "brigada";
export const ADMIN_ROLE_LABEL: Record<AdminRole, string> = { spravce: "Správce", obsluha: "Obsluha", brigada: "Brigáda" };
/** Pořadí rolí pro „aspoň obsluha“ apod. */
export const ADMIN_ROLE_RANK: Record<AdminRole, number> = { brigada: 0, obsluha: 1, spravce: 2 };
export const ADMIN_ROLE_HINT: Record<AdminRole, string> = {
  spravce: "vše včetně nákupních cen, mezd, dokumentů, financí a nastavení",
  obsluha: "kasa, objednávky, sklad, zákazníci, deník a vlastní docházka",
  brigada: "kasa a provozní deník, storno jen vlastní účtenky do 10 minut",
};

export type StockKind = "prijem" | "prodej_web" | "prodej_kasa" | "storno" | "odpis" | "inventura" | "oprava" | "interni";
export const STOCK_KIND_LABEL: Record<StockKind, string> = {
  prijem: "Příjem",
  prodej_web: "Prodej web",
  prodej_kasa: "Prodej kasa",
  storno: "Storno",
  odpis: "Odpis",
  inventura: "Inventura",
  oprava: "Oprava",
  interni: "Interní výdej",
};

/** Dodavatel (číselník). */
export type SupplierRow = {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  order_weekday: number | null;
  lead_days: number;
  min_order_czk: number;
  note: string;
  active: boolean;
  created_at: string;
};

export type PurchaseOrderStatus = "navrh" | "odeslana" | "prijata" | "zrusena";
export const PURCHASE_ORDER_STATUS_LABEL: Record<PurchaseOrderStatus, string> = { navrh: "Návrh", odeslana: "Odeslaná", prijata: "Přijatá", zrusena: "Zrušená" };
export type PurchaseOrderRow = {
  id: string;
  number: string;
  supplier_id: string;
  status: PurchaseOrderStatus;
  note: string;
  expected_on: string | null;
  sent_at: string | null;
  received_at: string | null;
  receipt_id: string | null;
  created_by: string | null;
  created_at: string;
};
export type PurchaseOrderItemRow = { id: string; purchase_order_id: string; product_id: string; qty: number; unit_cost_czk: number; received_qty: number };

export type PriceActionStatus = "planovana" | "aktivni" | "skoncena" | "zrusena";
export const PRICE_ACTION_STATUS_LABEL: Record<PriceActionStatus, string> = { planovana: "Plánovaná", aktivni: "Běží", skoncena: "Skončená", zrusena: "Zrušená" };
export type PriceActionRow = {
  id: string;
  name: string;
  product_id: string;
  sale_price_czk: number;
  starts_on: string;
  ends_on: string;
  status: PriceActionStatus;
  original_price_czk: number | null;
  created_at: string;
};
export const VAT_RATES = [12, 21, 0] as const;
export type StockMovementRow = {
  id: string;
  product_id: string;
  kind: StockKind;
  qty: number;
  unit_cost_czk: number | null;
  order_id: string | null;
  receipt_id: string | null;
  pos_sale_id: string | null;
  note: string;
  created_by: string | null;
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

/** Z řady a varianty udělá slug: "barf" + "hovězí mix" → "barf-hovezi-mix". */
export function slugify(...parts: string[]) {
  return parts
    .join(" ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Provoz (migrace 0029): zaměstnanci, docházka, dokumenty, zařízení, checklisty. */
export type ContractType = "hpp" | "dpp" | "dpc" | "jednatel" | "osvc";
export const CONTRACT_LABEL: Record<ContractType, string> = { hpp: "Pracovní smlouva (HPP)", dpp: "Dohoda o provedení práce (DPP)", dpc: "Dohoda o pracovní činnosti (DPČ)", jednatel: "Jednatel / majitel", osvc: "OSVČ (faktura)" };
export type EmployeeRow = {
  id: string;
  user_id: string | null;
  name: string;
  position: string;
  contract_type: ContractType;
  hourly_rate_czk: number | null;
  monthly_salary_czk: number | null;
  weekly_hours: number | null;
  started_on: string | null;
  ended_on: string | null;
  phone: string;
  email: string;
  birth_date: string | null;
  address: string;
  note: string;
  tax_declaration: boolean;
  bank_account: string;
  created_at: string;
};
export type AttendanceKind = "prace" | "dovolena" | "nemoc" | "svatek" | "volno" | "jine";
export const ATTENDANCE_KIND_LABEL: Record<AttendanceKind, string> = { prace: "Práce", dovolena: "Dovolená", nemoc: "Nemoc", svatek: "Svátek", volno: "Volno", jine: "Jiné" };
export type AttendanceRow = {
  id: string;
  employee_id: string | null;
  user_id: string | null;
  day: string;
  started_at: string | null;
  ended_at: string | null;
  hours: number | null;
  break_minutes: number;
  kind: AttendanceKind;
  source: "kasa" | "rucne";
  shift_id: string | null;
  note: string;
  created_by: string | null;
  created_at: string;
};
export type DocumentCategory = "smlouvy" | "zamestnanci" | "faktury" | "najem" | "revize" | "haccp" | "urady" | "ostatni";
export const DOCUMENT_CATEGORY_LABEL: Record<DocumentCategory, string> = { smlouvy: "Smlouvy", zamestnanci: "Zaměstnanci", faktury: "Faktury od dodavatelů", najem: "Nájem a provozovna", revize: "Revize a kontroly", haccp: "HACCP a hygiena", urady: "Úřady a registrace", ostatni: "Ostatní" };
export type DocumentLink = "employee" | "supplier" | "receipt" | "order" | "device" | "firma" | "expense";
export const DOCUMENT_LINK_LABEL: Record<DocumentLink, string> = { employee: "Zaměstnanec", supplier: "Dodavatel", receipt: "Příjemka", order: "Objednávka", device: "Zařízení", firma: "Firma", expense: "Výdaj" };
export type DocumentRow = {
  id: string;
  title: string;
  category: DocumentCategory;
  linked_type: DocumentLink | null;
  linked_id: string | null;
  valid_from: string | null;
  valid_to: string | null;
  remind_days: number;
  note: string;
  archived_at: string | null;
  created_by: string | null;
  created_at: string;
};
export type DocumentVersionRow = { id: string; document_id: string; version: number; storage_path: string; file_name: string; mime: string; size_bytes: number; note: string; created_by: string | null; created_at: string };
export type SignatureMethod = "tablet" | "sken" | "externi";
export const SIGNATURE_METHOD_LABEL: Record<SignatureMethod, string> = { tablet: "Podpis na tabletu", sken: "Podepsaný sken", externi: "Podepsáno mimo systém" };
export type SignatureRow = { id: string; version_id: string; signer_name: string; signer_user: string | null; method: SignatureMethod; signature_path: string | null; signed_at: string; user_agent: string };
export type DeviceKind = "mrazak" | "chladnicka" | "jine";
export const DEVICE_KIND_LABEL: Record<DeviceKind, string> = { mrazak: "Mrazák", chladnicka: "Chladnička", jine: "Jiné" };
export type DeviceRow = { id: string; name: string; kind: DeviceKind; min_c: number; max_c: number; active: boolean; sort_order: number };
export type TemperatureRow = { id: string; device_id: string; measured_at: string; value_c: number; ok: boolean; note: string; created_by: string | null; created_by_name: string };
export type ChecklistPeriod = "denne" | "tydne" | "mesicne" | "nastup";
export const CHECKLIST_PERIOD_LABEL: Record<ChecklistPeriod, string> = { denne: "Denně", tydne: "Týdně", mesicne: "Měsíčně", nastup: "Při nástupu" };
export type ChecklistItem = { id: string; text: string };
export type ChecklistRow = { id: string; name: string; period: ChecklistPeriod; items: ChecklistItem[]; active: boolean; sort_order: number };
export type ChecklistRunRow = { id: string; checklist_id: string; period_key: string; done: Record<string, { by: string; at: string }>; created_at: string };

/** Klíč období checklistu: den, týden (ISO) nebo měsíc. */
export function periodKeyFor(period: ChecklistPeriod, now = new Date()): string {
  const iso = now.toISOString().slice(0, 10);
  if (period === "denne") return iso;
  if (period === "mesicne") return iso.slice(0, 7);
  if (period === "tydne") {
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((d.getTime() - start.getTime()) / 86_400_000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  }
  return iso;
}

/* Finance a mzdy (migrace 0030) */
export type ExpenseCategory = "zbozi" | "mzdy" | "odvody" | "najem" | "energie" | "sluzby" | "doprava" | "marketing" | "vybaveni" | "dane" | "ostatni";
export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = { zbozi: "Zboží", mzdy: "Mzdy", odvody: "Odvody", najem: "Nájem", energie: "Energie", sluzby: "Služby", doprava: "Doprava a auto", marketing: "Marketing", vybaveni: "Vybavení", dane: "Daně a poplatky", ostatni: "Ostatní" };
export type ExpenseSource = "receipt" | "payroll" | "recurring" | "rucne";
export const EXPENSE_SOURCE_LABEL: Record<ExpenseSource, string> = { receipt: "Příjemka", payroll: "Mzdy", recurring: "Opakovaný", rucne: "Ručně" };
export type ExpenseRow = {
  id: string;
  day: string;
  category: ExpenseCategory;
  description: string;
  amount_czk: number;
  supplier: string;
  document_no: string;
  source_type: ExpenseSource;
  source_id: string | null;
  recurring_id: string | null;
  due_on: string | null;
  paid_at: string | null;
  note: string;
  created_by: string | null;
  created_at: string;
};
export type RecurringExpenseRow = { id: string; name: string; category: ExpenseCategory; amount_czk: number; day_of_month: number; supplier: string; note: string; active: boolean; last_generated_month: string | null; created_at: string };
export type PayrollMonthRow = { month: string; status: "otevreny" | "uzavreny"; closed_at: string | null; closed_by: string | null; note: string; created_at: string };
export type PayrollItemRow = {
  id: string;
  month: string;
  employee_id: string;
  employee_name: string;
  contract_type: ContractType;
  hours_work: number;
  hours_vacation: number;
  hours_sick: number;
  hours_holiday: number;
  hourly_rate_czk: number | null;
  monthly_salary_czk: number | null;
  bonus_czk: number;
  deduction_czk: number;
  gross_czk: number;
  emp_levies_czk: number;
  tax_czk: number;
  net_czk: number;
  er_levies_czk: number;
  employer_cost_czk: number;
  breakdown: { label: string; amount: number; kind?: string }[];
  note: string;
  updated_at: string;
};
export type FinanceMonthRow = {
  month: string;
  pos_revenue_czk: number;
  pos_count: number;
  pos_cost_czk: number;
  web_revenue_czk: number;
  web_count: number;
  web_cost_czk: number;
  web_unpaid_czk: number;
  writeoff_czk: number;
  internal_czk: number;
  expenses: Partial<Record<ExpenseCategory, number>>;
  expenses_czk: number;
  expenses_paid_czk: number;
};

/** Měsíc „2026-03“ → „březen 2026“. */
export function monthLabel(month: string) {
  return new Intl.DateTimeFormat("cs-CZ", { month: "long", year: "numeric" }).format(new Date(`${month}-01T12:00:00`));
}
/** Posun měsíce o N (záporné = zpět). */
export function shiftMonth(month: string, by: number) {
  const d = new Date(`${month}-01T12:00:00`);
  d.setMonth(d.getMonth() + by);
  return d.toISOString().slice(0, 7);
}
export function isMonth(v: string | undefined): v is string {
  return !!v && /^\d{4}-\d{2}$/.test(v);
}
