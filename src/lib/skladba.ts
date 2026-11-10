/**
 * Co je v syrovém mase podle složení od výrobce, a co do BARF jídelníčku obvykle patří navíc.
 *
 * Zásada: tvrdíme jen to, co výrobce uvádí ve složení. Žádné procento se nedopočítává ani neodhaduje
 * („kuře včetně kostí“ znamená, že kost je ve složení, ne kolik jí je). Mražené maso a směsi v nabídce
 * nejsou kompletní krmivo, proto se nikde nepíše „kompletní“ ani „vyvážený“; říkáme jen, co ve složení je,
 * a co se podle obecných zásad syrového krmení přidává zvlášť.
 */
import type { Product } from "@/lib/catalog";

export type Slozeni = {
  /** Svalovina (maso, ořez, srdce, žaludky, dršťky). */
  maso: boolean;
  /** Jedlá kost (včetně kostí, krky, křídla, stehna, sekané kuře). Chrupavka se nepočítá. */
  kost: boolean;
  /** Játra výslovně uvedená ve složení. */
  jatra: boolean;
  /** Další vnitřnosti (droby, ledvinky, slezina…). */
  vnitrnosti: boolean;
  /** „Droby“ bez rozpisu: nevíme, zda a kolik je v nich jater. */
  drobyNerozepsane: boolean;
  /** Ryba ve složení. */
  ryba: boolean;
  /** Zelenina ve složení. */
  zelenina: boolean;
  /** Srdce (u koček kvůli taurinu). */
  srdce: boolean;
};

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Je produkt syrové maso (BARF směsi nebo Maso, kosti a vnitřnosti)? Jen u nich má rozpis smysl. */
export const isRawMeat = (p: Pick<Product, "line">) => p.line === "barf" || p.line === "maso" || p.line === "kosti";

/** Rozpis podle složení od výrobce (a podkategorie, když jde o celé kusy s kostí). Pro ostatní řady null. */
export function slozeni(p: Pick<Product, "line" | "kind" | "variant" | "composition" | "meats">): Slozeni | null {
  if (!isRawMeat(p)) return null;
  // „bez kostí“ a „bez drobů“ nejsou kost ani droby.
  const c = fold(`${p.composition} ${p.variant}`).replace(/bez (kost|drob)\w*/g, " ");
  const kusSKosti = (p.line === "kosti" || p.kind === "kosti") && /krk|kridl|stehn|sekan|kost/.test(c);
  const jatra = /jater|jatra/.test(c);
  const vnitrnosti = /drob|ledvin|slezin|plic/.test(c);
  const onlyOrgans = p.kind === "vnitrnosti" && !/orez|maso|sval/.test(c);
  return {
    maso: !onlyOrgans,
    kost: kusSKosti || /kost|krk|kridl|stehna s/.test(c),
    jatra,
    vnitrnosti,
    drobyNerozepsane: /drob/.test(c) && !jatra,
    ryba: Boolean(p.meats?.includes("ryby")) || /ryb|losos|sprot|tresk|makrel|sled/.test(c),
    zelenina: /mrkev|zelenin|dyne|cuket/.test(c),
    srdce: /srdc/.test(c),
  };
}

/** Krátký výčet složek („maso, kost, vnitřnosti“) pro štítek a výpis. */
export function slozeniText(s: Slozeni): string {
  return [s.maso && "maso", s.kost && "kost", s.jatra && "játra", s.vnitrnosti && (s.drobyNerozepsane ? "droby" : "vnitřnosti"), s.ryba && "ryba", s.zelenina && "zelenina"]
    .filter(Boolean)
    .join(", ");
}

/**
 * Co do BARF jídelníčku obvykle patří a v tomto produktu podle složení není. Obecné zásady syrového krmení,
 * žádné hodnocení konkrétního produktu. Jód a vitamíny se do masa nepočítají nikdy (v syrovém mase nejsou deklarované).
 */
export function coPridat(s: Slozeni): string[] {
  const out: string[] = [];
  if (!s.maso) out.push("svalovina");
  if (!s.kost) out.push("kost nebo vápník");
  if (!s.jatra) out.push("játra");
  if (!s.vnitrnosti && !s.jatra) out.push("další vnitřnosti");
  if (!s.ryba) out.push("ryba nebo rybí olej");
  return out;
}

/** Jedna věta, kterou opakujeme všude, kde z masa skládáme jídelníček (plán, PDF, kalkulačka, produkt). */
export const ZASADY =
  "Jídelníček skládáme podle obecných zásad syrového krmení: svalovina, kost, játra, další vnitřnosti, ryba nebo olej a jód. Mražené maso a směsi nejsou kompletní krmivo a plán nenahrazuje výživový rozbor, přesný jídelníček pro konkrétní zvíře sestaví veterinář.";
