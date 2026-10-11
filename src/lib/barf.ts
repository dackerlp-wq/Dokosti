/**
 * Výpočet denní dávky syrové stravy pro psy a kočky.
 *
 * Model vychází z výživových doporučení FEDIAF (2021/2024) a NRC (2006): potřeba energie
 * se počítá z metabolické hmotnosti (kg^0,75 pes, kg^0,67 kočka), gramy se odvozují z energie
 * krmiva. Tabulková „procenta hmotnosti“ z toho vycházejí jako výstup, ne vstup, takže
 * výpočet sedí i pro malá a obří plemena, kde prostá procenta selhávají.
 *
 * Výsledek je vždy orientační výchozí hodnota pro zdravá zvířata. Není to zdravotní
 * doporučení; při potížích a u zvláštních stavů odkazujeme na veterináře.
 * Zdroje a odůvodnění: reports/BARF krmení pro kalkulačku.md
 */
import type { Animal, Product } from "@/lib/catalog";

export type Species = Animal;
export type Stage = "mlade" | "dospely" | "senior" | "brezi" | "kojici";
export type Activity = "nizka" | "bezna" | "vysoka" | "pracovni";
export type Condition = "hubeny" | "idealni" | "nadvaha" | "obezita";
export type Ration = "pmr" | "zelenina";

export type AnimalInput = {
  id: string;
  name: string;
  species: Species;
  stage: Stage;
  /** Aktuální hmotnost v kg. */
  weightKg: number;
  condition: Condition;
  activity: Activity;
  neutered: boolean;
  /** Štěně nebo kotě: věk v měsících. */
  ageMonths?: number;
  /** Štěně: očekávaná dospělá hmotnost (kg). Když chybí, odhadne se z růstové křivky. */
  adultWeightKg?: number;
  /** Podíl syrové stravy v %, zbytek granule. Jen štěňata a přechod. */
  rawShare: 25 | 50 | 75 | 100;
  /** Březí: týden březosti 1–9. */
  pregnancyWeek?: number;
  /** Kojící: počet mláďat a týden laktace 1–4. */
  litterSize?: number;
  lactationWeek?: number;
  /** Složení: jen maso, kost a vnitřnosti (PMR), nebo s 20 % zeleniny. */
  ration: Ration;
  /** Začínáme s BARFem: první týdny jeden druh masa, granule vedle. */
  beginner: boolean;
  /** Druhy masa, které zvíře nesmí (alergie, nesnášenlivost). Produkty s nimi se vyřadí. */
  exclude: MeatKey[];
  /** Co přidat do nákupu; vypnuté role se vynechají. */
  addons: Record<AddonKey, boolean>;
  /** Konkrétní produkty, které zákazník z doporučení vyřadil (slugy). */
  removed: string[];
  /** Náhrady druhu: původní slug → zvolený slug (BARF mixy a Kosti). */
  swaps: Record<string, string>;
};

import { MEAT_LABEL, productName, type MeatKey } from "@/lib/catalog";
export { MEAT_LABEL, type MeatKey };
/** Slova ve variantě, složení a úvodu, která daný druh masa prozradí (bez diakritiky, malá písmena). Záloha, když produkt nemá `meats`. */
const MEAT_WORDS: Record<MeatKey, string[]> = {
  kureci: ["kurec", "kure", "chicken", "drubez"],
  kruti: ["kruti", "krut", "turkey"],
  kachni: ["kachn", "duck"],
  hovezi: ["hovez", "beef", "drstk", "bachor"],
  veprove: ["veprov", "prase", "pork"],
  jehneci: ["jehnec", "jehne", "lamb", "skopov"],
  kralici: ["kralic", "kralik", "rabbit"],
  kone: ["konsk", "konin", "kun", "horse"],
  zverina: ["zverin", "jelen", "srnc", "venison"],
  ryby: ["ryb", "losos", "sled", "makrel", "tresk", "fish"],
};

export type AddonKey = "kosti" | "ryba" | "olej" | "zelenina" | "rekreacni" | "vnitrnosti" | "granule";
export const ADDON_LABEL: Record<AddonKey, string> = {
  kosti: "Kosti",
  ryba: "Rybí den",
  olej: "Olej",
  zelenina: "Zelenina",
  rekreacni: "Kost na okusování",
  vnitrnosti: "Vnitřnosti",
  granule: "Granule",
};
export const DEFAULT_ADDONS: Record<AddonKey, boolean> = { kosti: true, ryba: true, olej: true, zelenina: true, rekreacni: true, vnitrnosti: true, granule: true };
/** Kalkulačka: základ je jen mix (a granule při přechodu), doplňky se nabízejí zvlášť jako doporučení. */
export const BASE_ADDONS: Record<AddonKey, boolean> = { kosti: false, ryba: false, olej: false, zelenina: false, rekreacni: false, vnitrnosti: false, granule: true };

/** Obsahuje produkt některý z vyloučených druhů masa? */
export function containsMeat(p: Product, keys: MeatKey[]) {
  if (!keys.length) return false;
  if (p.meats && p.meats.length) return keys.some((k) => p.meats!.includes(k));
  const hay = fold(`${p.variant} ${p.composition} ${p.intro}`);
  return keys.some((k) => MEAT_WORDS[k].some((w) => hay.includes(w)));
}

export type Composition = {
  /** Cílové podíly z denní syrové dávky v %. */
  muscle: number;
  bone: number;
  liver: number;
  organs: number;
  plant: number;
};

export type CalcResult = {
  /** Ideální (cílová) hmotnost, ze které se počítá. */
  idealKg: number;
  /** Denní potřeba energie, kcal. */
  kcalPerDay: number;
  /** Denní dávka syrové stravy v gramech (po odečtení podílu granulí). */
  dailyGrams: number;
  /** Rozsah ±12 %, ve kterém se dávka běžně pohybuje. */
  rangeGrams: [number, number];
  /** Denní gramy granulí, když je podíl syrové stravy pod 100 % a je známá energie granulí. */
  kibbleGrams: number | null;
  /** Energie připadající na granule (kcal/den), 0 při 100 % syrové. */
  kibbleKcal: number;
  /** Procento aktuální hmotnosti, kontrolní číslo. */
  pct: number;
  mealsPerDay: number;
  composition: Composition;
  /** Energie krmiva použitá pro přepočet, nebo null v orientačním režimu. */
  kcalPer100g: number | null;
  /** true = přepočet přes energii z etikety; false = orientační referenční hustota. */
  energyMode: boolean;
  /** Upozornění a doporučení k zobrazení. */
  notes: Note[];
};

export type Note = { kind: "info" | "warn"; text: string };

/**
 * Referenční energie syrové dávky, kcal/100 g. Literatura uvádí pro hotové syrové mixy
 * 138–225 kcal/100 g (Just Raw, Viva Raw); 150 je konzervativní střed pro drůbeží a hovězí
 * mixy s kostí. Používá se jen tehdy, když u zvolených mixů chybí energie z etikety.
 */
export const REFERENCE_KCAL_PER_100G = 150;

/** Metabolická hmotnost. */
const met = (kg: number, exp: number) => Math.pow(kg, exp);

/**
 * Ideální hmotnost z aktuální a zjednodušeného kondičního skóre (BCS 1–9, WSAVA):
 * každý bod nad 5 je zhruba +10–15 % hmotnosti. Hubený: cílová hmotnost o 10 % vyšší.
 */
export function idealWeight(weightKg: number, condition: Condition) {
  switch (condition) {
    case "hubeny":
      return weightKg * 1.1;
    case "nadvaha":
      return weightKg / 1.15;
    case "obezita":
      return weightKg / 1.35;
    default:
      return weightKg;
  }
}

/** Kdy je pes senior podle dospělé hmotnosti (FEDIAF SAB 2017: velká plemena dřív). */
export function seniorAgeYears(species: Species, adultKg: number) {
  if (species === "kocka") return 10;
  if (adultKg > 45) return 6;
  if (adultKg > 15) return 8;
  return 10;
}

/**
 * Růstová křivka FEDIAF 2021 (tab. VII-8b): podíl dospělé hmotnosti dosažený ve věku t týdnů,
 * a·ln(t) − b, podle očekávané dospělé hmotnosti.
 */
function growthFraction(adultKg: number, weeks: number) {
  const t = Math.max(8, weeks);
  const [a, b] =
    adultKg <= 7 ? [36.92, 43.57] : adultKg <= 15 ? [36.86, 48.22] : adultKg <= 27.5 ? [39.88, 60.7] : adultKg <= 47.5 ? [36.96, 56.18] : [36.61, 62.39];
  return Math.min(1, Math.max(0.1, (a * Math.log(t) - b) / 100));
}

/**
 * Odhad dospělé hmotnosti štěněte z aktuální hmotnosti a věku přes růstovou křivku.
 * Křivka závisí na velikostní kategorii, proto se hledá pevný bod iterací.
 */
export function estimateAdultWeight(weightKg: number, ageMonths: number) {
  const weeks = ageMonths * 4.345;
  let adult = weightKg * 2;
  for (let i = 0; i < 12; i++) adult = weightKg / growthFraction(adult, weeks);
  return Math.round(adult * 10) / 10;
}

/** Konec růstu podle dospělé hmotnosti (měsíce): malá ~12, střední ~15, velká ~18, obří ~24. */
export function growthEndsMonths(adultKg: number) {
  return adultKg <= 10 ? 12 : adultKg <= 25 ? 15 : adultKg <= 45 ? 18 : 24;
}

/** Počet jídel denně. */
export function mealsPerDay(i: AnimalInput): number {
  const age = i.ageMonths ?? 12;
  if (i.species === "kocka") {
    if (i.stage === "mlade") return age < 4 ? 5 : age < 6 ? 4 : 3;
    if (i.stage === "senior") return 3;
    return 2;
  }
  if (i.stage === "mlade") return age < 3 ? 4 : age < 6 ? 3 : 2;
  if (i.stage === "kojici") return 3;
  return 2;
}

/**
 * Denní potřeba energie psa v kcal (FEDIAF tab. VII-6/7 a rovnice pro růst,
 * březost a laktaci; NRC 2006). Počítá se z ideální hmotnosti.
 */
function dogKcal(i: AnimalInput, idealKg: number, notes: Note[]) {
  const W = idealKg;
  if (i.stage === "mlade") {
    const adult = Math.max(i.adultWeightKg ?? estimateAdultWeight(i.weightKg, i.ageMonths ?? 4), i.weightKg);
    const ratio = Math.min(1, i.weightKg / adult);
    // FEDIAF: ME = (254,1 − 135 × W/W_adult) × W^0,75, W = aktuální hmotnost
    return (254.1 - 135 * ratio) * met(i.weightKg, 0.75);
  }
  if (i.stage === "brezi") {
    const week = Math.min(9, Math.max(1, i.pregnancyWeek ?? 6));
    // FEDIAF: 1.–4. týden 132 × W^0,75; od 5. týdne + 26 kcal na kg hmotnosti
    return 132 * met(W, 0.75) + (week >= 5 ? 26 * W : 0);
  }
  if (i.stage === "kojici") {
    const n = Math.min(12, Math.max(1, i.litterSize ?? 6));
    const L = [0.75, 0.95, 1.1, 1.2][Math.min(4, Math.max(1, i.lactationWeek ?? 3)) - 1];
    // FEDIAF: 145 × W^0,75 + W × L × (24 n pro n ≤ 4; 96 + 12 n pro n 5–8)
    const perKg = n <= 4 ? 24 * n : 96 + 12 * Math.min(8, n);
    return 145 * met(W, 0.75) + W * L * perKg;
  }
  // Dospělý: k × W^0,75; k podle aktivity (FEDIAF 95 / 110 / 125 / 150–175, empiricky u domácích psů nižší)
  let k = { nizka: 95, bezna: 105, vysoka: 125, pracovni: 150 }[i.activity];
  if (i.neutered) k *= 0.85;
  if (i.stage === "senior") k *= 0.9;
  if (i.condition === "nadvaha") k *= 0.9;
  if (i.condition === "obezita") {
    k = 90;
    notes.push({ kind: "warn", text: "Při výrazné nadváze počítáme z cílové hmotnosti a s nižší energií. Plán hubnutí prosím proberte s veterinářem." });
  }
  if (i.condition === "hubeny") k = Math.max(k, 125);
  return k * met(W, 0.75);
}

/** Denní potřeba energie kočky v kcal (FEDIAF: 52–75 kcal/kg^0,67 kastrované a bytové, 100 aktivní). */
function catKcal(i: AnimalInput, idealKg: number, notes: Note[]) {
  const W = idealKg;
  let f = { nizka: 55, bezna: 70, vysoka: 100, pracovni: 100 }[i.activity];
  if (i.stage === "senior") f = Math.min(f, 60);
  if (!i.neutered) f = Math.min(100, f * 1.15);
  if (i.condition === "nadvaha") f *= 0.9;
  if (i.condition === "obezita") {
    f = Math.min(f, 55);
    notes.push({ kind: "warn", text: "Kočka nesmí hubnout rychle ani hladovět. Snižování dávky proberte s veterinářem." });
  }
  if (i.condition === "hubeny") f = Math.max(f, 85);
  if (i.stage === "brezi") return 70 * met(W, 0.67) * 1.5;
  if (i.stage === "kojici") return 70 * met(W, 0.67) * 2.5;
  return f * met(W, 0.67);
}

/** Kotě: procento aktuální hmotnosti podle věku (Perfectly Rawsome), 5–6 jídel do 4 měsíců. */
function kittenPct(ageMonths: number) {
  return ageMonths < 3 ? 10 : ageMonths < 5 ? 8 : ageMonths < 6 ? 7 : ageMonths < 8 ? 6 : ageMonths < 10 ? 5 : 4;
}

/** Cílové složení dávky. Kost = jedlá kost, ne hmotnost masitých kostí. */
export function targetComposition(i: AnimalInput): Composition {
  if (i.species === "kocka") return { muscle: 84, bone: 6, liver: 5, organs: 5, plant: 0 };
  const bone = i.stage === "mlade" ? 15 : 8;
  const plant = i.ration === "zelenina" ? 20 : 0;
  const animal = 100 - plant;
  const liver = 5;
  const organs = 5;
  return {
    muscle: Math.round((animal - bone - liver - organs) * 10) / 10,
    bone,
    liver,
    organs,
    plant,
  };
}

/**
 * Hlavní výpočet. `kcalPer100g` je energie zvolených mixů z etikety (vážený průměr),
 * null = orientační režim s referenční hustotou. `kibbleKcalPer100g` obdobně pro granule.
 */
export function calculate(i: AnimalInput, kcalPer100g: number | null = null, kibbleKcalPer100g: number | null = null): CalcResult {
  const notes: Note[] = [];
  const idealKg = idealWeight(i.weightKg, i.condition);
  const energyMode = kcalPer100g != null && kcalPer100g > 0;
  const E = energyMode ? kcalPer100g : REFERENCE_KCAL_PER_100G;

  let kcal: number;
  let dailyRaw: number;
  if (i.species === "kocka" && i.stage === "mlade") {
    // Kotě se počítá procentem aktuální hmotnosti, energie se odvozuje zpět.
    dailyRaw = (i.weightKg * 1000 * kittenPct(i.ageMonths ?? 6)) / 100;
    kcal = (dailyRaw / 100) * E;
  } else {
    kcal = i.species === "pes" ? dogKcal(i, idealKg, notes) : catKcal(i, idealKg, notes);
    dailyRaw = (kcal / E) * 100;
  }

  // Podíl granulí (štěně, přechod): energie se dělí, gramy granulí jen když známe jejich energii.
  const rawShare = i.rawShare / 100;
  const kibbleKcal = kcal * (1 - rawShare);
  const rawGrams = dailyRaw * rawShare;
  const kibbleGrams = kibbleKcal > 0 && kibbleKcalPer100g ? (kibbleKcal / kibbleKcalPer100g) * 100 : null;

  const round5 = (g: number) => Math.max(5, Math.round(g / 5) * 5);
  const dailyGrams = round5(rawGrams);
  const pct = Math.round((dailyGrams / (i.weightKg * 1000)) * 1000) / 10;

  // Poznámky k životní fázi a stavu.
  if (i.species === "pes" && i.stage === "mlade") {
    const adult = i.adultWeightKg ?? estimateAdultWeight(i.weightKg, i.ageMonths ?? 4);
    if (adult > 25)
      notes.push({
        kind: "warn",
        text: "Štěně velkého plemene: držte ho štíhlé a nepřidávejte žádný vápník ani vitamin D navíc, kost v dávce stačí. Růst hlídejte s veterinářem.",
      });
    notes.push({ kind: "info", text: "Štěně každé 2–3 týdny zvažte a dávku přepočítejte, roste rychle." });
  }
  if (i.stage === "senior") notes.push({ kind: "info", text: "U seniora snižujeme energii, ne podíl masa. Hlídejte kondici a hmotnost." });
  if (i.stage === "brezi" || i.stage === "kojici")
    notes.push({ kind: "warn", text: "Březost a kojení jsou náročné období. Dávka je orientační, hmotnost sledujte týdně a krmení konzultujte s veterinářem." });
  if (i.stage === "kojici") notes.push({ kind: "info", text: "Kojící fena či kočka může jíst i několikrát denně podle chuti. Vody neomezeně." });
  if (i.species === "kocka") notes.push({ kind: "warn", text: "Kočka nesmí zůstat bez jídla déle než jeden den. Přechod na syrovou stravu dělejte pomalu, i několik týdnů." });
  if (i.rawShare < 100) notes.push({ kind: "info", text: "Granule a syrovou stravu lze kombinovat, nejlépe v oddělených jídlech. Součet energie hlídá kalkulačka." });
  if (!energyMode) notes.push({ kind: "info", text: "U zvolených mixů zatím neznáme energii z etikety, proto počítáme s běžnou hustotou syrové stravy. Dávka je orientační." });

  return {
    idealKg: Math.round(idealKg * 10) / 10,
    kcalPerDay: Math.round(kcal),
    dailyGrams,
    rangeGrams: [round5(rawGrams * 0.88), round5(rawGrams * 1.12)],
    kibbleGrams: kibbleGrams == null ? null : Math.round(kibbleGrams / 5) * 5,
    kibbleKcal: Math.round(kibbleKcal),
    pct,
    mealsPerDay: mealsPerDay(i),
    composition: targetComposition(i),
    kcalPer100g: energyMode ? Math.round(kcalPer100g * 10) / 10 : null,
    energyMode,
    notes,
  };
}

/* ----------------------------------------------------------------------------------------
 * Doporučení produktů z aktuální nabídky a rozpis krmení balení po balení
 * -------------------------------------------------------------------------------------- */

export type Reco = {
  product: Product;
  /** Kusů na zvolené období: tolik balení se v období načne. */
  qty: number;
  /** Gramy denně v průměru (co se v období skutečně sní, děleno dny). */
  gramsPerDay: number;
  /** Gramy snědené za období. */
  usedGrams: number;
  /** Co zbyde z posledního načatého balení do dalšího období (v mrazáku). */
  leftoverGrams: number;
  /** Na kolik období (nákupů) balení vydrží; 1 = sní se v tomto období. */
  periods: number;
  /** Porce lidsky: „490 g denně“, „2× týdně po 125 g“, „5 ml denně“. */
  portionText: string;
  role: "zaklad" | "ryba" | "kosti" | "rekreacni" | "vnitrnosti" | "olej" | "zelenina" | "granule";
  why: string;
};

export type DayPlan = {
  /** Pořadí dne od 0. */
  day: number;
  /** „1. den“ */
  label: string;
  /** Den v týdnu podle dnešního data, např. „pondělí“. */
  weekday: string;
  items: { product: Product; grams: number; note?: string }[];
};

export type Plan = {
  input: AnimalInput;
  result: CalcResult;
  days: number;
  items: Reco[];
  /** Rozpis po dnech, ze kterého nákup vychází. */
  schedule: DayPlan[];
  /** Cena nákupu teď a průměr za den (balení na víc nákupů rozpočítaná). */
  totalCzk: number;
  perDayCzk: number;
  /** Bilance kosti: kolik % dávky pokryje mix, kolik doplní Kosti. */
  bone: { target: number; fromMix: number | null; fromBones: number };
  notes: Note[];
  /** Produkty, ze kterých se vybíralo (pro náhradu druhu). */
  pool: Product[];
};

export const WEEK_DAYS = ["pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota", "neděle"];

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const has = (p: Product, ...words: string[]) => words.some((w) => fold(p.variant + " " + p.intro).includes(fold(w)));
const packs = (gramsTotal: number, packGrams: number) => Math.max(1, Math.ceil(gramsTotal / packGrams));
const round5 = (g: number) => Math.max(5, Math.round(g / 5) * 5);

/** Výchozí podíl jedlé kosti v masité kosti, když chybí z etikety (kuřecí krk ≈ 36 %). */
const DEFAULT_RMB_BONE_PCT = 36;

/** Výhodnost pro obchod 0–1 (marže, sklad, ruční přednost); ukázková data bez skóre jsou neutrální. */
const score = (p: Product) => (p.recoScore ?? 50) / 100;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Vybere z kandidátů ten, u kterého se za období sní největší část balení (60 %) a je nejvýhodnější pro obchod (40 %).
 * `fit` vrací 0–1: 1 = balení se v období sní celé, 0 = produkt se nehodí.
 */
function choose(cands: Product[], fit: (p: Product) => number): Product | null {
  let best: Product | null = null;
  let bestV = -1;
  for (const p of cands) {
    const f = clamp01(fit(p));
    if (f <= 0) continue;
    const v = 0.6 * f + 0.4 * score(p);
    if (v > bestV) {
      best = p;
      bestV = v;
    }
  }
  return best;
}

/** Ryba místo masa: zhruba jednou týdně, když balení nevydrží déle než dva dny; větší jednou za 14 dní. */
function fishAlloc(fish: Product, animalGrams: number, days: number): { every: 7 | 14; packs: number; grams: number } | null {
  const need = animalGrams * days;
  const packDays = fish.weightGrams / animalGrams;
  const every = packDays <= 2 ? 7 : packDays <= 4 ? 14 : 0;
  if (!every || days < every) return null;
  let packs = Math.max(1, Math.round(days / every));
  while (packs > 1 && packs * fish.weightGrams > 0.2 * need) packs--;
  if (packs * fish.weightGrams > 0.2 * need) return null;
  return { every, packs, grams: packs * fish.weightGrams };
}

/** Kusový sáček (kosti, vnitřnosti): celé sáčky do `maxGrams`, jinak jeden sáček na víc nákupů a v období jen `target`. */
function bagAlloc(product: Product, target: number, maxGrams: number): { packs: number; grams: number; periods: number; fit: number } {
  const W = product.weightGrams;
  const k = Math.max(1, Math.round(target / W));
  if (k * W <= maxGrams) return { packs: k, grams: k * W, periods: 1, fit: 1 };
  return { packs: 1, grams: target, periods: Math.max(2, Math.ceil(W / target)), fit: target / W };
}

/** Denní doplněk (olej, zelenina, granule): celá balení podle průměru, využití = sní / koupeno. */
function dailyAlloc(product: Product, gpd: number, days: number): { qty: number; used: number; periods: number; fit: number } {
  const qty = gpd > 0 ? packs(gpd * days, product.weightGrams) : 1;
  const used = gpd * days;
  const lasts = gpd > 0 ? (qty * product.weightGrams) / gpd : days;
  const periods = Math.max(1, Math.min(Math.floor(lasts / days), Math.max(1, Math.floor(shelfDays(product) / days))));
  return { qty, used, periods, fit: qty > 0 ? used / (qty * product.weightGrams) : 0 };
}

/**
 * Vybere BARF mixy: začátečník jeden drůbeží, jinak až tři různé druhy masa (drůbeží první, u koček s taurinem),
 * v každé skupině podle výhodnosti pro obchod.
 */
function pickMixes(pool: Product[], i: AnimalInput): Product[] {
  const byScore = (x: Product, y: Product) => score(y) - score(x);
  const mixes = pool.filter((p) => p.line === "barf" && p.storage !== "suche" && !has(p, "ryb")).sort(byScore);
  const poultry = mixes.filter((p) => has(p, "drůbeží", "kuřecí", "krůtí", "kachní"));
  if (i.beginner || i.stage === "mlade") {
    const first = poultry[0] ?? mixes[0];
    return first ? [first] : [];
  }
  let ordered = [...poultry, ...mixes.filter((p) => !poultry.includes(p))];
  if (i.species === "kocka") ordered = [...ordered].sort((x, y) => Number(!!y.nutrition?.taurineMgPerKg) - Number(!!x.nutrition?.taurineMgPerKg));
  const chosen: Product[] = [];
  for (const p of ordered) {
    if (chosen.some((c) => fold(c.variant) === fold(p.variant))) continue;
    chosen.push(p);
    if (chosen.length === 3) break;
  }
  return chosen;
}

/** Jedlé kosti vhodné velikostí: kočky, malí psi a štěňata do 6 měsíců měkké krky, střední křídla a krky, velcí krůtí krky a skelety. */
function boneCandidates(pool: Product[], i: AnimalInput, adultKg: number): Product[] {
  const edible = pool.filter((p) => p.line === "kosti" && p.nutrition?.boneClass !== "rekreacni" && !has(p, "žebr", "morkov", "kolen", "kloub"));
  const small = i.species === "kocka" || adultKg < 10 || (i.stage === "mlade" && (i.ageMonths ?? 0) < 6);
  const large = adultKg > 25;
  const fitting = edible.filter((p) => (small ? has(p, "kuřecí krk", "krk", "křidélk", "kuřecí") : large ? has(p, "krůtí", "skelet", "kachní") : has(p, "křídl", "krk")));
  return fitting.length ? fitting : edible;
}

/** Vážená energie zvolených mixů, null když u některého chybí. */
export function mixesKcal(mixes: Product[]) {
  if (!mixes.length || mixes.some((m) => !m.nutrition?.kcalPer100g)) return null;
  return mixes.reduce((s, m) => s + (m.nutrition!.kcalPer100g as number), 0) / mixes.length;
}

/**
 * Orientační trvanlivost balení ve dnech: mražené zhruba 3 měsíce v mrazáku, chlazené pár dní,
 * suché (olej po otevření) 3 měsíce, granule po otevření 4 měsíce. Delší výdrž nemá smysl objednávat.
 */
export function shelfDays(p: { line: string; storage: string }): number {
  if (p.storage === "chlazene") return 7;
  if (p.line === "granule") return 120;
  return 90;
}

/** Načaté balení v simulaci: kolik v něm ještě je. */
type Pack = { product: Product; left: number };

/**
 * Sklad simulace: otvírá balení a počítá, kolik se jich načalo a kolik gramů se snědlo.
 * Nákup se pak rovná počtu načatých balení, zbytek z posledního zůstává v mrazáku do příště.
 */
class Pantry {
  opened = new Map<string, number>();
  used = new Map<string, number>();
  open(product: Product): Pack {
    this.opened.set(product.slug, (this.opened.get(product.slug) ?? 0) + 1);
    return { product, left: product.weightGrams };
  }
  eat(pack: Pack, grams: number) {
    pack.left -= grams;
    this.used.set(pack.product.slug, (this.used.get(pack.product.slug) ?? 0) + grams);
  }
}

type DayItem = DayPlan["items"][number];

/** Sloučí dva řádky stejného produktu v jednom dni (dojedení a nové balení) do jednoho. */
function pushItem(out: DayItem[], it: DayItem) {
  const same = out.find((m) => m.product.slug === it.product.slug);
  if (same) {
    same.grams += it.grams;
    same.note = [same.note, it.note].filter(Boolean).join(", ");
  } else out.push(it);
}

/**
 * Sestaví plán na `days` dní: vybere mixy, rybu, Kosti, vnitřnosti, olej, zeleninu a u štěňat granule,
 * pak den po dni odsimuluje krmení balení po balení. Nákup je přesně tolik balení, kolik se v období načne.
 *
 * Pravidla rozpisu:
 * - mixy se střídají po celých balíčcích, nové se načne až po dojedení předchozího,
 * - zbytek pod 15 % denní dávky (nejméně 30 g) se nenačíná kvůli pár gramům: buď se přihodí k porci,
 *   nebo porce ten den o kousek klesne,
 * - ryba je vlastní balení zhruba jednou týdně (jen když balení nevydrží déle než dva dny; větší jednou za 14 dní),
 * - Kosti a vnitřnosti jsou kusové: jedou ve svém rytmu, ale vždy ze stejného sáčku, dokud se nedojí,
 * - olej, zelenina a granule jsou každý den podle průměru.
 */
export function buildPlan(products: Product[], i: AnimalInput, days: number): Plan {
  const pool = products.filter((p) => p.inStock && p.unit !== "kg" && p.animals.includes(i.species) && !i.removed.includes(p.slug) && !containsMeat(p, i.exclude));
  const swap = (p: Product) => (i.swaps?.[p.slug] && pool.find((x) => x.slug === i.swaps[p.slug] && x.line === p.line)) || p;
  const mixes = pickMixes(pool, i).map(swap).filter((m, idx, arr) => arr.findIndex((x) => x.slug === m.slug) === idx);
  const kibbleCands = pool.filter((p) => p.line === "granule");
  const kibble = i.rawShare < 100 && i.addons.granule ? (choose(kibbleCands.filter((p) => i.stage !== "mlade" || has(p, "štěň", "puppy", "junior")), () => 1) ?? choose(kibbleCands, () => 1)) : null;
  const result = calculate(i, mixesKcal(mixes), kibble?.nutrition?.kcalPer100g ?? null);
  const D = result.dailyGrams;
  const comp = result.composition;
  const notes: Note[] = [];
  const adultKg = i.species === "pes" && i.stage === "mlade" ? (i.adultWeightKg ?? estimateAdultWeight(i.weightKg, i.ageMonths ?? 4)) : result.idealKg;

  // Rostlinná část jde mimo mixy; zbytek je živočišná dávka, kterou pokrývají mixy, ryba a Kosti.
  const animalGrams = D * ((100 - comp.plant) / 100);
  const minSplit = Math.max(30, round5(animalGrams * 0.15));

  // Ryba: vlastní balení místo masa, vybere se ta, jejíž balení období nejlíp využije. Jen když ho zvíře sní nejvýš za dva dny
  // (větší jednou za 14 dní); jinak se ryba vynechá a omega-3 pokryje olej.
  const fishCands = pool.filter((p) => p.line === "barf" && has(p, "ryb"));
  let fish: Product | null = null;
  let fishA: ReturnType<typeof fishAlloc> = null;
  if (i.addons.ryba && fishCands.length && !i.beginner && i.stage !== "mlade" && mixes.length > 0) {
    fish = choose(fishCands, (p) => {
      const al = fishAlloc(p, animalGrams, days);
      return al ? (al.every === 7 ? 1 : 0.7) : 0;
    });
    if (fish) fish = swap(fish);
    fishA = fish ? fishAlloc(fish, animalGrams, days) : null;
    if (!fishA) {
      fish = null;
      notes.push({ kind: "info", text: "Rybí mix je pro vaše zvíře na toto období velké balení, proto v plánu není. Omega-3 pokrývá olej." });
    } else if (fishA.every === 14) notes.push({ kind: "info", text: "Rybí balení by vydrželo několik dní, proto rybu zařaďte jednou za 14 dní." });
  }
  const fishEvery = fishA?.every ?? 0;
  const fishShare = fish && fishA ? Math.min(1 / 7, fish.weightGrams / (animalGrams * fishEvery)) : 0;

  // Bilance kosti: kost v mixu z etikety, jinak neznámá.
  const mixBonePcts = mixes.map((m) => m.nutrition?.bonePct);
  const fromMix = mixes.length && mixBonePcts.every((b) => b != null) ? (mixBonePcts as number[]).reduce((a, b) => a + b, 0) / mixes.length : null;
  /** Podíl dávky na masité kosti podle podílu kosti v nich (náhrada části mixu). */
  const rmbShareFor = (rmbBonePct: number) => {
    if (fromMix == null) return (0.15 * 2) / 7;
    const mixShare = 1 - comp.plant / 100 - fishShare;
    const deficit = comp.bone - mixShare * fromMix;
    return deficit > 0.5 ? Math.min(0.25, deficit / Math.max(1, rmbBonePct - fromMix)) : 0.1 / 7;
  };
  const needAll = animalGrams * days;
  const boneCands = i.addons.kosti ? boneCandidates(pool, i, adultKg) : [];
  const bone0 = choose(boneCands, (p) => {
    const target = rmbShareFor(p.nutrition?.bonePct ?? DEFAULT_RMB_BONE_PCT) * needAll;
    return bagAlloc(p, target, Math.min(2 * target, 0.25 * needAll)).fit;
  });
  const bone = bone0 ? swap(bone0) : null;
  const rmbBonePct = bone?.nutrition?.bonePct ?? DEFAULT_RMB_BONE_PCT;
  const rmbShare = bone ? rmbShareFor(rmbBonePct) : 0;
  if (bone) {
    if (fromMix == null) notes.push({ kind: "info", text: "Podíl kosti v mixu neznáme z etikety, proto Kosti doporučujeme jako náhradu části mixu dvakrát týdně. Sledujte stolici: tvrdá a světlá znamená kostí moc." });
    else {
      const boneFromMix = (1 - comp.plant / 100 - fishShare) * fromMix;
      if (comp.bone - boneFromMix <= 0.5) notes.push({ kind: "info", text: "Kost v mixu podle etikety stačí. Kosti proto stačí jako náhrada části mixu jednou týdně, hlavně pro zabavení." });
      if (boneFromMix + rmbShare * rmbBonePct > 12) notes.push({ kind: "warn", text: "Celkový podíl kosti vychází vysoko. Pokud je stolice tvrdá a světlá, kosti uberte." });
    }
  }
  if (!i.addons.kosti && i.species !== "kocka") notes.push({ kind: "info", text: "Bez Kostí hlídejte, aby mix obsahoval dost kosti. Bez kosti v dávce chybí vápník." });
  const mixShare = Math.max(0, 1 - comp.plant / 100 - fishShare - rmbShare);

  // Vnitřnosti a srdce z Navíc, když jsou v nabídce; kočka bez deklarovaného taurinu dostane srdce.
  const organShareAll = ((comp.liver + comp.organs) / 100) * 0.5;
  const organCands = i.addons.vnitrnosti ? pool.filter((p) => p.line === "navic" && has(p, "játra", "vnitřnost", "srdce", "ledvin")) : [];
  const organ = choose(organCands, (p) => bagAlloc(p, organShareAll * needAll, 1.4 * organShareAll * needAll).fit);
  const organShare = organ ? organShareAll : 0;
  if (!organ && i.species === "kocka" && !mixes.some((m) => m.nutrition?.taurineMgPerKg)) {
    notes.push({ kind: "info", text: "Kočka potřebuje taurin. Mixy zatím nemají taurin deklarovaný, přidejte jednou týdně syrové kuřecí nebo hovězí srdce." });
  }

  // Denní doplňky podle průměru: olej 1 ml na 100 g dávky, zelenina 20 % u psů, granule podle energie.
  const oil = i.addons.olej ? choose(pool.filter((p) => p.line === "navic" && has(p, "olej")), (p) => dailyAlloc(p, D / 100, days).fit) : null;
  const oilPerDay = oil ? D / 100 : 0;
  const veg = comp.plant > 0 && i.addons.zelenina ? choose(pool.filter((p) => p.line === "navic" && has(p, "zelenin")), (p) => dailyAlloc(p, D * (comp.plant / 100), days).fit) : null;
  if (comp.plant > 0 && i.addons.zelenina && !veg) notes.push({ kind: "info", text: "Zeleninový mix zrovna nemáme, rozmixujte mrkev, cuketu nebo dýni." });
  const vegPerDay = veg ? D * (comp.plant / 100) : 0;
  const kibblePerDay = kibble && result.kibbleKcal > 0 ? (result.kibbleGrams ?? 0) : 0;
  if (!kibble && i.rawShare < 100) notes.push({ kind: "info", text: "Granule pro tuto kombinaci nemáme skladem, podíl granulí dopočítejte podle tabulky výrobce." });

  /* ---------- nákup v celých baleních ----------
   * Nejdřív se rozhodne, co se koupí: každé balení masa se v období sní celé. Kusové sáčky (kosti, vnitřnosti),
   * které by v období byly moc, jsou položka na víc nákupů (periods > 1) a v tomto období se z nich sní jen podíl.
   */
  const need = animalGrams * days;
  const TOL = 0.12; // tolerance dávky ±12 % (stejná jako rangeGrams)

  // Ryba: celá balení zhruba jednou týdně (viz fishAlloc). Kosti a vnitřnosti: celé sáčky, když se vejdou do limitu,
  // jinak sáček na víc nákupů a v období jen cílový podíl (viz bagAlloc).
  const fishPacks = fishA?.packs ?? 0;
  const fishGrams = fishA?.grams ?? 0;
  const boneA = bone ? bagAlloc(bone, rmbShare * need, Math.min(2 * rmbShare * need, 0.25 * need)) : null;
  const bonePacks = boneA?.packs ?? 0;
  const boneGrams = boneA?.grams ?? 0;
  const bonePeriods = boneA?.periods ?? 1;
  const organA = organ ? bagAlloc(organ, organShare * need, 1.4 * organShare * need) : null;
  const organPacks = organA?.packs ?? 0;
  const organGrams = organA?.grams ?? 0;
  const organPeriods = organA?.periods ?? 1;

  // Mixy: střídavě po balení; počet balení se vybere tak, aby součet byl co nejblíž zbytku dávky,
  // při stejné odchylce radši o něco víc než míň.
  const mixNeed = Math.max(0, need - fishGrams - boneGrams - organGrams);
  const mixPlan: Product[] = [];
  if (mixes.length && mixNeed > 0) {
    const rotation: Product[] = [];
    let sum = 0;
    let idx = 0;
    while (sum < mixNeed) {
      const m = mixes[idx % mixes.length];
      rotation.push(m);
      sum += m.weightGrams;
      idx++;
    }
    // Kandidáti: všechna balení (součet ≥ potřeba), nebo bez posledního (součet < potřeba).
    const under = sum - rotation[rotation.length - 1].weightGrams;
    const useFewer = rotation.length > 1 && mixNeed - under < sum - mixNeed && (mixNeed - under) / mixNeed <= TOL;
    mixPlan.push(...(useFewer ? rotation.slice(0, -1) : rotation));
    const mixSum = useFewer ? under : sum;
    const total = mixSum + fishGrams + boneGrams + organGrams;
    const dev = (total - need) / need;
    if (Math.abs(dev) > 0.04) {
      const inTol = Math.abs(dev) <= TOL;
      notes.push({ kind: inTol ? "info" : "warn", text: `Nákup je zaokrouhlený na celá balení: vychází ${round5(total / days)} g živočišné části denně místo ${round5(animalGrams)} g (${dev > 0 ? "+" : ""}${Math.round(dev * 100)} %${inTol ? ", v běžné toleranci" : "). Rozdíl je větší než obvyklé rozmezí, hlídejte kondici, nebo zvolte jiné balení"}${inTol ? ")" : ""}.` });
    }
  }

  /* ---------- rozpis den po dni ---------- */
  const pantry = new Pantry();

  // Fronta masa: mixy v pořadí nákupu, rybí balení vložená zhruba jednou týdně (v týdnu za sebou).
  const meatQueue: Pack[] = mixPlan.map((m) => pantry.open(m));
  if (fish && fishPacks > 0) {
    const totalMix = meatQueue.reduce((s, q) => s + q.left, 0);
    const groups = Math.min(fishPacks, Math.max(1, Math.round(days / fishEvery)));
    for (let k = groups - 1; k >= 0; k--) {
      const inGroup = Math.floor(fishPacks / groups) + (k < fishPacks % groups ? 1 : 0);
      const target = (totalMix * (k + 0.5)) / groups;
      let acc = 0;
      let pos = 0;
      while (pos < meatQueue.length && acc < target) {
        acc += meatQueue[pos].product.weightGrams;
        pos++;
      }
      for (let n = 0; n < inGroup; n++) meatQueue.splice(pos, 0, pantry.open(fish));
    }
  }
  // Při otevření jsme balení jen „koupili“; za načaté ho považujeme až první den krmení.
  const touched = new Set<Pack>();

  /** Dny krmení kusové položky rovnoměrně po období a porce na jedno krmení (poslední porce dojí zbytek). */
  const feedDays = (grams: number, product: Product | null, maxPortion: number) => {
    if (!product || grams <= 0) return { days: new Map<number, number>(), per: 0, count: 0 };
    const perWeek = days / 7;
    // Nejmíň jednou týdně, nejvýš denně; porce nejvýš `maxPortion`.
    let count = Math.max(Math.round(perWeek), Math.ceil(grams / maxPortion));
    count = Math.min(days, Math.max(1, count));
    const per = grams / count;
    const map = new Map<number, number>();
    for (let j = 0; j < count; j++) map.set(Math.min(days - 1, Math.floor(((j + 0.5) * days) / count)), per);
    return { days: map, per, count };
  };
  const boneFeed = feedDays(boneGrams, bone, animalGrams * 0.4);
  const organFeed = feedDays(organGrams, organ, Math.max(30, animalGrams * 0.15));
  const boneBags: Pack[] = bone ? Array.from({ length: bonePacks }, () => ({ product: bone!, left: bone!.weightGrams })) : [];
  const organBags: Pack[] = organ ? Array.from({ length: organPacks }, () => ({ product: organ!, left: organ!.weightGrams })) : [];
  if (bone) pantry.opened.set(bone.slug, bonePacks);
  if (organ) pantry.opened.set(organ.slug, organPacks);
  const lastBoneDay = boneFeed.count ? Math.max(...boneFeed.days.keys()) : -1;
  const lastOrganDay = organFeed.count ? Math.max(...organFeed.days.keys()) : -1;

  /** Porce z kusového sáčku: vždy z načatého, nový až po dojedení. */
  const fromBags = (bags: Pack[], grams: number, note: string, openNote: string): DayItem | null => {
    const bag = bags.find((q) => q.left > 0);
    if (!bag || grams <= 0) return null;
    const opening = !touched.has(bag);
    touched.add(bag);
    const g = Math.min(grams, bag.left);
    pantry.eat(bag, g);
    const tag = [opening ? openNote : null, bag.left === 0 ? "dojíst balení" : null].filter(Boolean).join(", ");
    return { product: bag.product, grams: round5(g), note: tag ? `${note}, ${tag}` : note };
  };

  let remainingBone = boneGrams;
  let remainingOrgan = organGrams;
  const remainingMeat = () => meatQueue.reduce((s, q) => s + q.left, 0);
  const start = new Date();
  const weekdayOf = (day: number) => WEEK_DAYS[(start.getDay() + 6 + day) % 7];

  /** Maso dne z fronty: dojíst načaté, pak další v pořadí. Poslední den se dojí všechno, co zbývá. */
  const takeMeat = (need: number, out: DayItem[], lastDay: boolean) => {
    let rest = lastDay ? Number.POSITIVE_INFINITY : need;
    while (rest > 0) {
      const pack = meatQueue.find((q) => q.left > 0);
      if (!pack) break;
      const opening = !touched.has(pack);
      touched.add(pack);
      const tags: string[] = [];
      if (fish && pack.product.slug === fish.slug) tags.push("ryba místo masa");
      if (opening) tags.push("nové balení");
      if (pack.left <= rest) {
        const g = pack.left;
        pantry.eat(pack, g);
        rest -= g;
        tags.push("dojíst balení");
        pushItem(out, { product: pack.product, grams: round5(g), note: tags.join(", ") });
        if (!lastDay && rest < minSplit) rest = 0; // kvůli drobnosti další balení neotvíráme
      } else {
        let g = rest;
        if (pack.left - g < minSplit) g = pack.left; // drobný zbytek radši přihodit než nechat
        pantry.eat(pack, g);
        rest = 0;
        if (pack.left === 0) tags.push("dojíst balení");
        pushItem(out, { product: pack.product, grams: round5(g), note: tags.length ? tags.join(", ") : undefined });
      }
    }
  };

  const schedule: DayPlan[] = Array.from({ length: days }, (_, day) => {
    const out: DayItem[] = [];
    const remDays = days - day;
    const lastDay = day === days - 1;
    // Denní cíl se přepočítává ze zbytku, aby se úpravy porcí vyrovnaly a všechno koupené se snědlo.
    const dailyTotal = (remainingMeat() + remainingBone + remainingOrgan) / remDays;

    let boneToday = 0;
    if (boneFeed.days.has(day)) {
      const it = fromBags(boneBags, day === lastBoneDay ? remainingBone : Math.min(boneFeed.per, remainingBone), "místo části mixu", "nový sáček");
      if (it) {
        out.push(it);
        boneToday = it.grams;
        remainingBone = Math.max(0, remainingBone - it.grams);
      }
    }
    let organToday = 0;
    const organItem = organFeed.days.has(day) ? fromBags(organBags, day === lastOrganDay ? remainingOrgan : Math.min(organFeed.per, remainingOrgan), "vnitřnosti", "nové balení, rozdělte na porce") : null;
    if (organItem) {
      organToday = organItem.grams;
      remainingOrgan = Math.max(0, remainingOrgan - organItem.grams);
    }

    takeMeat(Math.max(0, dailyTotal - boneToday - organToday), out, lastDay);
    if (organItem) out.push(organItem);
    if (oil) out.push({ product: oil, grams: 0, note: `${Math.max(1, Math.round(oilPerDay))} ml` });
    if (veg) out.push({ product: veg, grams: round5(vegPerDay) });
    if (kibble && result.kibbleKcal > 0) out.push({ product: kibble, grams: kibblePerDay, note: kibblePerDay > 0 ? "v jiném jídle" : `${result.kibbleKcal} kcal podle obalu` });
    return { day, label: `${day + 1}. den`, weekday: weekdayOf(day), items: out };
  });

  /* ---------- nákupní seznam ---------- */
  const items: Reco[] = [];
  const perWeekText = (count: number, per: number) => {
    const perWeek = count / (days / 7);
    const times = Math.round(perWeek);
    if (count >= days) return `${round5(per)} g denně`;
    if (Math.abs(perWeek - times) < 0.3 && times >= 1) return `${times}× týdně po ${round5(per)} g`;
    return `každý ${Math.round(days / count)}. den po ${round5(per)} g`;
  };
  const add = (product: Product, role: Reco["role"], why: string, portionText: string, periods = 1) => {
    const qty = pantry.opened.get(product.slug) ?? 0;
    if (!qty) return;
    const used = pantry.used.get(product.slug) ?? 0;
    items.push({ product, qty, gramsPerDay: used / days, usedGrams: used, leftoverGrams: Math.max(0, qty * product.weightGrams - used), periods, portionText, role, why });
  };
  const mixGrams = mixPlan.reduce((s, m) => s + m.weightGrams, 0);
  const mixDaily = mixGrams / days;
  mixes.forEach((m) => add(m, "zaklad", mixes.length > 1 ? "střídejte po celých balíčcích" : i.beginner || i.stage === "mlade" ? "jeden druh masa na začátek" : "základ misky", `~${round5(mixDaily)} g denně${mixes.length > 1 ? " dohromady" : ""}`));
  if (fish) add(fish, "ryba", fishEvery === 7 ? "místo masa, omega-3" : "jednou za 14 dní místo masa, omega-3", `${fishPacks}× za ${days} dní celé balení místo mixu`);
  if (bone) add(bone, "kosti", "místo části mixu", perWeekText(boneFeed.count, boneFeed.per), bonePeriods);
  // Rekreační kost pro psy nad 10 kg, mimo dávku.
  if (i.addons.rekreacni && i.species === "pes" && adultKg >= 10 && i.stage !== "mlade") {
    const rec = choose(pool.filter((p) => p.line === "kosti" && (p.nutrition?.boneClass === "rekreacni" || has(p, "žebr", "morkov"))), () => 1);
    if (rec) items.push({ product: rec, qty: 1, gramsPerDay: 0, usedGrams: 0, leftoverGrams: 0, periods: Math.max(1, Math.round(28 / days)), portionText: "na okusování, nepočítá se do dávky", role: "rekreacni", why: "jen pod dohledem" });
  }
  if (organ) add(organ, "vnitrnosti", "játra nejvýš 5 % dávky", perWeekText(organFeed.count, organFeed.per), organPeriods);
  const daily = (product: Product, gpd: number, role: Reco["role"], why: string, text: string) => {
    const { qty, used, periods } = dailyAlloc(product, gpd, days);
    items.push({ product, qty, gramsPerDay: gpd, usedGrams: used, leftoverGrams: Math.max(0, qty * product.weightGrams - used), periods, portionText: text, role, why });
  };
  if (oil) daily(oil, oilPerDay, "olej", "spolu s vitaminem E", `${Math.max(1, Math.round(oilPerDay))} ml denně do misky`);
  if (veg) daily(veg, vegPerDay, "zelenina", "rostlinná část, 20 % dávky", `${round5(vegPerDay)} g denně`);
  if (kibble && result.kibbleKcal > 0) daily(kibble, kibblePerDay, "granule", `${100 - i.rawShare} % energie`, kibblePerDay > 0 ? `${kibblePerDay} g denně v jiném jídle` : `${result.kibbleKcal} kcal denně podle tabulky na obalu`);

  const longest = Math.max(0, ...mixes.map((m) => m.weightGrams / animalGrams));
  if (mixes.length && longest > 3) notes.push({ kind: "info", text: `Balení mixu vydrží ${Math.round(longest)} dní, rozmražené se ale má sníst do dvou. Rozmrazte ho jen zčásti, nebo zbytek hned rozdělte na porce a zamrazte.` });
  if (!mixes.length) notes.push({ kind: "warn", text: i.exclude.length ? "Po vyřazení nevhodných druhů masa nemáme skladem žádný vhodný mix. Stavte se v prodejně, poskládáme set spolu." : "Pro tuto kombinaci zrovna nemáme skladem vhodný mix. Stavte se v prodejně, poskládáme set spolu." });
  const longLived = items.filter((it) => it.periods > 1 && ["kosti", "vnitrnosti"].includes(it.role));
  if (longLived.length) notes.push({ kind: "info", text: `${longLived.map((it) => `${productName(it.product)} vydrží ~${it.periods} nákupy`).join(", ")}: v dalších nákupech je přidávejte jen občas.` });

  const totalCzk = items.reduce((s, r) => s + r.qty * r.product.priceCzk, 0);
  const periodCzk = items.reduce((s, r) => s + (r.qty * r.product.priceCzk) / r.periods, 0);
  return {
    input: i,
    result,
    days,
    items,
    schedule,
    totalCzk,
    perDayCzk: Math.round(periodCzk / days),
    bone: { target: comp.bone, fromMix: fromMix == null ? null : Math.round(mixShare * fromMix * 10) / 10, fromBones: Math.round(rmbShare * rmbBonePct * 10) / 10 },
    notes: [...result.notes, ...notes],
    pool,
  };
}

/** Rozpis krmení po dnech (součást plánu). */
export function feedingSchedule(plan: Plan): DayPlan[] {
  return plan.schedule;
}

/** Rozpis po týdnech (7 dní) pro zobrazení a tisk. */
export function scheduleWeeks(schedule: DayPlan[]): DayPlan[][] {
  const weeks: DayPlan[][] = [];
  for (let i = 0; i < schedule.length; i += 7) weeks.push(schedule.slice(i, i + 7));
  return weeks;
}

/** Orientační dospělé hmotnosti běžných plemen (FCI standardy, střed rozpětí). Pro předvýběr. */
export const BREEDS: { name: string; kg: number }[] = [
  { name: "čivava", kg: 2.5 },
  { name: "jorkšírský teriér", kg: 3 },
  { name: "jezevčík trpasličí", kg: 4.5 },
  { name: "mops", kg: 7.5 },
  { name: "jezevčík standardní", kg: 10 },
  { name: "francouzský buldoček", kg: 11 },
  { name: "kokršpaněl", kg: 14 },
  { name: "stafordšírský bulteriér", kg: 15 },
  { name: "border kolie", kg: 18 },
  { name: "australský ovčák", kg: 25 },
  { name: "belgický ovčák malinois", kg: 28 },
  { name: "labradorský retrívr", kg: 32 },
  { name: "zlatý retrívr", kg: 32 },
  { name: "německý ovčák", kg: 35 },
  { name: "rotvajler", kg: 45 },
  { name: "bernský salašnický pes", kg: 45 },
  { name: "německá doga", kg: 65 },
];

export function newAnimal(species: Species = "pes"): AnimalInput {
  return {
    id: Math.random().toString(36).slice(2, 8),
    name: "",
    species,
    stage: "dospely",
    weightKg: 0,
    condition: "idealni",
    activity: "bezna",
    neutered: true,
    rawShare: 100,
    ration: "pmr",
    beginner: false,
    exclude: [],
    addons: { ...DEFAULT_ADDONS },
    removed: [],
    swaps: {},
  };
}

export const STAGE_LABEL: Record<Species, Record<Stage, string>> = {
  pes: { mlade: "Štěně", dospely: "Dospělý", senior: "Senior", brezi: "Březí fena", kojici: "Kojící fena" },
  kocka: { mlade: "Kotě", dospely: "Dospělá", senior: "Senior", brezi: "Březí kočka", kojici: "Kojící kočka" },
};

export const ACTIVITY_LABEL: Record<Species, Record<Activity, string>> = {
  pes: { nizka: "Klidný, krátké procházky", bezna: "Běžný, 1–2 h pohybu", vysoka: "Hodně aktivní, sport", pracovni: "Pracovní, celodenní zátěž" },
  kocka: { nizka: "Klidná, spí většinu dne", bezna: "Bytová, hraje si", vysoka: "Venkovní, loví", pracovni: "Venkovní, loví" },
};

export const CONDITION_LABEL: Record<Condition, string> = {
  hubeny: "Hubený, žebra vidět",
  idealni: "Ideální, žebra nahmatám",
  nadvaha: "Mírná nadváha, žebra pod tukem",
  obezita: "Výrazná nadváha, pas není vidět",
};

/** Kroky přechodu pro začátečníky (shodné se stránkou Jak začít). */
export const TRANSITION_STEPS: { when: string; title: string; text: string }[] = [
  { when: "1. týden", title: "Jeden druh masa", text: "Lehce stravitelná drůbeží svalovina, u psů případně s troškou zeleniny. Granule v jiném jídle." },
  { when: "2. týden", title: "Přidejte kosti", text: "Měkké masité kosti, například kuřecí krky. Tvrdá nebo světlá stolice znamená kostí moc." },
  { when: "3. týden", title: "Vnitřnosti a bachory", text: "Po malých kouscích, játra jsou silná. U psů zařaďte i zelené bachory." },
  { when: "od 4. týdne", title: "Další druhy masa", text: "Hovězí, jehněčí, králičí nebo ryba, každý nový druh zvlášť pár dní." },
  { when: "dál", title: "Plný jídelníček", text: "Přidejte olej a doplňky, střídejte více druhů masa. Přechod je hotový." },
];

/** Role doplňků, které kalkulačka nabízí navíc k základnímu nákupu. */
export const EXTRA_ROLES: Reco["role"][] = ["kosti", "ryba", "vnitrnosti", "olej", "zelenina", "rekreacni"];
const ROLE_ADDON: Partial<Record<Reco["role"], AddonKey>> = { kosti: "kosti", ryba: "ryba", vnitrnosti: "vnitrnosti", olej: "olej", zelenina: "zelenina", rekreacni: "rekreacni" };
export const addonForRole = (role: Reco["role"]) => ROLE_ADDON[role];

/**
 * Doporučení navíc: pro každou vypnutou roli vybere nejlepší produkt (využití balení za období a výhodnost pro obchod)
 * a vrátí ho s porcí, počtem balení a cenou tak, jak by vypadal v plánu po přidání.
 */
export function recommendExtras(products: Product[], i: AnimalInput, days: number): Reco[] {
  const off = (Object.keys(i.addons) as AddonKey[]).filter((k) => !i.addons[k] && k !== "granule");
  if (!off.length) return [];
  const all = buildPlan(products, { ...i, addons: { ...i.addons, ...Object.fromEntries(off.map((k) => [k, true])) } as Record<AddonKey, boolean> }, days);
  return all.items.filter((it) => {
    const key = addonForRole(it.role);
    return key !== undefined && off.includes(key);
  });
}
