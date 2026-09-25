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
};

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
    kcalPer100g: energyMode ? kcalPer100g : null,
    energyMode,
    notes,
  };
}

/* ----------------------------------------------------------------------------------------
 * Doporučení produktů z aktuální nabídky
 * -------------------------------------------------------------------------------------- */

export type Reco = {
  product: Product;
  /** Kusů na zvolené období. */
  qty: number;
  /** Gramy denně v průměru. */
  gramsPerDay: number;
  role: "zaklad" | "ryba" | "kosti" | "rekreacni" | "vnitrnosti" | "olej" | "zelenina" | "granule";
  why: string;
};

export type Plan = {
  input: AnimalInput;
  result: CalcResult;
  days: number;
  items: Reco[];
  /** Cena za období a za den. */
  totalCzk: number;
  perDayCzk: number;
  /** Bilance kosti: kolik % dávky pokryje mix, kolik doplní Kosti. */
  bone: { target: number; fromMix: number | null; fromBones: number };
  notes: Note[];
};

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const has = (p: Product, ...words: string[]) => words.some((w) => fold(p.variant + " " + p.intro).includes(fold(w)));
const packs = (gramsTotal: number, packGrams: number) => Math.max(1, Math.ceil(gramsTotal / packGrams));

/** Výchozí podíl jedlé kosti v masité kosti, když chybí z etikety (kuřecí krk ≈ 36 %). */
const DEFAULT_RMB_BONE_PCT = 36;

/** Vybere mixy Základ: začátečník jeden drůbeží, jinak až tři různé druhy masa. Rybí mix zvlášť. */
function pickMixes(pool: Product[], i: AnimalInput) {
  const mixes = pool.filter((p) => p.line === "zaklad" && p.storage !== "suche" && !has(p, "ryb"));
  const fish = pool.find((p) => p.line === "zaklad" && has(p, "ryb"));
  const poultry = mixes.filter((p) => has(p, "drůbeží", "kuřecí", "krůtí", "kachní"));
  if (i.beginner || i.stage === "mlade") {
    const first = poultry[0] ?? mixes[0];
    return { mixes: first ? [first] : [], fish: null };
  }
  // Pestrost: nejdřív drůbeží, pak ostatní, max. 3 různé varianty. U koček přednost mixům s taurinem.
  const ordered = [...poultry, ...mixes.filter((p) => !poultry.includes(p))];
  if (i.species === "kocka") ordered.sort((a, b) => Number(!!b.nutrition?.taurineMgPerKg) - Number(!!a.nutrition?.taurineMgPerKg));
  const chosen: Product[] = [];
  for (const p of ordered) {
    if (chosen.some((c) => fold(c.variant) === fold(p.variant))) continue;
    chosen.push(p);
    if (chosen.length === 3) break;
  }
  return { mixes: chosen, fish: fish ?? null };
}

/** Kosti podle velikosti zvířete: malí psi a kočky krky, střední křídla a krky, velcí krůtí krky a žebra. */
function pickBone(pool: Product[], i: AnimalInput, adultKg: number) {
  const edible = pool.filter((p) => p.line === "kosti" && p.nutrition?.boneClass !== "rekreacni" && !has(p, "žebr", "morkov", "kolen", "kloub"));
  if (!edible.length) return null;
  // Kočky, malí psi a štěňata do 6 měsíců dostanou měkké kosti (krky).
  const small = i.species === "kocka" || adultKg < 10 || (i.stage === "mlade" && (i.ageMonths ?? 0) < 6);
  const large = adultKg > 25;
  return (
    (small ? edible.find((p) => has(p, "kuřecí krk", "krk", "křidélk")) : large ? edible.find((p) => has(p, "krůtí", "skelet", "kachní")) : edible.find((p) => has(p, "křídl", "krk"))) ??
    edible[0]
  );
}

/** Vážená energie zvolených mixů, null když u některého chybí. */
export function mixesKcal(mixes: Product[]) {
  if (!mixes.length || mixes.some((m) => !m.nutrition?.kcalPer100g)) return null;
  return mixes.reduce((s, m) => s + (m.nutrition!.kcalPer100g as number), 0) / mixes.length;
}

/**
 * Sestaví nákupní plán na `days` dní: mixy Základ, případně rybí den, doplnění kosti
 * podle bilance, olej, zelenina, u štěňat granule. Množství zaokrouhluje na celá balení.
 */
export function buildPlan(products: Product[], i: AnimalInput, days: number): Plan {
  const pool = products.filter((p) => p.inStock && p.animals.includes(i.species));
  const { mixes, fish } = pickMixes(pool, i);
  const kibble = i.rawShare < 100 ? pool.find((p) => p.line === "granule" && (i.stage !== "mlade" || has(p, "štěň", "puppy", "junior"))) ?? pool.find((p) => p.line === "granule") ?? null : null;
  const result = calculate(i, mixesKcal(mixes), kibble?.nutrition?.kcalPer100g ?? null);
  const D = result.dailyGrams;
  const comp = result.composition;
  const notes: Note[] = [];
  const items: Reco[] = [];
  const adultKg = i.species === "pes" && i.stage === "mlade" ? (i.adultWeightKg ?? estimateAdultWeight(i.weightKg, i.ageMonths ?? 4)) : result.idealKg;

  // Rostlinná část jde mimo mixy.
  const animalShare = (100 - comp.plant) / 100;
  const fishShare = fish && !i.beginner && i.stage !== "mlade" ? 1 / 7 : 0;

  // Bilance kosti: kost v mixu z etikety, jinak neznámá.
  const mixBonePcts = mixes.map((m) => m.nutrition?.bonePct);
  const fromMix = mixes.length && mixBonePcts.every((b) => b != null) ? (mixBonePcts as number[]).reduce((a, b) => a + b, 0) / mixes.length : null;
  const bone = pickBone(pool, i, adultKg);
  const rmbBonePct = bone?.nutrition?.bonePct ?? DEFAULT_RMB_BONE_PCT;

  // Kolik dávky připadá na masité kosti (jako náhrada části mixu).
  let rmbShare = 0;
  if (bone) {
    if (fromMix == null) {
      // Bez údaje z etikety: Kosti jako náhrada mixu dva dny v týdnu (≈ 15 % dávky v ty dny).
      rmbShare = (0.15 * 2) / 7;
      notes.push({ kind: "info", text: "Podíl kosti v mixu neznáme z etikety, proto Kosti doporučujeme jako náhradu části mixu dvakrát týdně. Sledujte stolici: tvrdá a světlá znamená kostí moc." });
    } else {
      const mixShare = animalShare - fishShare;
      const boneFromMix = mixShare * fromMix;
      const deficit = comp.bone - boneFromMix;
      if (deficit > 0.5) {
        rmbShare = Math.min(0.25, deficit / (rmbBonePct - fromMix));
      } else {
        rmbShare = (0.1 * 1) / 7;
        notes.push({ kind: "info", text: "Kost v mixu podle etikety stačí. Kosti proto stačí jako náhrada části mixu jednou týdně, hlavně pro zabavení." });
      }
      if (boneFromMix + rmbShare * rmbBonePct > 12) notes.push({ kind: "warn", text: "Celkový podíl kosti vychází vysoko. Pokud je stolice tvrdá a světlá, kosti uberte." });
    }
  }
  const mixShare = Math.max(0, animalShare - fishShare - rmbShare);

  // Mixy Základ, rovnoměrně mezi zvolené druhy masa.
  mixes.forEach((m) => {
    const gpd = (D * mixShare) / mixes.length;
    items.push({
      product: m,
      qty: packs(gpd * days, m.weightGrams),
      gramsPerDay: gpd,
      role: "zaklad",
      why: mixes.length > 1 ? "střídejte s ostatními mixy" : i.beginner || i.stage === "mlade" ? "jeden druh masa na začátek" : "základ misky",
    });
  });
  if (fish && fishShare > 0) {
    const gpd = D * fishShare;
    items.push({ product: fish, qty: packs(gpd * days, fish.weightGrams), gramsPerDay: gpd, role: "ryba", why: "jednou týdně místo masa, omega-3" });
  }
  if (bone && rmbShare > 0) {
    const gpd = D * rmbShare;
    items.push({ product: bone, qty: packs(gpd * days, bone.weightGrams), gramsPerDay: gpd, role: "kosti", why: fromMix == null ? "místo části mixu 2× týdně" : "doplnění kosti do dávky" });
  }
  // Rekreační kost pro psy nad 10 kg, mimo dávku.
  if (i.species === "pes" && adultKg >= 10 && i.stage !== "mlade") {
    const rec = pool.find((p) => p.line === "kosti" && (p.nutrition?.boneClass === "rekreacni" || has(p, "žebr", "morkov")));
    if (rec) items.push({ product: rec, qty: 1, gramsPerDay: 0, role: "rekreacni", why: "jen na okusování pod dohledem, nepočítá se do dávky" });
  }
  // Vnitřnosti a srdce z Navíc, když jsou v nabídce; kočka bez deklarovaného taurinu dostane srdce.
  const organ = pool.find((p) => p.line === "navic" && has(p, "játra", "vnitřnost", "srdce", "ledvin"));
  if (organ) {
    const gpd = D * ((comp.liver + comp.organs) / 100) * 0.5;
    items.push({ product: organ, qty: packs(gpd * days, organ.weightGrams), gramsPerDay: gpd, role: "vnitrnosti", why: "vnitřnosti, játra max. 5 % dávky" });
  } else if (i.species === "kocka" && !mixes.some((m) => m.nutrition?.taurineMgPerKg)) {
    notes.push({ kind: "info", text: "Kočka potřebuje taurin. Mixy zatím nemají taurin deklarovaný, přidejte jednou týdně syrové kuřecí nebo hovězí srdce." });
  }
  // Olej: 1 ml na 100 g dávky (Swanie Simon), balení podle výdrže.
  const oil = pool.find((p) => p.line === "navic" && has(p, "olej"));
  if (oil) {
    const mlPerDay = D / 100;
    items.push({ product: oil, qty: packs(mlPerDay * days, oil.weightGrams), gramsPerDay: mlPerDay, role: "olej", why: `${Math.round(mlPerDay)} ml denně do misky, spolu s vitaminem E` });
  }
  // Zelenina jen v režimu se zeleninou (psi).
  if (comp.plant > 0) {
    const veg = pool.find((p) => p.line === "navic" && has(p, "zelenin"));
    if (veg) {
      const gpd = D * (comp.plant / 100);
      items.push({ product: veg, qty: packs(gpd * days, veg.weightGrams), gramsPerDay: gpd, role: "zelenina", why: "rostlinná část, 20 % dávky" });
    } else notes.push({ kind: "info", text: "Zeleninový mix zrovna nemáme, rozmixujte mrkev, cuketu nebo dýni." });
  }
  // Granule: podle energie z etikety, jinak jen energie a odkaz na tabulku výrobce.
  if (kibble && result.kibbleKcal > 0) {
    const gpd = result.kibbleGrams ?? 0;
    items.push({
      product: kibble,
      qty: gpd > 0 ? packs(gpd * days, kibble.weightGrams) : 1,
      gramsPerDay: gpd,
      role: "granule",
      why: gpd > 0 ? `${gpd} g denně, ${100 - i.rawShare} % energie` : `${100 - i.rawShare} % energie (${result.kibbleKcal} kcal), gramy podle tabulky na obalu`,
    });
  } else if (i.rawShare < 100) notes.push({ kind: "info", text: "Granule pro tuto kombinaci nemáme skladem, podíl granulí dopočítejte podle tabulky výrobce." });

  if (!mixes.length) notes.push({ kind: "warn", text: "Pro tuto kombinaci zrovna nemáme skladem vhodný mix. Stavte se v prodejně, poskládáme set spolu." });

  const totalCzk = items.reduce((s, r) => s + r.qty * r.product.priceCzk, 0);
  return {
    input: i,
    result,
    days,
    items,
    totalCzk,
    perDayCzk: Math.round(totalCzk / days),
    bone: { target: comp.bone, fromMix: fromMix == null ? null : Math.round(mixShare * fromMix * 10) / 10, fromBones: Math.round(rmbShare * rmbBonePct * 10) / 10 },
    notes: [...result.notes, ...notes],
  };
}

/** Sloučí položky více plánů do jednoho nákupu (součet kusů podle slugu). */
export function mergeItems(plans: Plan[]) {
  const map = new Map<string, { product: Product; qty: number }>();
  plans.forEach((pl) =>
    pl.items.forEach((r) => {
      const cur = map.get(r.product.slug);
      map.set(r.product.slug, { product: r.product, qty: (cur?.qty ?? 0) + r.qty });
    }),
  );
  return [...map.values()];
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
