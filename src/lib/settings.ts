import { cache } from "react";
import { getSupabase } from "@/lib/supabase/server";

/**
 * Nastavení e-shopu. Upravuje se v administraci (tabulka settings),
 * tady jsou výchozí hodnoty, dokud nejsou v databázi jiné.
 */

export type OpeningHour = { days: string; hours: string };

export type ShippingSetting = {
  enabled: boolean;
  name: string;
  description: string;
  priceCzk: number;
  /** Od jaké hodnoty objednávky zdarma; null = nikdy. */
  freeFromCzk: number | null;
  minOrderCzk: number;
};

export type Settings = {
  shop: {
    name: string;
    slogan: string;
    address: string;
    city: string;
    phone: string;
    email: string;
    ico: string;
    dic: string;
    vatPayer: boolean;
    openingHours: OpeningHour[];
  };
  shipping: {
    odber: ShippingSetting;
    rozvoz: ShippingSetting & { days: number[]; window: string };
    prepravce: ShippingSetting & { shipDays: number[] };
  };
  payment: {
    karta: { enabled: boolean; description: string };
    prevod: { enabled: boolean; description: string; bankAccount: string };
    hotove: { enabled: boolean; description: string };
  };
  pages: {
    about: string;
    terms: string;
    privacy: string;
  };
};

export const DEFAULT_SETTINGS: Settings = {
  shop: {
    name: "DoKosti BARF",
    slogan: "Poctivé do kosti.",
    address: "[ADRESA]",
    city: "Kladno",
    phone: "[TELEFON]",
    email: "[E-MAIL]",
    ico: "[IČO]",
    dic: "",
    vatPayer: false,
    openingHours: [
      { days: "Po–Pá", hours: "[OTEVÍRACÍ DOBA]" },
      { days: "So", hours: "[OTEVÍRACÍ DOBA]" },
      { days: "Ne", hours: "zavřeno" },
    ],
  },
  shipping: {
    odber: {
      enabled: true,
      name: "Osobní odběr v prodejně",
      description: "Připravíme do mrazáku, vyzvednete v otevírací době. Zaplatíte na místě nebo předem.",
      priceCzk: 0,
      freeFromCzk: null,
      minOrderCzk: 0,
    },
    rozvoz: {
      enabled: true,
      name: "Rozvoz po Kladně a okolí",
      description: "Vozíme sami, v chladicím boxu.",
      priceCzk: 79,
      freeFromCzk: 1500,
      minOrderCzk: 500,
      days: [2, 5],
      window: "16–19 h",
    },
    prepravce: {
      enabled: true,
      name: "Chlazený přepravce po ČR",
      description: "Balík v polystyrenu se suchým ledem. Posíláme pondělí až středa, aby nestál přes víkend.",
      priceCzk: 249,
      freeFromCzk: 3000,
      minOrderCzk: 1000,
      shipDays: [1, 2, 3],
    },
  },
  payment: {
    karta: { enabled: false, description: "Platební brána (bude doplněno)." },
    prevod: { enabled: true, description: "Údaje pošleme e-mailem, odesíláme po připsání.", bankAccount: "" },
    hotove: { enabled: true, description: "Hotově nebo kartou při odběru či rozvozu." },
  },
  pages: {
    about:
      "Prodejnu jsme otevřeli, protože jsme sami krmili syrově a pořád jsme za krmivem jezdili přes půl kraje. Vlastní krmivo nevyrábíme, vybíráme od výrobců, kterým věříme, a víme, co je v každém balíčku.",
    terms: "",
    privacy: "",
  },
};

export const SETTING_KEYS = ["shop", "shipping", "payment", "pages"] as const satisfies readonly (keyof Settings)[];

/** Hluboké sloučení výchozích hodnot s uloženými (nové klíče dostanou výchozí hodnotu). */
function merge<T>(base: T, over: unknown): T {
  if (over === null || over === undefined) return base;
  if (Array.isArray(base)) return (Array.isArray(over) ? over : base) as T;
  if (typeof base === "object" && base !== null && typeof over === "object") {
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const k of Object.keys(base as object)) {
      if (k in (over as object)) out[k] = merge((base as Record<string, unknown>)[k], (over as Record<string, unknown>)[k]);
    }
    return out as T;
  }
  return typeof over === typeof base ? (over as T) : base;
}

export const getSettings = cache(async (): Promise<Settings> => {
  const db = getSupabase();
  if (!db) return DEFAULT_SETTINGS;
  const { data, error } = await db.from("settings").select("key, value");
  if (error || !data) return DEFAULT_SETTINGS;
  const out = { ...DEFAULT_SETTINGS };
  for (const row of data as { key: keyof Settings; value: unknown }[]) {
    if (row.key in DEFAULT_SETTINGS) {
      (out as Record<string, unknown>)[row.key] = merge(DEFAULT_SETTINGS[row.key], row.value);
    }
  }
  return out;
});

export const DAY_NAMES = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];
export const DAY_NAMES_SHORT = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
