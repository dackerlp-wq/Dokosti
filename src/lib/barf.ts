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
  /** Jak krmit: hotové mixy (maso s kostí v jednom), nebo si misku složit ze svaloviny, masitých kostí a vnitřností. */
  mode?: FeedMode;
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
import { slozeni } from "@/lib/skladba";
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

export type FeedMode = "mixy" | "sam";

export type AddonKey = "kosti" | "ryba" | "olej" | "zelenina" | "rekreacni" | "vnitrnosti" | "doplnky" | "granule";
export const ADDON_LABEL: Record<AddonKey, string> = {
  kosti: "Kosti",
  ryba: "Rybí den",
  olej: "Olej",
  zelenina: "Zelenina",
  rekreacni: "Kost na okusování",
  vnitrnosti: "Vnitřnosti",
  doplnky: "Doplňky",
  granule: "Granule",
};
export const DEFAULT_ADDONS: Record<AddonKey, boolean> = { kosti: true, ryba: true, olej: true, zelenina: true, rekreacni: true, vnitrnosti: true, doplnky: true, granule: true };
/** Plán Krmení na míru (obě verze): v nákupu je všechno, co do BARF misky patří; zelenina a kost na okusování jen na přání. */
export const FULL_ADDONS: Record<AddonKey, boolean> = { kosti: true, ryba: true, olej: true, zelenina: false, rekreacni: false, vnitrnosti: true, doplnky: true, granule: true };
/** Kalkulačka: základ je jen mix (a granule při přechodu), doplňky se nabízejí zvlášť jako doporučení. */
export const BASE_ADDONS: Record<AddonKey, boolean> = { kosti: false, ryba: false, olej: false, zelenina: false, rekreacni: false, vnitrnosti: false, doplnky: false, granule: true };

/**
 * Co produkt v jídelníčku dělá. „mix“ je základ misky s kostí v jednom balení: BARF směsi a mleté maso s kostí. Maso a vnitřnosti se dělí na svalovinu, kusy s kostí, vnitřnosti a ryby;
 * kalkulačka je musí rozlišit, jinak by třeba játra nebo srdce brala jako základ misky.
 */
export type FoodKind = "mix" | "sval" | "vnitrnosti" | "ryba" | "kost" | "rekreacni" | "olej" | "mineraly" | "vitaminy" | "prilohy" | "granule" | "jine";
export function foodKind(p: Product): FoodKind {
  // Konzervy a kapsičky jsou v řadě Granule a konzervy, kalkulačka s nimi ale nepočítá jako s granulemi.
  if (p.line === "granule") return p.kind === "konzervy" ? "jine" : "granule";
  if (p.line === "kosti" || (p.line === "maso" && p.kind === "kosti")) {
    if (p.nutrition?.boneClass === "rekreacni" || has(p, "žebr", "morkov", "kolen", "kloub")) return "rekreacni";
    // Celé kusy (krky, křídla, stehna, sekané kuře) jsou masité kosti; mleté maso s kostí je základ misky jako směs.
    return /krk|kridl|stehn|sekan/.test(fold(p.variant)) ? "kost" : "mix";
  }
  if (p.line === "navic") return p.kind === "oleje" ? "olej" : p.kind === "mineraly" ? "mineraly" : p.kind === "prilohy" ? "prilohy" : "jine";
  if (p.line === "barf") return "mix";
  if (p.line !== "maso") return "jine";
  // Maso a vnitřnosti: podkategorie rozhoduje, bez ní se odhadne z názvu a etikety.
  if (p.kind === "svalovina") return "sval";
  if (p.kind === "vnitrnosti") return "vnitrnosti";
  if (p.kind === "ryby") return "ryba";
  const v = fold(p.variant);
  if (p.meats?.includes("ryby") || /ryb|losos|sprot|tresk|makrel|sled/.test(v)) return "ryba";
  if ((p.nutrition?.liverPct ?? 0) >= 50 || (p.nutrition?.organPct ?? 0) >= 90 || /jatra|ledvin|droby a orez|vnitrnost|slezin/.test(v)) return "vnitrnosti";
  if (p.nutrition?.isComplete || mixHasBone(p) || /\bmix\b|smes/.test(v)) return "mix";
  return "sval";
}
/** Obsahuje mix kost (podle etikety nebo složení)? */
/**
 * Denní dávka doplňku podle výrobce: rozpětí min–max pro dané zvíře, null když dávkování u produktu neznáme.
 * „food“ se počítá z denní dávky krmiva, „body“ z hmotnosti, „tiers“ je pevná dávka podle pásma hmotnosti.
 */
export function supplementDose(p: Product, species: Species, weightKg: number, dailyGrams: number): { min: number; max: number; unit: "ml" | "g" } | null {
  const rule = p.dose?.[species];
  if (!p.dose || !rule) return null;
  if (rule.per === "tiers") {
    const tier = rule.tiers.find(([to]) => to == null || weightKg <= to) ?? rule.tiers[rule.tiers.length - 1];
    return { min: tier[1], max: tier[2], unit: p.dose.unit };
  }
  if (rule.per === "food") return { min: (rule.min * dailyGrams) / 100, max: (rule.max * dailyGrams) / 100, unit: p.dose.unit };
  return { min: rule.min * weightKg, max: rule.max * weightKg, unit: p.dose.unit };
}
/** Dávka lidsky: malé dávky na půl gramu/mililitru, větší na celé. */
const fmtDose = (x: number) => (x < 3 ? (Math.round(x * 10) / 10).toLocaleString("cs-CZ") : String(Math.round(x)));
const doseText = (d: { min: number; max: number; unit: string }, where = "") =>
  `${fmtDose(d.min)} ${d.unit} denně${where}` + (Math.abs(d.max - d.min) < 0.25 ? "" : ` (výrobce ${fmtDose(d.min)}–${fmtDose(d.max)} ${d.unit}, začněte spodní dávkou)`);
const mixHasBone = (p: Product) => (p.nutrition?.bonePct ?? 0) > 0 || Boolean(slozeni(p)?.kost);

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
  // Zelenina: výrobci sušené zeleniny uvádějí u malých a středních psů 10–15 % uvařené zeleniny v misce.
  const plant = i.ration === "zelenina" ? 10 : 0;
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
  if (!energyMode) notes.push({ kind: "info", text: "U zvoleného masa zatím neznáme energii z etikety, proto počítáme s běžnou hustotou syrové stravy. Dávka je orientační." });

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
  role: "zaklad" | "ryba" | "kosti" | "rekreacni" | "vnitrnosti" | "olej" | "zelenina" | "doplnek" | "granule";
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
/** O kolik smí být nákup mixů pod potřebou (dávka pak o tolik klesne) a do jaké přebytku se ještě rozprostře do dávky místo zbytku do mrazáku. */
const UNDER_TOL = 0.03;
const SPREAD_TOL = 0.05;
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

/**
 * Ryba místo masa jeden den v týdnu: celá balení zhruba na sedminu dávky za období (porcuje se jako ostatní maso).
 * Když by i jedno balení bylo víc než 20 % dávky za období, ryba se na toto období nehodí.
 */
function fishAlloc(fish: Product, animalGrams: number, days: number): { packs: number; grams: number; fit: number } | null {
  const need = animalGrams * days;
  const target = need / 7;
  const packs = Math.max(1, Math.round(target / fish.weightGrams));
  const grams = packs * fish.weightGrams;
  if (grams > 0.2 * need) return null;
  return { packs, grams, fit: clamp01(1 - Math.abs(grams - target) / target) };
}

/** Nejmenší podíl balení, který se musí stihnout sníst v trvanlivosti, aby mělo smysl ho nabízet. */
const MIN_FIT = 0.35;
/** Na kolik nákupů nejvýš smí balení vydržet: do konce trvanlivosti. */
const maxPeriodsFor = (product: Product, days: number, shelf = shelfDays(product)) => Math.max(1, Math.floor(shelf / days));

/**
 * Kusový sáček (kosti, vnitřnosti): celé sáčky do `maxGrams`, jinak jeden sáček na víc nákupů. V období se z něj sní
 * aspoň tolik, aby se stihl do konce trvanlivosti (`grams`); když by to bylo víc než `maxGrams`, sáček je pro zvíře
 * moc velký a nenabízí se (fit 0).
 */
function bagAlloc(product: Product, target: number, maxGrams: number, days: number, shelf?: number): { packs: number; grams: number; periods: number; fit: number } {
  const W = product.weightGrams;
  const k = Math.max(1, Math.round(target / W));
  if (k * W <= maxGrams) return { packs: k, grams: k * W, periods: 1, fit: 1 };
  const grams = Math.max(target, W / maxPeriodsFor(product, days, shelf));
  if (grams > maxGrams || target <= 0) return { packs: 1, grams: 0, periods: 1, fit: 0 };
  const periods = Math.max(2, Math.ceil(W / grams));
  const fit = target / grams;
  return fit < MIN_FIT ? { packs: 1, grams: 0, periods: 1, fit: 0 } : { packs: 1, grams: Math.min(W, grams), periods, fit };
}

/**
 * Denní doplněk (olej, zelenina, granule): celá balení podle průměru. Vydrží nejvýš do konce trvanlivosti;
 * co se do té doby nesní, je ztráta, a když by to byla většina balení, doplněk se nenabízí (fit 0).
 */
function dailyAlloc(product: Product, gpd: number, days: number): { qty: number; used: number; periods: number; fit: number } {
  const W = product.weightGrams;
  const qty = gpd > 0 ? packs(gpd * days, W) : 1;
  const used = gpd * days;
  const lasts = gpd > 0 ? (qty * W) / gpd : days;
  const periods = Math.max(1, Math.min(Math.floor(lasts / days), maxPeriodsFor(product, days)));
  const usable = gpd > 0 ? Math.min(qty * W, gpd * days * periods) : qty * W;
  const fit = usable / (qty * W);
  return { qty, used, periods, fit: fit < MIN_FIT ? 0 : fit };
}

/**
 * Kolik balení kterého mixu koupit: druhy masa dostanou co nejrovnější díl (liší se nejvýš o jedno balení),
 * součet pokryje potřebu. Když by i jedno balení od každého druhu bylo moc, ubírají se druhy od konce.
 * Vrací počty ve stejném pořadí jako `mixes`.
 */
function mixPacks(mixes: Product[], need: number): number[] {
  const n = mixes.length;
  if (!n || need <= 0) return mixes.map(() => 0);
  const q = new Array<number>(n).fill(1);
  const sum = () => q.reduce((s, c, idx) => s + c * mixes[idx].weightGrams, 0);
  // Moc druhů na malou potřebu: od konce ubírat, dokud zbytek pořád stačí.
  for (let idx = n - 1; idx > 0; idx--) if (sum() - mixes[idx].weightGrams >= need * (1 - UNDER_TOL)) q[idx] = 0;
  // Přidávat balení tomu druhu, kterého je zatím nejméně gramů, dokud součet nestačí.
  while (sum() < need * (1 - UNDER_TOL)) {
    let pick = -1;
    for (let idx = 0; idx < n; idx++) {
      if (!q[idx]) continue;
      if (pick < 0 || q[idx] * mixes[idx].weightGrams < q[pick] * mixes[pick].weightGrams) pick = idx;
    }
    q[pick]++;
  }
  return q;
}

/** Klíč druhu masa: mixy se stejnými druhy masa jsou pro pestrost jídelníčku jeden druh. */
const meatKey = (p: Product) => (p.meats?.length ? [...p.meats].sort().join("+") : fold(p.variant).replace(/\d.*$/, "").trim());
const isPoultry = (p: Product) => (p.meats?.length ? p.meats.some((m) => m === "kureci" || m === "kruti" || m === "kachni") : has(p, "drůbeží", "kuřecí", "krůtí", "kachní", "kuře"));

/**
 * Vybere základ (BARF směsi a mleté maso s kostí, ne čistou svalovinu ani vnitřnosti).
 * Počet druhů: začátečník a mládě 1 (drůbeží), jinak 3 na dva týdny a 4 na čtyři týdny, ale nikdy víc, než kolik
 * balení se za období sní. Z každého druhu jedno balení, velikostí co nejblíž dvěma dnům krmení
 * (rozmražené se má sníst do dvou dnů), mezi stejně vhodnými rozhoduje výhodnost pro obchod.
 */
function pickMixes(pool: Product[], i: AnimalInput, animalGrams: number, days: number): Product[] {
  const mixes =
    i.mode === "sam"
      ? pool.filter((p) => foodKind(p) === "sval" && p.storage !== "suche" && !has(p, "vemen"))
      : pool.filter((p) => foodKind(p) === "mix" && p.storage !== "suche");
  if (!mixes.length) return [];
  const ideal = Math.min(1000, Math.max(200, animalGrams * 2));
  const sizeFit = (p: Product) => 1 / (1 + Math.abs(Math.log(p.weightGrams / ideal)));
  // Složím si sám: základ je opravdová svalovina; srdce, žaludky a dršťky jen jako doplněk střídání.
  const offal = (p: Product) => (i.mode === "sam" && has(p, "srdce", "žalud", "dršť") ? 0.6 : 1);
  const value = (p: Product) => (0.6 * sizeFit(p) + 0.4 * score(p)) * offal(p);
  const best = (cands: Product[]) => [...cands].sort((x, y) => value(y) - value(x))[0];
  const groups = new Map<string, Product[]>();
  for (const p of mixes) groups.set(meatKey(p), [...(groups.get(meatKey(p)) ?? []), p]);
  let reps = [...groups.values()].map(best);
  // Drůbeží druhy první (snesou je skoro všichni), u koček nejdřív ty s deklarovaným taurinem, pak výhodnost.
  // Mixy s kostí před mixy bez kosti (těm by chyběl vápník).
  reps.sort((x, y) => Number(i.mode !== "sam" && mixHasBone(y)) - Number(i.mode !== "sam" && mixHasBone(x)) || offal(y) - offal(x) || Number(isPoultry(y)) - Number(isPoultry(x)) || score(y) - score(x));
  if (i.species === "kocka") reps.sort((x, y) => Number(!!y.nutrition?.taurineMgPerKg) - Number(!!x.nutrition?.taurineMgPerKg));
  // Kočka, která si misku skládá sama: srdce jako jeden z druhů masa kvůli taurinu.
  if (i.species === "kocka" && i.mode === "sam") {
    const heart = [...mixes].filter((p) => has(p, "srdce")).sort((x, y) => score(y) - score(x))[0];
    if (heart) reps = [heart, ...reps.filter((p) => p.slug !== heart.slug)];
  }
  // Kuře celé a drůbež s hovězím jsou různé produkty, ale střídání chce různé hlavní maso: druhý drůbeží druh až za ostatními.
  const seenMain = new Set<string>();
  const firstPass: Product[] = [];
  const later: Product[] = [];
  for (const p of reps) {
    const main = p.meats?.[0] ?? meatKey(p);
    (seenMain.has(main) ? later : firstPass).push(p);
    seenMain.add(main);
  }
  reps = [...firstPass, ...later];
  const want = i.beginner || i.stage === "mlade" ? 1 : days >= 28 ? 4 : 3;
  const packsInPeriod = Math.max(1, Math.floor((animalGrams * days) / ideal));
  return reps.slice(0, Math.max(1, Math.min(want, packsInPeriod)));
}

/** Jedlé kosti vhodné velikostí: kočky, malí psi a štěňata do 6 měsíců kuřecí krky, střední křídla a krky, velcí kachní krky, sekané kuře a stehna. */
function boneCandidates(pool: Product[], i: AnimalInput, adultKg: number): Product[] {
  const edible = pool.filter((p) => foodKind(p) === "kost");
  const small = i.species === "kocka" || adultKg < 10 || (i.stage === "mlade" && (i.ageMonths ?? 0) < 6);
  const large = adultKg > 25;
  const fitting = edible.filter((p) => (small ? has(p, "kuřecí krk", "krky kuřecí", "křidélk") : large ? has(p, "krůtí", "skelet", "kachní", "sekan", "stehn") : has(p, "křídl", "krk")));
  // Malé zvíře velkou kost nedostane: radši žádnou než kuřecí stehno pro kočku.
  return fitting.length ? fitting : small ? [] : edible;
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
export function shelfDays(p: { line: string; storage: string; kind?: string }): number {
  if (p.storage === "chlazene") return 7;
  if (p.line === "granule" && p.kind !== "konzervy") return 120;
  // Mražené maso: Sokol Falco uvádí trvanlivost 1 rok.
  if (p.storage === "mrazene") return 365;
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
  // Do plánu jen krmivo: příslušenství (odměrky) a ostatní nekrmné věci z Navíc ven.
  const pool = products.filter((p) => p.inStock && p.unit !== "kg" && p.animals.includes(i.species) && !i.removed.includes(p.slug) && !containsMeat(p, i.exclude) && foodKind(p) !== "jine");
  const swap = (p: Product) => (i.swaps?.[p.slug] && pool.find((x) => x.slug === i.swaps[p.slug] && foodKind(x) === foodKind(p))) || p;
  // Nejdřív denní dávka (orientačně), podle ní velikost balení a počet druhů masa; pak přesný výpočet s energií zvolených mixů.
  const prelim = calculate(i);
  const prelimAnimal = prelim.dailyGrams * ((100 - prelim.composition.plant) / 100);
  const mixes = pickMixes(pool, i, prelimAnimal, days).map(swap).filter((m, idx, arr) => arr.findIndex((x) => x.slug === m.slug) === idx);
  /** Složím si sám: základ je svalovina, k ní vždy masité kosti a vnitřnosti (játra a další). */
  const muscleBase = i.mode === "sam" && mixes.length > 0;
  const kibbleCands = pool.filter((p) => foodKind(p) === "granule");
  const kibble = i.rawShare < 100 && i.addons.granule ? (choose(kibbleCands.filter((p) => i.stage !== "mlade" || has(p, "štěň", "puppy", "junior")), () => 1) ?? choose(kibbleCands, () => 1)) : null;
  const result = calculate(i, mixesKcal(mixes), kibble?.nutrition?.kcalPer100g ?? null);
  const D = result.dailyGrams;
  const comp = result.composition;
  const notes: Note[] = [];
  const adultKg = i.species === "pes" && i.stage === "mlade" ? (i.adultWeightKg ?? estimateAdultWeight(i.weightKg, i.ageMonths ?? 4)) : result.idealKg;
  const baseWord = muscleBase ? "masa" : "základu";

  // Rostlinná část jde mimo maso; zbytek je živočišná dávka, kterou pokrývají mixy (svalovina), ryba, kosti a vnitřnosti.
  const animalGrams = D * ((100 - comp.plant) / 100);
  const minSplit = Math.max(30, round5(animalGrams * 0.15));
  const needAll = animalGrams * days;

  // Ryba: jeden den v týdnu místo masa, celá balení na zhruba sedminu dávky. Začátečníci a mláďata ji zatím nemají.
  const fishCands = pool.filter((p) => foodKind(p) === "ryba" && p.storage !== "suche");
  let fish: Product | null = null;
  let fishA: ReturnType<typeof fishAlloc> = null;
  if (i.addons.ryba && !fishCands.length && mixes.length > 0 && !i.exclude.includes("ryby")) notes.push({ kind: "info", text: "Rybu teď nemáme skladem, omega-3 doplní rybí olej." });
  if (i.addons.ryba && fishCands.length && (i.beginner || i.stage === "mlade") && mixes.length > 0)
    notes.push({ kind: "info", text: i.stage === "mlade" ? "Rybí maso u mláďat zatím vynecháváme, omega-3 doplní rybí olej." : "Na začátku BARFu rybu vynecháváme, omega-3 doplní rybí olej. Rybí den přidejte po pár týdnech." });
  if (i.addons.ryba && fishCands.length && !i.beginner && i.stage !== "mlade" && mixes.length > 0) {
    fish = choose(fishCands, (p) => fishAlloc(p, animalGrams, days)?.fit ?? 0);
    if (fish) fish = swap(fish);
    fishA = fish ? fishAlloc(fish, animalGrams, days) : null;
    if (!fishA) {
      fish = null;
      notes.push({ kind: "info", text: days < 28 ? "Rybí balení je na 14 dní pro vaše zvíře moc velké. S dodávkou na 28 dní rybu zařadíme." : "Rybí balení je pro vaše zvíře moc velké, omega-3 doplní rybí olej." });
    }
  }
  const fishShare = fishA ? fishA.grams / needAll : 0;

  // Bilance kosti: kost v mixu z etikety, jinak neznámá. Svalovina kost nemá.
  const mixBonePcts = mixes.map((m) => (muscleBase ? 0 : m.nutrition?.bonePct));
  const fromMix = mixes.length && mixBonePcts.every((b) => b != null) ? (mixBonePcts as number[]).reduce((a, b) => a + b, 0) / mixes.length : null;
  /** Podíl dávky na masité kosti podle podílu kosti v nich (náhrada části mixu). */
  const rmbShareFor = (rmbBonePct: number) => {
    if (fromMix == null) return (0.15 * 2) / 7;
    const mixShare = 1 - comp.plant / 100 - fishShare;
    const deficit = comp.bone - mixShare * fromMix;
    return deficit > 0.5 ? Math.min(0.3, deficit / Math.max(1, rmbBonePct - fromMix)) : 0.1 / 7;
  };
  // Kost je ve složení všech zvolených základů, jen výrobce neuvádí kolik („kuře včetně kostí“): masité kosti navíc
  // nepřidáváme, kost by se sčítala naslepo.
  const boneDeclaredOnly = !muscleBase && fromMix == null && mixes.length > 0 && mixes.every(mixHasBone);
  if (boneDeclaredOnly && i.addons.kosti)
    notes.push({ kind: "info", text: "Kost je ve složení základu uvedená, kolik jí je, výrobce neuvádí. Masité kosti navíc proto do plánu nedáváme. Tvrdá a světlá stolice znamená kostí moc." });
  const boneCands = (i.addons.kosti && !boneDeclaredOnly) || muscleBase ? boneCandidates(pool, i, adultKg) : [];
  const boneCap = (target: number) => Math.min((muscleBase ? 1.4 : 2.5) * target, 0.3 * needAll);
  const boneAllocFor = (p: Product) => {
    const target = rmbShareFor(p.nutrition?.bonePct ?? DEFAULT_RMB_BONE_PCT) * needAll;
    return bagAlloc(p, target, boneCap(target), days);
  };
  const bone0 = choose(boneCands, (p) => boneAllocFor(p).fit);
  let bone = bone0 ? swap(bone0) : null;
  if (bone && boneAllocFor(bone).fit <= 0) bone = null;
  if (boneCands.length && !bone) notes.push({ kind: "info", text: "Sáček kostí je pro vaše zvíře na toto období moc velký, proto v plánu není. V prodejně prodáme i po kusech." });
  if (muscleBase && !boneCands.length) notes.push({ kind: "info", text: "Vhodné masité kosti zrovna nemáme skladem, vápník proto doplní vaječné skořápky." });
  const rmbBonePct = bone?.nutrition?.bonePct ?? DEFAULT_RMB_BONE_PCT;
  const rmbShare = bone ? rmbShareFor(rmbBonePct) : 0;
  if (bone && !muscleBase) {
    if (fromMix == null) notes.push({ kind: "info", text: "Ve složení části základu kost není, proto masité kosti doporučujeme jako náhradu části porce dvakrát týdně. Tvrdá a světlá stolice znamená kostí moc." });
    else {
      const boneFromMix = (1 - comp.plant / 100 - fishShare) * fromMix;
      if (comp.bone - boneFromMix <= 0.5) notes.push({ kind: "info", text: "Podle složení od výrobce je kost v základu zhruba v cílovém podílu. Masité kosti proto jen jednou týdně místo části porce, hlavně na okusování." });
      if (boneFromMix + rmbShare * rmbBonePct > 12) notes.push({ kind: "warn", text: "Celkový podíl kosti vychází vysoko. Pokud je stolice tvrdá a světlá, kosti uberte." });
    }
  }
  const mixShare = Math.max(0, 1 - comp.plant / 100 - fishShare - rmbShare);

  // Vnitřnosti: játra a další vnitřnosti zvlášť. Ze základu se počítá jen to, co výrobce uvádí: játra jen když jsou ve
  // složení výslovně (liverPct), „droby“ bez rozpisu jen jako další vnitřnosti. Kočka bez taurinu a bez srdce v mase
  // dostane ještě srdce.
  const declaredLiver = (m: Product) => m.nutrition?.liverPct ?? 0;
  const declaredOther = (m: Product) => (m.nutrition?.organPct != null ? Math.max(0, m.nutrition.organPct - declaredLiver(m)) : slozeni(m)?.vnitrnosti ? 100 : 0);
  const avgOf = (f: (m: Product) => number) => (mixes.length && !muscleBase ? mixes.reduce((sum, m) => sum + f(m), 0) / mixes.length : 0);
  const liverDeficit = comp.liver - mixShare * avgOf(declaredLiver);
  const otherDeficit = comp.organs - mixShare * avgOf(declaredOther);
  const liverShare = liverDeficit >= 1 ? Math.min(comp.liver, liverDeficit) / 100 : 0;
  const otherShare = otherDeficit >= 2 ? Math.min(comp.organs, otherDeficit) / 100 : 0;
  const catNeedsHeart = i.species === "kocka" && !mixes.some((m) => m.nutrition?.taurineMgPerKg || has(m, "srdce"));
  const organOn = i.addons.vnitrnosti || muscleBase;
  const organPool = organOn ? pool.filter((p) => foodKind(p) === "vnitrnosti" || (catNeedsHeart && foodKind(p) === "sval" && has(p, "srdce"))) : [];
  const isLiver = (p: Product) => has(p, "játra");
  const pickOrgan = (cands: Product[], share: number, pref: (p: Product) => number) =>
    share > 0 ? choose(cands, (p) => bagAlloc(p, share * needAll, 1.4 * share * needAll, days).fit * pref(p)) : null;
  const organPicks: { product: Product; share: number; why: string }[] = [];
  const heartShare = 1 / 14;
  const heart = catNeedsHeart ? pickOrgan(organPool.filter((p) => has(p, "srdce")), heartShare, () => 1) : null;
  if (heart) organPicks.push({ product: heart, share: heartShare, why: "srdce kvůli taurinu" });
  const liver = pickOrgan(organPool.filter(isLiver), liverShare, () => 1);
  if (liver) organPicks.push({ product: liver, share: liverShare, why: "játra do 5 % dávky" });
  const other = pickOrgan(organPool.filter((p) => !isLiver(p) && !has(p, "srdce")), otherShare, (p) => (has(p, "ledvin") ? 1 : 0.7));
  if (other) organPicks.push({ product: other, share: otherShare, why: "další vnitřnosti do 5 % dávky" });
  if (organOn && liver && mixes.some((m) => slozeni(m)?.drobyNerozepsane) && !muscleBase)
    notes.push({ kind: "info", text: "Směs obsahuje droby, výrobce ale nerozepisuje které. Játra proto přidáváme zvlášť, nejvýš do 5 % dávky." });
  if (i.addons.vnitrnosti && !muscleBase && !organPicks.length && liverShare === 0 && otherShare === 0 && !catNeedsHeart)
    notes.push({ kind: "info", text: "Vnitřnosti jsou ve složení základu, další nepřidáváme." });
  if (!heart && catNeedsHeart) notes.push({ kind: "info", text: "Kočka potřebuje taurin a v základu ho výrobce neuvádí. Přidejte jednou týdně syrové kuřecí nebo hovězí srdce." });
  if (organOn && liverShare > 0 && !liver)
    notes.push({ kind: muscleBase ? "warn" : "info", text: "Játra zrovna nemáme v balení, které by se pro vaše zvíře hodilo. Do BARF jídelníčku patří, stavte se pro radu v prodejně." });

  // Denní doplňky: olej 1 ml na 100 g dávky (rybí, když v plánu není ryba), zelenina 20 % dávky u psů, granule podle energie.
  // Sušené přílohy a doplňky se dávkují podle obalu: v plánu je jedno balení, které vydrží několik dodávek.
  // Olej do BARFu je zdroj omega mastných kyselin: rybí (losos), nebo lněný a konopný. Ostropestřec není na omega-3
  // a olej z tresčích jater má hodně vitaminu A a D, ten kalkulačka sama nenabízí.
  const fishOil = (p: Product) => has(p, "losos", "rybí");
  // Omega-3 z mikrořas (olej i prášek) je náhrada rybího oleje pro psy, kteří rybu nejedí.
  const algae = (p: Product) => has(p, "mikrořas");
  const oilCands = pool.filter((p) => algae(p) || (foodKind(p) === "olej" && (fishOil(p) || has(p, "lněn", "konop"))));
  // Dávka oleje podle výrobce (spodní hranice); bez údaje 1 ml na 100 g dávky.
  const doseKg = result.idealKg;
  const oilDoseOf = (p: Product) => supplementDose(p, i.species, doseKg, D);
  const oilPerDayOf = (p: Product) => oilDoseOf(p)?.min ?? D / 100;
  // Bez ryby v plánu má rybí olej jasnou přednost; s rybou rostlinný (omega-3 už je z ryby).
  const oilPref = (p: Product) => (fish ? (fishOil(p) ? 0.7 : algae(p) ? 0.6 : 1) : fishOil(p) ? 1 : algae(p) ? 0.9 : 0.3);
  const oil = i.addons.olej ? choose(oilCands, (p) => (dailyAlloc(p, oilPerDayOf(p), days).fit > 0 ? oilPref(p) : 0)) : null;
  const oilPerDay = oil ? oilPerDayOf(oil) : 0;
  const oilDose = oil ? oilDoseOf(oil) : null;
  if (oil && oil.dose?.[i.species]?.per === "food") notes.push({ kind: "info", text: `${productName(oil)}: výrobce doporučuje podle tučnosti masa a celkový tuk v krmivu do 20 %. K tučnějšímu masu (kachna, vepřové) dávejte spodní dávku.` });
  const vegCands = pool.filter((p) => foodKind(p) === "prilohy" && has(p, "zelenin", "barfex"));
  // Přednost má zelenina s dávkováním od výrobce (dýně, řepa), aby šla spočítat do misky.
  const veg0 = comp.plant > 0 && i.addons.zelenina ? choose(vegCands, (p) => (supplementDose(p, i.species, 10, 100) ? 1 : 0.5)) : null;
  const veg = veg0 ? swap(veg0) : null;
  if (comp.plant > 0 && i.addons.zelenina && !veg) notes.push({ kind: "info", text: "Sušenou zeleninu zrovna nemáme, rozmixujte mrkev, cuketu nebo dýni." });
  const vegDose = veg ? supplementDose(veg, i.species, result.idealKg, D) : null;
  const vegDry = veg ? veg.storage === "suche" && !vegDose : false;
  const vegPerDay = veg && !vegDry ? (vegDose?.min ?? D * (comp.plant / 100)) : 0;

  // Doplňky podle toho, co v sestavě chybí: jód (mořská řasa), když v plánu není ryba; vápník, když chybí kost
  // (ne u štěňat velkých plemen, tam vápník navíc nepatří).
  const supplements: { product: Product; why: string }[] = [];
  const pick = (kind: FoodKind, ...words: string[]) => choose(pool.filter((p) => foodKind(p) === kind && has(p, ...words)), () => 1);
  const largePuppy = i.species === "pes" && i.stage === "mlade" && adultKg > 25;
  // Svalovina bez masitých kostí: vápník je nutná součást dávky, ne volitelný doplněk.
  if (muscleBase && !bone && !largePuppy) {
    const calcium = pick("mineraly", "vaječn", "vápník");
    if (calcium) supplements.push({ product: calcium, why: "vápník místo kostí, ke svalovině nutný" });
    else notes.push({ kind: "warn", text: "Vápník (vaječné skořápky) zrovna nemáme skladem. Svalovina bez kosti ho potřebuje, stavte se pro radu v prodejně." });
  }
  if (i.addons.doplnky) {
    if (!fish && !(veg && has(veg, "kelp"))) {
      const kelp = choose(pool.filter((p) => foodKind(p) === "mineraly" && fold(p.variant).includes("kelp")), () => 1);
      if (kelp) supplements.push({ product: kelp, why: "jód, když v jídelníčku není ryba" });
    }
    const bonelessShare = mixes.length ? mixes.filter((m) => !mixHasBone(m)).length / mixes.length : 0;
    if (!muscleBase && !bone && bonelessShare >= 0.3 && !largePuppy) {
      const calcium = pick("mineraly", "vaječn", "vápník");
      if (calcium) supplements.push({ product: calcium, why: "vápník k základu bez kosti" });
    }
  }
  const kibblePerDay = kibble && result.kibbleKcal > 0 ? (result.kibbleGrams ?? 0) : 0;
  if (!kibble && i.rawShare < 100) notes.push({ kind: "info", text: "Granule pro tuto kombinaci nemáme skladem, podíl granulí dopočítejte podle tabulky výrobce." });

  /* ---------- nákup v celých baleních ----------
   * Ryba, kosti a vnitřnosti jsou balení s vlastním rytmem (dny krmení rozložené po období). Sáčky, které by v období
   * byly moc, jsou položka na víc nákupů (periods > 1) a sní se z nich jen cílový podíl. Zbytek dávky pokryjí mixy.
   */
  const need = needAll;
  const boneA = bone ? boneAllocFor(bone) : null;
  const organAllocs = organPicks.map((o) => ({ ...o, alloc: bagAlloc(o.product, o.share * need, 1.4 * o.share * need, days) }));
  const sideGrams = (fishA?.grams ?? 0) + (boneA?.grams ?? 0) + organAllocs.reduce((sum, o) => sum + o.alloc.grams, 0);

  // Mixy: počty balení tak, aby součet seděl na zbytek dávky (viz mixPacks), v rozpisu se střídají.
  // Malý přebytek (do 5 %) se rozprostře do dávky; větší přebytek zůstane v mrazáku do příští dodávky a dávka se nemění.
  const mixNeed = Math.max(0, need - sideGrams);
  const mixPlan: Product[] = [];
  let spread = true;
  if (mixes.length && mixNeed > 0) {
    const counts = mixPacks(mixes, mixNeed);
    const left = [...counts];
    while (left.some((c) => c > 0)) {
      for (let idx = 0; idx < mixes.length; idx++) {
        if (left[idx] > 0) {
          mixPlan.push(mixes[idx]);
          left[idx]--;
        }
      }
    }
    const mixSum = mixPlan.reduce((s, m) => s + m.weightGrams, 0);
    const total = mixSum + sideGrams;
    const dev = (total - need) / need;
    spread = dev <= SPREAD_TOL;
    if (spread && round5(total / days) !== round5(animalGrams)) {
      notes.push({ kind: "info", text: `Nákup je zaokrouhlený na celá balení: vychází ${round5(total / days)} g masa denně místo ${round5(animalGrams)} g (${dev > 0 ? "+" : ""}${Math.round(dev * 100)} %, v běžné toleranci).` });
    }
  }

  /* ---------- rozpis den po dni ---------- */
  const pantry = new Pantry();
  const meatQueue: Pack[] = mixPlan.map((m) => pantry.open(m));
  // Při otevření jsme balení jen „koupili“; za načaté ho považujeme až první den krmení.
  const touched = new Set<Pack>();

  /** Dny krmení kusové položky rovnoměrně po období a porce na jedno krmení (poslední porce dojí zbytek). */
  const feedDays = (grams: number, perWeek: number, maxPortion: number, offset = 0) => {
    if (grams <= 0) return { days: new Map<number, number>(), per: 0, count: 0 };
    // Nejmíň `perWeek`× týdně, nejvýš denně; porce nejvýš `maxPortion`.
    let count = Math.max(Math.round((days / 7) * perWeek), Math.ceil(grams / maxPortion));
    count = Math.min(days, Math.max(1, count));
    const per = grams / count;
    const map = new Map<number, number>();
    for (let j = 0; j < count; j++) map.set(Math.min(days - 1, Math.floor(((j + 0.5 + offset) * days) / count) % days), per);
    return { days: map, per, count };
  };

  /** Balení s vlastním rytmem (ryba, kosti, vnitřnosti): vždy z načatého sáčku, nový až po dojedení. */
  type Slot = { product: Product; packs: number; periods: number; feed: ReturnType<typeof feedDays>; bags: Pack[]; remaining: number; last: number; note: string; openNote: string; withMeat: boolean };
  const makeSlot = (product: Product | null, alloc: { packs: number; grams: number; periods?: number } | null, perWeek: number, maxPortion: number, note: string, openNote: string, withMeat: boolean, offset = 0): Slot | null => {
    if (!product || !alloc || alloc.grams <= 0) return null;
    const feed = feedDays(alloc.grams, perWeek, maxPortion, offset);
    pantry.opened.set(product.slug, (pantry.opened.get(product.slug) ?? 0) + alloc.packs);
    const bags = Array.from({ length: alloc.packs }, () => ({ product, left: product.weightGrams }));
    return { product, packs: alloc.packs, periods: alloc.periods ?? 1, feed, bags, remaining: alloc.grams, last: feed.count ? Math.max(...feed.days.keys()) : -1, note, openNote, withMeat };
  };
  const fishSlot = makeSlot(fish, fishA, 1, animalGrams, "ryba místo masa", "nové balení", false, 0.35);
  const boneSlot = makeSlot(bone, boneA, muscleBase ? 3 : 1, animalGrams * (muscleBase ? 0.5 : 0.4), `místo části ${baseWord}`, "nový sáček", false);
  const organSlots = organAllocs.map((o, idx) => ({ why: o.why, slot: makeSlot(o.product, o.alloc, 1, Math.max(30, animalGrams * 0.15), "vnitřnosti", "nové balení", true, 0.2 + 0.4 * idx) }));
  const slots = [fishSlot, boneSlot, ...organSlots.map((o) => o.slot)].filter((x): x is Slot => x !== null);

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

  const remainingMeat = () => meatQueue.reduce((s, q) => s + q.left, 0);
  const start = new Date();
  const weekdayOf = (day: number) => WEEK_DAYS[(start.getDay() + 6 + day) % 7];

  /** Maso dne z fronty: dojíst načaté, pak další v pořadí. Poslední den se dojí všechno, co zbývá (když se nákup rozprostírá). */
  const takeMeat = (need: number, out: DayItem[], lastDay: boolean) => {
    let rest = lastDay && spread ? Number.POSITIVE_INFINITY : need;
    while (rest > 0) {
      const pack = meatQueue.find((q) => q.left > 0);
      if (!pack) break;
      const opening = !touched.has(pack);
      touched.add(pack);
      const tags: string[] = [];
      if (opening) tags.push("nové balení");
      if (pack.left <= rest) {
        const g = pack.left;
        pantry.eat(pack, g);
        rest -= g;
        tags.push("dojíst balení");
        pushItem(out, { product: pack.product, grams: round5(g), note: tags.join(", ") });
        if (!(lastDay && spread) && rest < minSplit) rest = 0; // kvůli drobnosti další balení neotvíráme
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
    const after: DayItem[] = [];
    const remDays = days - day;
    const lastDay = day === days - 1;
    // Denní cíl se přepočítává ze zbytku, aby se úpravy porcí vyrovnaly a všechno koupené se snědlo.
    // Když je nákup o víc než pár procent větší než potřeba, krmí se cílová dávka a přebytek zůstane v mrazáku.
    const evenly = (remainingMeat() + slots.reduce((s, x) => s + x.remaining, 0)) / remDays;
    const dailyTotal = spread ? evenly : Math.min(evenly, animalGrams);

    let fromSlots = 0;
    for (const s of slots) {
      if (!s.feed.days.has(day)) continue;
      const it = fromBags(s.bags, day === s.last ? s.remaining : Math.min(s.feed.per, s.remaining), s.note, s.openNote);
      if (!it) continue;
      fromSlots += it.grams;
      s.remaining = Math.max(0, s.remaining - it.grams);
      (s.withMeat ? after : out).push(it);
    }
    takeMeat(Math.max(0, dailyTotal - fromSlots), out, lastDay);
    out.push(...after);
    if (oil) out.push({ product: oil, grams: 0, note: `${fmtDose(oilPerDay)} ${oilDose?.unit ?? "ml"}` });
    if (veg) out.push(vegDry ? { product: veg, grams: 0, note: "podle návodu na obalu" } : { product: veg, grams: round5(vegPerDay) });
    for (const s of supplements) {
      const d = supplementDose(s.product, i.species, result.idealKg, D);
      out.push({ product: s.product, grams: 0, note: d ? `${fmtDose(d.min)} ${d.unit}` : "podle obalu" });
    }
    if (kibble && result.kibbleKcal > 0) out.push({ product: kibble, grams: kibblePerDay, note: kibblePerDay > 0 ? "v jiném jídle" : `${result.kibbleKcal} kcal podle obalu` });
    return { day, label: `${day + 1}. den`, weekday: weekdayOf(day), items: out };
  });

  /* ---------- nákupní seznam ---------- */
  // Koupí se jen balení, která se v období opravdu načnou (přebytek z mixPacks by jinak ležel celý v mrazáku).
  for (const pack of meatQueue) if (!touched.has(pack)) pantry.opened.set(pack.product.slug, Math.max(0, (pantry.opened.get(pack.product.slug) ?? 0) - 1));
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
  const addSlot = (s: Slot | null, role: Reco["role"], why: string) => s && add(s.product, role, why, perWeekText(s.feed.count, s.feed.per), s.periods);
  const mixUsed = mixes.reduce((s, m) => s + (pantry.used.get(m.slug) ?? 0), 0);
  const mixDaily = mixUsed / days;
  const boughtMixes = mixes.filter((m) => (pantry.opened.get(m.slug) ?? 0) > 0).length;
  const baseWhy = muscleBase
    ? boughtMixes > 1 ? "svalovina, druhy střídejte" : "svalovina, základ misky"
    : boughtMixes > 1 ? "druhy střídejte po celých balíčcích" : i.beginner || i.stage === "mlade" ? "jeden druh masa na začátek" : "základ misky";
  mixes.forEach((m) => add(m, "zaklad", baseWhy, `~${round5(mixDaily)} g denně${boughtMixes > 1 ? " dohromady" : ""}`));
  addSlot(fishSlot, "ryba", "jeden den v týdnu místo masa, omega-3");
  addSlot(boneSlot, "kosti", (muscleBase ? "vápník, místo části masa" : "místo části porce") + (i.beginner ? ", přidávejte až od 2. týdne" : ""));
  // Rekreační kost pro psy nad 10 kg, mimo dávku.
  if (i.addons.rekreacni && i.species === "pes" && adultKg >= 10 && i.stage !== "mlade") {
    const rec = choose(pool.filter((p) => foodKind(p) === "rekreacni" && (p.nutrition?.boneClass === "rekreacni" || has(p, "žebr", "morkov"))), () => 1);
    if (rec) items.push({ product: rec, qty: 1, gramsPerDay: 0, usedGrams: 0, leftoverGrams: 0, periods: Math.max(1, Math.round(28 / days)), portionText: "na okusování, nepočítá se do dávky", role: "rekreacni", why: "jen pod dohledem" });
  }
  const later = (week: number) => (i.beginner ? `, přidávejte až od ${week}. týdne` : "");
  organSlots.forEach((o, idx) => addSlot(o.slot, "vnitrnosti", o.why + later(3 + Math.min(1, idx))));
  const daily = (product: Product, gpd: number, role: Reco["role"], why: string, text: string) => {
    const { qty, used, periods } = dailyAlloc(product, gpd, days);
    items.push({ product, qty, gramsPerDay: gpd, usedGrams: used, leftoverGrams: Math.max(0, qty * product.weightGrams - used), periods, portionText: text, role, why });
  };
  if (oil) daily(oil, oilPerDay, "olej", fish ? "omega-3 navíc k rybě, dávka podle výrobce" : fishOil(oil) ? "omega-3, protože v plánu není ryba" : algae(oil) ? "omega-3 z řas, bez ryb" : "omega-3, dávka podle výrobce", oilDose ? doseText(oilDose, " do misky") : `${fmtDose(oilPerDay)} ml denně do misky`);
  /** Sušený doplněk dávkovaný podle obalu: jedno balení, které vydrží několik dodávek (nejvýš do trvanlivosti). */
  const onePack = (product: Product, role: Reco["role"], why: string, text: string) => {
    const periods = maxPeriodsFor(product, days);
    const used = product.weightGrams / periods;
    items.push({ product, qty: 1, gramsPerDay: used / days, usedGrams: used, leftoverGrams: product.weightGrams - used, periods, portionText: text, role, why });
  };
  if (veg && vegDry) onePack(veg, "zelenina", "rostlinná část dávky", "podle návodu na obalu");
  else if (veg) daily(veg, vegPerDay, "zelenina", vegDose ? (veg.storage === "suche" ? "sušená, před podáním namočte, uvařená zabere zhruba 10 % misky" : "příloha k masu podle výrobce") : "rostlinná část, 10 % dávky", vegDose ? (veg.storage === "suche" ? `${fmtDose(vegDose.min)}–${fmtDose(vegDose.max)} g sušené denně, začněte menší dávkou` : doseText(vegDose)) : `${round5(vegPerDay)} g denně`);
  for (const s of supplements) {
    const d = supplementDose(s.product, i.species, result.idealKg, D);
    if (d) daily(s.product, d.min, "doplnek", s.why, doseText(d));
    else onePack(s.product, "doplnek", s.why, "denně podle obalu");
  }
  if (kibble && result.kibbleKcal > 0) daily(kibble, kibblePerDay, "granule", `${100 - i.rawShare} % energie`, kibblePerDay > 0 ? `${kibblePerDay} g denně v jiném jídle` : `${result.kibbleKcal} kcal denně podle tabulky na obalu`);

  // Rozmražené se má sníst do dvou dnů: balení, které vydrží déle, se po dovezení rozporcuje.
  const longPack = [...mixes, ...(fish ? [fish] : [])].some((m) => m.weightGrams / animalGrams > 2) || organSlots.some((o) => o.slot && o.slot.product.weightGrams / Math.max(1, o.slot.feed.per) > 2);
  if (mixes.length && longPack)
    notes.push({ kind: "info", text: "Balení vystačí na víc než dva dny. Po dovezení ho nakrájejte ještě zmrzlé (nebo jen povolené v lednici) na denní porce a vraťte do mrazáku. Večer před krmením vždy přendejte jednu porci do lednice. Mražené maso vydrží rok." });
  const baseName = i.mode === "sam" ? "vhodnou svalovinu" : "vhodné maso s kostí";
  if (!mixes.length) notes.push({ kind: "warn", text: `${i.exclude.length ? "Po vyřazení nevhodných druhů masa" : "Pro tuto kombinaci"} zrovna nemáme skladem ${baseName}. Stavte se v prodejně, poskládáme set spolu.` });

  // Zbytek mixů do mrazáku: u pravidelných dodávek se po pár dodávkách nastřádá celé balení.
  const mixLeft = items.filter((it) => it.role === "zaklad").reduce((s, it) => s + it.leftoverGrams, 0);
  const smallestMix = Math.min(...mixes.map((m) => m.weightGrams));
  if (!spread && mixLeft >= 100) {
    const every = Math.ceil(smallestMix / mixLeft);
    const left = mixLeft >= 1000 ? `${(Math.round(mixLeft / 100) / 10).toFixed(1).replace(".", ",")} kg` : `${Math.round(mixLeft / 10) * 10} g`;
    notes.push({ kind: "info", text: `Balení jsou na ${days} dní o něco větší, než zvíře sní: zbyde ~${left} masa, nechte ho v mrazáku na příště. ${every >= 2 && every <= 12 ? `Při pravidelných dodávkách si zhruba každou ${every}. dodávku v účtu zmenšete o jedno balení.` : ""}`.trim() });
  }

  const totalCzk = items.reduce((s, r) => s + r.qty * r.product.priceCzk, 0);
  // Cena za den jen z toho, co se v období sní: zbytek balení do mrazáku a balení na víc nákupů se rozpočítají.
  const periodCzk = items.reduce((s, r) => {
    const bought = r.qty * r.product.weightGrams;
    const share = r.usedGrams > 0 && bought > 0 ? Math.min(1, r.usedGrams / bought) : 1 / r.periods;
    return s + r.qty * r.product.priceCzk * share;
  }, 0);
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
export const EXTRA_ROLES: Reco["role"][] = ["kosti", "ryba", "vnitrnosti", "olej", "zelenina", "doplnek", "rekreacni"];
const ROLE_ADDON: Partial<Record<Reco["role"], AddonKey>> = { kosti: "kosti", ryba: "ryba", vnitrnosti: "vnitrnosti", olej: "olej", zelenina: "zelenina", doplnek: "doplnky", rekreacni: "rekreacni" };
export const addonForRole = (role: Reco["role"]) => ROLE_ADDON[role];

/**
 * Doporučení navíc: pro každou vypnutou roli vybere nejlepší produkt (využití balení za období a výhodnost pro obchod)
 * a vrátí ho s porcí, počtem balení a cenou tak, jak by vypadal v plánu po přidání.
 */
export function recommendExtras(products: Product[], i: AnimalInput, days: number): Reco[] {
  // Složím si sám: kosti a vnitřnosti jsou v plánu vždy, nenabízí se navíc.
  const forced: AddonKey[] = i.mode === "sam" ? ["kosti", "vnitrnosti"] : [];
  const off = (Object.keys(i.addons) as AddonKey[]).filter((k) => !i.addons[k] && k !== "granule" && !forced.includes(k));
  if (!off.length) return [];
  // Každý doplněk se posuzuje k sestavě, kterou zákazník opravdu má: rybí olej se nabídne, když nemá rybu,
  // mořská řasa jen bez ryby, vápník jen bez kostí.
  const extras = off.flatMap((k) =>
    buildPlan(products, { ...i, addons: { ...i.addons, [k]: true } }, days).items.filter((it) => addonForRole(it.role) === k),
  );
  return extras;
}

/* ----------------------------------------------------------------------------------------
 * Co plán obsahuje: kontrolní seznam podle obecných zásad syrového krmení
 * -------------------------------------------------------------------------------------- */

export type CoverageStatus = "plan" | "slozeni" | "navic" | "chybi";
export type CoverageRow = { key: string; label: string; status: CoverageStatus; detail: string };

/**
 * Projde plán proti obecným zásadám BARF (svalovina, kost, játra, další vnitřnosti, ryba nebo olej, jód, u koček srdce)
 * a u každé řekne, čím je pokrytá: produktem v nákupu, složením základu podle výrobce, doporučením navíc, nebo ničím.
 * Nic nehodnotí ani nepočítá živiny; nikdy netvrdí, že je jídelníček „vyvážený“ nebo „kompletní“.
 * `extras` jsou produkty nabízené zvlášť (kalkulačka na úvodní stránce), v průvodci prázdné.
 */
export function planCoverage(plan: Plan, extras: Reco[] = []): CoverageRow[] {
  const base = plan.items.filter((it) => it.role === "zaklad").map((it) => it.product);
  const flags = base.map((p) => ({ p, s: slozeni(p) })).filter((x): x is { p: Product; s: NonNullable<ReturnType<typeof slozeni>> } => x.s !== null);
  const names = (list: Product[]) => [...new Set(list.map((p) => productName(p).replace(/\s+\d.*$/, "").toLowerCase()))].join(", ");
  const inPlan = (f: (it: Reco) => boolean) => plan.items.filter(f).map((it) => it.product);
  const inExtras = (f: (it: Reco) => boolean) => extras.filter(f).map((it) => it.product);
  const baseWith = (k: keyof NonNullable<ReturnType<typeof slozeni>>) => flags.filter((x) => x.s[k]).map((x) => x.p);

  const row = (key: string, label: string, plan_: Product[], declared: Product[], extra: Product[], missing: string): CoverageRow => {
    if (plan_.length) return { key, label, status: "plan", detail: `v nákupu: ${names(plan_)}` };
    if (declared.length) return { key, label, status: "slozeni", detail: `ve složení: ${names(declared)}${declared.length < base.length ? " (ne u všech druhů)" : ""}` };
    if (extra.length) return { key, label, status: "navic", detail: `doporučujeme přidat: ${names(extra)}` };
    return { key, label, status: "chybi", detail: missing };
  };
  const isLiverP = (p: Product) => Boolean(slozeni(p)?.jatra);
  const fishOilP = (p: Product) => has(p, "losos", "rybí", "mikrořas");
  const kelpP = (p: Product) => fold(p.variant).includes("kelp");
  const fishInBase = baseWith("ryba");
  const rows: CoverageRow[] = [
    row("maso", "Svalovina", plan.input.mode === "sam" ? base : [], plan.input.mode === "sam" ? [] : baseWith("maso"), [], "zrovna nemáme vhodné maso skladem"),
    row(
      "kost",
      "Kost nebo vápník",
      inPlan((it) => it.role === "kosti" || (it.role === "doplnek" && has(it.product, "vaječn", "vápník"))),
      baseWith("kost"),
      inExtras((it) => it.role === "kosti" || (it.role === "doplnek" && has(it.product, "vaječn", "vápník"))),
      "masité kosti nebo vápník (vaječné skořápky)",
    ),
    row("jatra", "Játra", inPlan((it) => it.role === "vnitrnosti" && isLiverP(it.product)), baseWith("jatra"), inExtras((it) => it.role === "vnitrnosti" && isLiverP(it.product)), "hovězí nebo kuřecí játra, do 5 % dávky"),
    row(
      "vnitrnosti",
      "Další vnitřnosti",
      inPlan((it) => it.role === "vnitrnosti" && !isLiverP(it.product) && !has(it.product, "srdce")),
      baseWith("vnitrnosti"),
      inExtras((it) => it.role === "vnitrnosti" && !isLiverP(it.product) && !has(it.product, "srdce")),
      "ledvinky nebo droby, do 5 % dávky",
    ),
    row("ryba", "Ryba nebo omega-3", inPlan((it) => it.role === "ryba" || (it.role === "olej" && fishOilP(it.product))), fishInBase, inExtras((it) => it.role === "ryba" || (it.role === "olej" && fishOilP(it.product))), "ryba jednou týdně, nebo rybí olej"),
    row(
      "jod",
      "Jód",
      inPlan((it) => it.role === "ryba" || (it.role === "doplnek" && kelpP(it.product))),
      fishInBase,
      inExtras((it) => it.role === "ryba" || (it.role === "doplnek" && kelpP(it.product))),
      "mořská řasa (kelpa), když v misce není ryba",
    ),
  ];
  if (plan.input.species === "kocka")
    rows.push(row("srdce", "Srdce (taurin)", inPlan((it) => has(it.product, "srdce")), baseWith("srdce"), inExtras((it) => has(it.product, "srdce")), "syrové srdce jednou týdně"));
  if (plan.result.composition.plant > 0)
    rows.push(row("zelenina", "Zelenina", inPlan((it) => it.role === "zelenina"), baseWith("zelenina"), inExtras((it) => it.role === "zelenina"), "rozmixovaná zelenina, zhruba desetina misky"));
  return rows;
}

/* ----------------------------------------------------------------------------------------
 * Pokročilá verze plánu: rozpis misky po složkách v gramech
 * -------------------------------------------------------------------------------------- */

export type BowlTarget = { key: string; label: string; pct: number | null; perDay: string; perWeek: string; hint?: string };

/** Podíl jedlé kosti v masitých kostech (krky, křídla), orientačně. Jen pro přepočet „kolik krků“. */
const RMB_BONE_SHARE = DEFAULT_RMB_BONE_PCT / 100;

/**
 * Cílová skladba misky po složkách z denní dávky (stejné cíle, ze kterých plán skládá nákup).
 * Výchozí hodnoty podle obecných zásad syrového krmení, žádný rozbor konkrétních produktů.
 */
export function bowlTargets(plan: Plan): BowlTarget[] {
  const D = plan.result.dailyGrams;
  const c = plan.result.composition;
  const g = (pct: number) => round5((D * pct) / 100);
  const w = (grams: number) => (grams * 7 >= 1000 ? `${(Math.round((grams * 7) / 100) / 10).toLocaleString("cs-CZ")} kg` : `${round5(grams * 7)} g`);
  const rows: BowlTarget[] = [
    { key: "sval", label: "Svalovina", pct: c.muscle, perDay: `${g(c.muscle)} g`, perWeek: w(g(c.muscle)), hint: "srdce, žaludky a dršťky se počítají sem" },
    { key: "kost", label: "Jedlá kost", pct: c.bone, perDay: `${g(c.bone)} g`, perWeek: w(g(c.bone)), hint: `orientačně ~${round5((D * c.bone) / 100 / RMB_BONE_SHARE)} g krků nebo křídel denně` },
    { key: "jatra", label: "Játra", pct: c.liver, perDay: `${g(c.liver)} g`, perWeek: w(g(c.liver)) },
    { key: "vnitrnosti", label: "Další vnitřnosti", pct: c.organs, perDay: `${g(c.organs)} g`, perWeek: w(g(c.organs)), hint: "ledvinky, slezina, droby" },
  ];
  if (c.plant > 0) rows.push({ key: "zelenina", label: "Zelenina", pct: c.plant, perDay: `${g(c.plant)} g`, perWeek: w(g(c.plant)) });
  const animal = round5((D * (100 - c.plant)) / 100);
  if (!plan.input.exclude.includes("ryby")) rows.push({ key: "ryba", label: "Ryba", pct: null, perDay: "1× týdně", perWeek: `${animal} g`, hint: "místo jedné denní porce masa" });
  const oil = plan.items.find((it) => it.role === "olej");
  if (oil) rows.push({ key: "olej", label: "Olej", pct: null, perDay: oil.portionText.replace(/ denně.*$/, ""), perWeek: "", hint: productName(oil.product) });
  return rows;
}
