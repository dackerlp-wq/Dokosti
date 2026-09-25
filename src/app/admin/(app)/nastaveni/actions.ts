"use server";

import { revalidatePath } from "next/cache";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings";
import { getAdmin, getAuthSupabase } from "@/lib/supabase/auth";

export type SettingsState = { ok?: true; error?: string } | null;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string, fallback = 0) => {
  const n = Number(str(fd, k).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};
const numOrNull = (fd: FormData, k: string) => (str(fd, k) === "" ? null : num(fd, k));
const bool = (fd: FormData, k: string) => fd.get(k) === "on";
const days = (fd: FormData, k: string) => fd.getAll(k).map(Number).filter((d) => d >= 0 && d <= 6);

/** Uloží jednu sekci nastavení (shop / shipping / payment / pages). */
export async function saveSettings(_prev: SettingsState, fd: FormData): Promise<SettingsState> {
  if (!(await getAdmin())) return { error: "Nejste přihlášeni." };
  const section = str(fd, "section") as keyof Settings;
  let value: Settings[keyof Settings];

  switch (section) {
    case "shop": {
      const openingHours = fd
        .getAll("oh_days")
        .map((d, i) => ({ days: String(d).trim(), hours: String(fd.getAll("oh_hours")[i] ?? "").trim() }))
        .filter((o) => o.days);
      value = {
        name: str(fd, "name") || DEFAULT_SETTINGS.shop.name,
        slogan: str(fd, "slogan"),
        address: str(fd, "address"),
        city: str(fd, "city"),
        phone: str(fd, "phone"),
        email: str(fd, "email"),
        ico: str(fd, "ico"),
        dic: str(fd, "dic"),
        vatPayer: bool(fd, "vatPayer"),
        openingHours,
      };
      break;
    }
    case "shipping": {
      const base = (id: string) => ({
        enabled: bool(fd, `${id}_enabled`),
        name: str(fd, `${id}_name`),
        description: str(fd, `${id}_description`),
        priceCzk: num(fd, `${id}_priceCzk`),
        freeFromCzk: numOrNull(fd, `${id}_freeFromCzk`),
        minOrderCzk: num(fd, `${id}_minOrderCzk`),
      });
      value = {
        odber: base("odber"),
        rozvoz: { ...base("rozvoz"), days: days(fd, "rozvoz_days"), window: str(fd, "rozvoz_window") },
        prepravce: { ...base("prepravce"), shipDays: days(fd, "prepravce_shipDays") },
      };
      break;
    }
    case "payment":
      value = {
        karta: { enabled: bool(fd, "karta_enabled"), description: str(fd, "karta_description") },
        prevod: { enabled: bool(fd, "prevod_enabled"), description: str(fd, "prevod_description"), bankAccount: str(fd, "prevod_bankAccount") },
        hotove: { enabled: bool(fd, "hotove_enabled"), description: str(fd, "hotove_description") },
      };
      break;
    case "pages":
      value = { about: str(fd, "about"), terms: str(fd, "terms"), privacy: str(fd, "privacy") };
      break;
    case "loyalty":
      value = {
        enabled: bool(fd, "enabled"),
        czkPerPoint: Math.max(1, num(fd, "czkPerPoint", 10)),
        redeemStep: Math.max(1, num(fd, "redeemStep", 100)),
        redeemValueCzk: Math.max(1, num(fd, "redeemValueCzk", 50)),
      };
      break;
    default:
      return { error: "Neznámá sekce." };
  }

  const db = await getAuthSupabase();
  const { error } = await db.from("settings").upsert({ key: section, value });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
