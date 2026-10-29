/**
 * Datový model katalogu. Stejná struktura jako tabulky v Supabase
 * (viz supabase/migrations), aby šlo přepnout z ukázkových dat bez změny UI.
 */

/** Řady = hlavní kategorie v menu, v tomhle pořadí. */
export const LINES = ["barf", "maso", "kosti", "mlsky", "navic", "granule"] as const;
export type LineSlug = (typeof LINES)[number];

export type Line = {
  slug: LineSlug;
  name: string;
  /** Jedna věta na kartu řady a do hlavičky výpisu. */
  tagline: string;
  description: string;
};

export const LINE_INFO: Record<LineSlug, Line> = {
  barf: {
    slug: "barf",
    name: "BARF mixy",
    tagline: "Hotové mixy masa, kostí a vnitřností. Denní krmení.",
    description:
      "Hotové BARF mixy, ve kterých je maso, masité kosti a vnitřnosti v poměru vhodném pro každodenní krmení. Rozmrazíte, odvážíte, podáte. Vyberte podle druhu masa.",
  },
  maso: {
    slug: "maso",
    name: "Maso a vnitřnosti",
    tagline: "Čistá svalovina, vnitřnosti a ryby pro vlastní skládání jídelníčku.",
    description:
      "Jednotlivé suroviny bez kostí: svalovina a srdce jako základ, játra a ledvinky jako menší část dávky a ryby zhruba jednou týdně. Hodí se k BARF mixům i pro ty, kdo si jídelníček skládají sami.",
  },
  kosti: {
    slug: "kosti",
    name: "Masité kosti",
    tagline: "Syrové krky, křídla a stehna jako část denní dávky.",
    description:
      "Syrové masité kosti, které pes nebo kočka sní celé. Jsou přirozeným zdrojem vápníku. Vždy syrové, nikdy vařené. Velikost volte podle zvířete, kost nesmí jít spolknout vcelku. Na dlouhé hryzání jsou rohy a paroží v Pamlscích a žvýkání.",
  },
  mlsky: {
    slug: "mlsky",
    name: "Pamlsky a žvýkání",
    tagline: "Sušené pamlsky na odměnu a rohy, paroží a kůže na hryzání.",
    description:
      "Sušené maso a vnitřnosti z jedné suroviny do kapsy na procházku i na trénink. K tomu žvýkání na dlouho: buvolí rohy, jelení paroží, uši, kůže a kávové dřevo.",
  },
  navic: {
    slug: "navic",
    name: "Doplňky",
    tagline: "Oleje, minerály, vitamíny a přílohy, které BARF doplní.",
    description:
      "Co v mase chybí nebo co chcete přidat: oleje s omega-3, vápník místo kostí, řasy a vitamíny, přílohy k masu a doplňky s kolagenem. Vybírejte podle účelu, dávkuje se po lžičkách.",
  },
  granule: {
    slug: "granule",
    name: "Granule a konzervy",
    tagline: "Granule a konzervy s vysokým podílem masa. Na přechod k BARFu i na cesty.",
    description:
      "Pro dny, kdy syrové krmení nejde, a na postupný přechod k BARFu. Vybíráme jen krmiva, kde je maso na prvním místě: Carnilove True Fresh má 60 % čerstvého masa, pro kočky 70 %, konzervy a kapsičky 62–90 %. Podíl masa vidíte u každého produktu podle složení od výrobce.",
  },
};

export type Animal = "pes" | "kocka";
export type Storage = "mrazene" | "chlazene" | "suche";

/** Druhy masa: podkategorie a filtr v řadě, vyloučení v kalkulačce. */
export const MEATS = ["kureci", "kruti", "kachni", "hovezi", "veprove", "jehneci", "kralici", "kone", "zverina", "ryby"] as const;
export type MeatKey = (typeof MEATS)[number];
export const MEAT_LABEL: Record<MeatKey, string> = {
  kureci: "kuřecí",
  kruti: "krůtí",
  kachni: "kachní",
  hovezi: "hovězí",
  veprove: "vepřové",
  jehneci: "jehněčí",
  kralici: "králičí",
  kone: "koňské",
  zverina: "zvěřina",
  ryby: "ryby",
};
/** Název druhu masa do nadpisu podkategorie: „Kuřecí BARF mixy“, „Ryby a BARF mixy“. */
export const MEAT_TITLE: Record<MeatKey, string> = {
  kureci: "Kuřecí",
  kruti: "Krůtí",
  kachni: "Kachní",
  hovezi: "Hovězí",
  veprove: "Vepřové",
  jehneci: "Jehněčí",
  kralici: "Králičí",
  kone: "Koňské",
  zverina: "Zvěřinové",
  ryby: "Rybí",
};
export function isMeatKey(v: string): v is MeatKey {
  return (MEATS as readonly string[]).includes(v);
}
/** Podkategorie řady Doplňky podle účelu. */
export const NAVIC_KINDS = ["oleje", "mineraly", "vitaminy", "prilohy", "klouby", "ostatni"] as const;
export type NavicKind = (typeof NAVIC_KINDS)[number];
/** Podkategorie řady Maso a vnitřnosti. */
export const MASO_KINDS = ["svalovina", "vnitrnosti", "ryby"] as const;
export type MasoKind = (typeof MASO_KINDS)[number];
/** Podkategorie řady Pamlsky a žvýkání. */
export const MLSKY_KINDS = ["pamlsky", "zvykani"] as const;
export type MlskyKind = (typeof MLSKY_KINDS)[number];
/** Podkategorie řady Granule a konzervy. */
export const GRANULE_KINDS = ["granule", "konzervy"] as const;
export type GranuleKind = (typeof GRANULE_KINDS)[number];
export type ProductKind = NavicKind | MasoKind | MlskyKind | GranuleKind;

/** Řady, které se dělí podle druhu (sloupec kind). Ostatní (BARF mixy, Masité kosti) se dělí podle masa. */
export const LINE_KINDS: Partial<Record<LineSlug, readonly ProductKind[]>> = { maso: MASO_KINDS, mlsky: MLSKY_KINDS, navic: NAVIC_KINDS, granule: GRANULE_KINDS };
export const lineHasKinds = (line: LineSlug) => Boolean(LINE_KINDS[line]);
export function isLineKind(line: LineSlug, v: string | null | undefined): v is ProductKind {
  return Boolean(v && LINE_KINDS[line]?.includes(v as ProductKind));
}

/** Popisek do menu a filtru, nadpis podkategorie a krátký popis. */
export const KIND_INFO: Record<ProductKind, { label: string; title: string; text: string }> = {
  oleje: { label: "oleje", title: "Oleje", text: "Rybí a rostlinné oleje k mixu. Doplní omega-3 mastné kyseliny, ryby nejsou v misce každý den." },
  mineraly: { label: "vápník a minerály", title: "Vápník a minerály", text: "Náhrada masitých kostí pro psy, kteří kosti nejedí, a vyrovnání vápníku a fosforu v masité stravě." },
  vitaminy: { label: "řasy, vitamíny a kvasnice", title: "Řasy, vitamíny a kvasnice", text: "Jód, vitamíny skupiny B a stopové prvky, kterých je v mase a vnitřnostech málo." },
  prilohy: { label: "přílohy k masu", title: "Přílohy k masu", text: "Zelenina, pohanka a rýže pro BARF s rostlinnou složkou. Vláknina a objem pro žravé psy." },
  klouby: { label: "klouby a pohyb", title: "Klouby a pohyb", text: "Doplňky s kolagenem pro velká plemena, sportovce a seniory. Při potížích nejdřív k veterináři." },
  ostatni: { label: "štěňata, lékárnička a pomůcky", title: "Štěňata, lékárnička a pomůcky", text: "Mléko pro štěňata, aktivní uhlí do lékárničky a odměrka na oleje a sypké doplňky." },
  svalovina: { label: "svalovina", title: "Svalovina", text: "Libové maso, srdce, žaludky a dršťky. Základ dávky pro ty, kdo si jídelníček skládají sami." },
  vnitrnosti: { label: "vnitřnosti", title: "Vnitřnosti", text: "Játra, ledvinky a droby. Menší část dávky, játra nejvýš zhruba 5 %." },
  ryby: { label: "ryby", title: "Ryby", text: "Losos, šproty a mořské ryby. Do misky zhruba jednou týdně jako zdroj omega-3." },
  pamlsky: { label: "pamlsky", title: "Pamlsky", text: "Sušené maso a vnitřnosti na odměnu a výcvik, pro psy i kočky." },
  zvykani: { label: "žvýkání", title: "Žvýkání", text: "Buvolí rohy, jelení paroží, uši, kůže a dřevo na dlouhé hryzání. Podávejte pod dohledem." },
  granule: { label: "granule", title: "Granule", text: "Granule s 60–70 % masa, bez obilovin a brambor. Na přechod k BARFu i na cesty." },
  konzervy: { label: "konzervy a kapsičky", title: "Konzervy a kapsičky", text: "Masové konzervy a kapsičky s 62–90 % masa. Kompletní krmivo pro psy i kočky." },
};
/** Zpětná kompatibilita: popisky a texty podkategorií Doplňků. */
export const NAVIC_KIND_LABEL = Object.fromEntries(NAVIC_KINDS.map((k) => [k, KIND_INFO[k].label])) as Record<NavicKind, string>;
export const NAVIC_KIND_INFO = KIND_INFO as Record<NavicKind, { title: string; text: string }>;
export function isNavicKind(v: string): v is NavicKind {
  return (NAVIC_KINDS as readonly string[]).includes(v);
}

/**
 * Podkategorie řady: u řad s druhy (LINE_KINDS) podle sloupce kind, u BARF mixů a kostí podle druhu masa.
 * Adresa je vždy /rada/[řada]/[klíč].
 */
export type FacetKey = MeatKey | ProductKind;
export const lineFacets = (line: LineSlug): readonly FacetKey[] => LINE_KINDS[line] ?? MEATS;
export const isLineFacet = (line: LineSlug, v: string): v is FacetKey => (lineHasKinds(line) ? isLineKind(line, v) : isMeatKey(v));
export const productFacets = (p: Pick<Product, "line" | "meats" | "kind">): FacetKey[] => (lineHasKinds(p.line) ? (p.kind ? [p.kind] : []) : (p.meats ?? []));
export const facetLabel = (line: LineSlug, key: FacetKey): string => (lineHasKinds(line) ? KIND_INFO[key as ProductKind].label : MEAT_LABEL[key as MeatKey]);
/** Popisek s velkým jen prvním písmenem, do menu a filtrů („Vápník a minerály“, ne CSS capitalize). */
export const facetName = (line: LineSlug, key: FacetKey): string => {
  const l = facetLabel(line, key);
  return l.charAt(0).toUpperCase() + l.slice(1);
};
/** Popisek výběru podkategorií v řadě. */
export const facetHeading = (line: LineSlug) => (line === "navic" ? "Vyberte podle účelu" : lineHasKinds(line) ? "Vyberte, co hledáte" : "Vyberte podle masa");

/** Prodejní jednotka: balení po kusech, nebo na váhu (cena za kg, jen v prodejně). */
export type ProductUnit = "ks" | "kg";
export const UNIT_LABEL: Record<ProductUnit, string> = { ks: "kus", kg: "na váhu (kg)" };

export const ANIMAL_LABEL: Record<Animal, string> = {
  pes: "Pro psy",
  kocka: "Pro kočky",
};

export const STORAGE_LABEL: Record<Storage, string> = {
  mrazene: "Mražené",
  chlazene: "Chlazené",
  suche: "Suché",
};

export type Product = {
  slug: string;
  line: LineSlug;
  /** Druh masa nebo suroviny, z něj je název produktu: "Hovězí mix". */
  variant: string;
  animals: Animal[];
  /** Druhy masa v produktu (podkategorie, filtr, vyloučení v kalkulačce). */
  meats?: MeatKey[];
  /** Podkategorie řady s druhy (Maso a vnitřnosti, Pamlsky a žvýkání, Doplňky, Granule a konzervy). */
  kind?: ProductKind;
  storage: Storage;
  /** Hmotnost balení v gramech (u zboží na váhu orientační porce). */
  weightGrams: number;
  /** Cena v Kč za jednotku: za balení, nebo za kg. */
  priceCzk: number;
  /** Výchozí "ks". Zboží na váhu se na webu neprodává, jen v prodejně. */
  unit?: ProductUnit;
  /** Původní cena, pokud je produkt ve slevě. */
  originalPriceCzk?: number;
  /** Značka výrobce, uvádí se v popisu a na etiketě, ne v názvu. */
  producer: string;
  /** První věta: co to je a pro koho. */
  intro: string;
  /** Složení od výrobce, v procentech. */
  composition: string;
  storageNote: string;
  dosage: string;
  inStock: boolean;
  /** Evidovaný stav skladu v ks (kg u zboží na váhu). null = neeviduje se, platí jen inStock. */
  stockQty?: number | null;
  isNew?: boolean;
  /** Obrázek 1:1, viz BRAND.md. Zatím null, zobrazí se zástupná plocha. */
  image: string | null;
  /** Upsell: lepší nebo větší varianta (slugy). */
  upsell?: string[];
  /** Cross-sell: hodí se k tomu (slugy). */
  crosssell?: string[];
  /**
   * Výhodnost pro obchod 0–100 (marže, stav skladu, ruční přednost), počítá se na serveru v lib/products.
   * Kalkulačka a průvodce jí řadí produkty se stejnou rolí. Nákupní cena se do prohlížeče neposílá.
   */
  recoScore?: number;
  /** Dávkování z textu výrobce (olej, doplňky) pro kalkulačku krmení. */
  dose?: SupplementDose;
  /** Podíl masa a vnitřností v % podle složení od výrobce. Neuvedeno = nezobrazuje se. */
  meatPct?: number;
  /**
   * Údaje z etikety výrobce pro kalkulačku dávky. Nikdy se nedopočítávají;
   * bez nich kalkulačka počítá orientačně procentem hmotnosti.
   */
  nutrition?: Nutrition;
};

export type BoneClass = "jedla" | "rekreacni";

/** Dávka doplňku: na 100 g krmiva, na 1 kg hmotnosti zvířete, nebo pevná podle pásem hmotnosti (doKg null = bez horní meze). */
export type DoseRule = { per: "food" | "body"; min: number; max: number } | { per: "tiers"; tiers: [number | null, number, number][] };
export type SupplementDose = { unit: "ml" | "g"; pes?: DoseRule; kocka?: DoseRule };

export type Nutrition = {
  /** Metabolizovatelná energie, kcal/100 g. */
  kcalPer100g?: number;
  /** Podíl jedlé kosti v produktu, %. */
  bonePct?: number;
  /** Podíl vnitřností celkem, %. */
  organPct?: number;
  /** Podíl jater, %. */
  liverPct?: number;
  /** Deklarovaný taurin, mg/kg (kočičí mixy). */
  taurineMgPerKg?: number;
  /** Jedlá kost do dávky, nebo rekreační (nosná) jen na okusování. */
  boneClass?: BoneClass;
  /** Kompletní krmivo podle nařízení 767/2009; jinak doplňkové. */
  isComplete?: boolean;
};

export const BONE_CLASS_LABEL: Record<BoneClass, string> = {
  jedla: "Jedlá kost (do dávky)",
  rekreacni: "Rekreační kost (jen okusování)",
};

/** Název produktu je druh masa nebo suroviny s velkým písmenem („Kuřecí mix“); řada se ukazuje jako štítek. */
export function productName(p: Pick<Product, "line" | "variant">) {
  const v = p.variant.trim();
  return v.charAt(0).toUpperCase() + v.slice(1);
}

/**
 * UKÁZKOVÁ DATA. Ceny, gramáže a složení jsou placeholdery pro vývoj e-shopu,
 * nejsou od výrobce. Před spuštěním se nahradí daty ze Supabase.
 */
const P = "[VÝROBCE]";
const SLOZENI = "[SLOŽENÍ OD VÝROBCE] ";

export const PRODUCTS: Product[] = [
  {
    slug: "barf-hovezi-mix",
    line: "barf",
    variant: "hovězí mix",
    animals: ["pes"],
    storage: "mrazene",
    weightGrams: 1000,
    priceCzk: 89,
    producer: P,
    intro: "Kompletní hovězí mix pro psy všech velikostí. Dobrý začátek pro toho, kdo s BARFem začíná.",
    composition: SLOZENI + "hovězí svalovina, hovězí dršťky, hovězí srdce, masité kosti.",
    storageNote: "Skladujte v mrazáku při −18 °C. Rozmrazujte v lednici, rozmražené spotřebujte do 48 hodin.",
    dosage: "Dospělý pes zhruba 2–3 % hmotnosti těla denně, malí psi víc. Dvacetikilový pes tedy 400–600 g, přesněji spočítá kalkulačka.",
    inStock: true,
    image: null,
  },
  {
    slug: "barf-drubezi-mix",
    line: "barf",
    variant: "drůbeží mix",
    animals: ["pes", "kocka"],
    storage: "mrazene",
    weightGrams: 1000,
    priceCzk: 69,
    producer: P,
    intro: "Lehčí kuřecí mix pro psy i kočky. Vhodný pro citlivější zažívání a pro seniory.",
    composition: SLOZENI + "kuřecí maso s kostí, kuřecí krky, kuřecí játra.",
    storageNote: "Skladujte v mrazáku při −18 °C. Rozmrazujte v lednici, rozmražené spotřebujte do 48 hodin.",
    dosage: "Pes zhruba 2–3 % hmotnosti denně, kočka 2–4 % hmotnosti denně. Přesněji spočítá kalkulačka.",
    inStock: true,
    image: null,
  },
  {
    slug: "barf-kruti-mix",
    line: "barf",
    variant: "krůtí mix",
    animals: ["pes", "kocka"],
    storage: "mrazene",
    weightGrams: 500,
    priceCzk: 45,
    producer: P,
    intro: "Krůtí mix v půlkilovém balení. Praktické pro kočky a malé psy.",
    composition: SLOZENI + "krůtí maso, krůtí krky, krůtí žaludky.",
    storageNote: "Skladujte v mrazáku při −18 °C. Rozmrazujte v lednici, rozmražené spotřebujte do 48 hodin.",
    dosage: "Kočka 2–4 % hmotnosti denně, malý pes 3–4 % hmotnosti denně. Přesněji spočítá kalkulačka.",
    inStock: true,
    isNew: true,
    image: null,
  },
  {
    slug: "barf-jehneci-mix",
    line: "barf",
    variant: "jehněčí mix",
    animals: ["pes"],
    storage: "mrazene",
    weightGrams: 1000,
    priceCzk: 129,
    producer: P,
    intro: "Jehněčí mix pro psy, kterým nesedí hovězí ani kuře. Bývá ho málo, když je, berte.",
    composition: SLOZENI + "jehněčí maso, jehněčí kosti, jehněčí plíce.",
    storageNote: "Skladujte v mrazáku při −18 °C. Rozmrazujte v lednici, rozmražené spotřebujte do 48 hodin.",
    dosage: "Dospělý pes zhruba 2–3 % hmotnosti těla denně.",
    inStock: false,
    image: null,
  },
  {
    slug: "barf-rybi-mix",
    line: "barf",
    variant: "rybí mix",
    animals: ["pes", "kocka"],
    storage: "mrazene",
    weightGrams: 500,
    priceCzk: 59,
    originalPriceCzk: 69,
    producer: P,
    intro: "Mix z celých mořských ryb. Jednou až dvakrát týdně místo masa, kvůli omega-3.",
    composition: SLOZENI + "sleď, makrela, treska (celé ryby).",
    storageNote: "Skladujte v mrazáku při −18 °C. Rozmrazujte v lednici, rozmražené spotřebujte do 24 hodin.",
    dosage: "Jednou až dvakrát týdně jako náhrada masité dávky.",
    inStock: true,
    image: null,
  },
  {
    slug: "kosti-kureci-krky",
    line: "kosti",
    variant: "kuřecí krky",
    animals: ["pes", "kocka"],
    storage: "mrazene",
    weightGrams: 1000,
    priceCzk: 49,
    producer: P,
    intro: "Měkké masité kosti pro malé psy, štěňata a kočky. První kost, kterou dáváme začátečníkům.",
    composition: SLOZENI + "kuřecí krky 100 %.",
    storageNote: "Skladujte v mrazáku při −18 °C. Podávejte rozmražené nebo lehce namražené.",
    dosage: "Jako část denní dávky, kosti mají dělat zhruba 10–15 % krmiva.",
    inStock: true,
    image: null,
    // Podíl kosti podle veřejné tabulky Perfectly Rawsome (kuřecí krk ≈ 36 %), ne od výrobce.
    nutrition: { bonePct: 36, boneClass: "jedla" },
  },
  {
    slug: "kosti-hovezi-zebra",
    line: "kosti",
    variant: "hovězí žebra",
    animals: ["pes"],
    storage: "mrazene",
    weightGrams: 1000,
    priceCzk: 79,
    producer: P,
    intro: "Masitá hovězí žebra pro střední a velké psy. Na dlouhé hryzání, ne na spolknutí.",
    composition: SLOZENI + "hovězí žebra s masem 100 %.",
    storageNote: "Skladujte v mrazáku při −18 °C. Nikdy nevařte, vařené kosti se štípou.",
    dosage: "Jedno až dvě žebra podle velikosti psa, vždy pod dohledem.",
    inStock: true,
    image: null,
    nutrition: { boneClass: "rekreacni" },
  },
  {
    slug: "kosti-kachni-kridla",
    line: "kosti",
    variant: "kachní křídla",
    animals: ["pes"],
    storage: "mrazene",
    weightGrams: 1000,
    priceCzk: 65,
    producer: P,
    intro: "Kachní křídla pro střední psy. Tučnější než kuřecí, dobré na zimu.",
    composition: SLOZENI + "kachní křídla 100 %.",
    storageNote: "Skladujte v mrazáku při −18 °C. Podávejte rozmražené.",
    dosage: "Jako část denní dávky, kosti mají dělat zhruba 10–15 % krmiva.",
    inStock: true,
    isNew: true,
    image: null,
    // Podíl kosti podle veřejné tabulky Perfectly Rawsome (kachní křídlo ≈ 39 %), ne od výrobce.
    nutrition: { bonePct: 39, boneClass: "jedla" },
  },
  {
    slug: "navic-lososovy-olej",
    line: "navic",
    variant: "lososový olej",
    animals: ["pes", "kocka"],
    storage: "chlazene",
    weightGrams: 250,
    priceCzk: 189,
    producer: P,
    intro: "Lososový olej na srst a klouby. Po otevření patří do lednice.",
    composition: SLOZENI + "lososový olej 100 %, lisovaný za studena.",
    storageNote: "Neotevřený v temnu, po otevření v lednici a spotřebovat do 6 týdnů.",
    dosage: "Zhruba 1 ml na 5 kg hmotnosti denně, přidat do misky.",
    inStock: true,
    image: null,
  },
  {
    slug: "navic-bylinna-smes",
    line: "navic",
    variant: "bylinná směs",
    animals: ["pes"],
    storage: "suche",
    weightGrams: 150,
    priceCzk: 149,
    producer: P,
    intro: "Sušené byliny do mixu. Kopřiva, pampeliška, petržel a další.",
    composition: SLOZENI + "kopřiva, pampeliška, petržel, heřmánek.",
    storageNote: "V suchu a temnu, uzavřené. Spotřeba do 12 měsíců.",
    dosage: "Špetka až lžička denně podle velikosti psa, zamíchat do masa.",
    inStock: true,
    image: null,
  },
  {
    slug: "navic-zeleninovy-mix",
    line: "navic",
    variant: "zeleninový mix",
    animals: ["pes"],
    storage: "mrazene",
    weightGrams: 500,
    priceCzk: 39,
    producer: P,
    intro: "Rozmixovaná zelenina k masu. Pro psy, kteří potřebují víc vlákniny.",
    composition: SLOZENI + "mrkev, cuketa, jablko, špenát.",
    storageNote: "Skladujte v mrazáku při −18 °C. Rozmražené spotřebujte do 48 hodin.",
    dosage: "Zhruba 10 % denní dávky, zamíchat do masa.",
    inStock: true,
    image: null,
  },
  {
    slug: "mlsky-susene-hovezi-plice",
    line: "mlsky",
    variant: "sušené hovězí plíce",
    animals: ["pes", "kocka"],
    storage: "suche",
    weightGrams: 100,
    priceCzk: 79,
    producer: P,
    intro: "Lehké, křupavé, dobře se lámou. Odměna na trénink pro psy i kočky.",
    composition: SLOZENI + "hovězí plíce 100 %.",
    storageNote: "V suchu, uzavřené. Spotřeba do 12 měsíců.",
    dosage: "Pár kousků denně. Pamlsky počítejte do denní dávky.",
    inStock: true,
    image: null,
  },
  {
    slug: "mlsky-susene-kureci-prsa",
    line: "mlsky",
    variant: "sušená kuřecí prsa",
    animals: ["pes", "kocka"],
    storage: "suche",
    weightGrams: 100,
    priceCzk: 99,
    producer: P,
    intro: "Sušené kuřecí maso v plátcích. Jedna surovina, nic dalšího.",
    composition: SLOZENI + "kuřecí prsa 100 %.",
    storageNote: "V suchu, uzavřené. Spotřeba do 12 měsíců.",
    dosage: "Pár kousků denně. Pamlsky počítejte do denní dávky.",
    inStock: true,
    image: null,
  },
  {
    slug: "mlsky-hovezi-kuze",
    line: "mlsky",
    variant: "hovězí kůže",
    animals: ["pes"],
    storage: "suche",
    weightGrams: 200,
    priceCzk: 119,
    originalPriceCzk: 139,
    producer: P,
    intro: "Sušená hovězí kůže na dlouhé žvýkání. Pro psy, kteří potřebují něco do zubů.",
    composition: SLOZENI + "hovězí kůže 100 %.",
    storageNote: "V suchu, uzavřené. Spotřeba do 12 měsíců.",
    dosage: "Jeden kus, pod dohledem.",
    inStock: true,
    image: null,
  },
];

export function isLineSlug(value: string): value is LineSlug {
  return (LINES as readonly string[]).includes(value);
}
