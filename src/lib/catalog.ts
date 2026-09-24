/**
 * Datový model katalogu. Stejná struktura jako tabulky v Supabase
 * (viz supabase/migrations), aby šlo přepnout z ukázkových dat bez změny UI.
 */

export const LINES = ["zaklad", "kosti", "navic", "mlsky"] as const;
export type LineSlug = (typeof LINES)[number];

export type Line = {
  slug: LineSlug;
  name: string;
  /** Jedna věta na kartu řady a do hlavičky výpisu. */
  tagline: string;
  description: string;
};

export const LINE_INFO: Record<LineSlug, Line> = {
  zaklad: {
    slug: "zaklad",
    name: "Základ",
    tagline: "Kompletní mixy masa, kostí a vnitřností. Denní krmení.",
    description:
      "Řada Základ jsou hotové mixy, ve kterých je maso, masité kosti a vnitřnosti v poměru vhodném pro každodenní krmení. Rozmrazíte, odvážíte, podáte.",
  },
  kosti: {
    slug: "kosti",
    name: "Kosti",
    tagline: "Masité kosti na hryzání a jako část denní dávky.",
    description:
      "Syrové masité kosti čistí zuby a zaměstnají psa na dlouho. Vždy syrové, nikdy vařené. Velikost volte podle psa, poradíme.",
  },
  navic: {
    slug: "navic",
    name: "Navíc",
    tagline: "Oleje, byliny a doplňky, které mix doplní.",
    description:
      "Co v mixu chybí nebo co chcete přidat: rybí olej, sušené byliny, vaječné skořápky, zelenina. Dávkuje se po lžičkách.",
  },
  mlsky: {
    slug: "mlsky",
    name: "Mlsky",
    tagline: "Sušené pamlsky z jedné suroviny. Odměna bez chemie.",
    description:
      "Sušené maso, vnitřnosti a kůže z jedné suroviny. Bez soli, cukru a barviv. Do kapsy na procházku i na trénink.",
  },
};

export type Animal = "pes" | "kocka";
export type Storage = "mrazene" | "chlazene" | "suche";

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
  /** Druh masa nebo suroviny, druhá část názvu: "Základ · hovězí mix". */
  variant: string;
  animals: Animal[];
  storage: Storage;
  /** Hmotnost balení v gramech. */
  weightGrams: number;
  /** Cena v Kč za balení. */
  priceCzk: number;
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
  isNew?: boolean;
  /** Obrázek 1:1, viz BRAND.md. Zatím null, zobrazí se zástupná plocha. */
  image: string | null;
};

export function productName(p: Pick<Product, "line" | "variant">) {
  return `${LINE_INFO[p.line].name} · ${p.variant}`;
}

/**
 * UKÁZKOVÁ DATA. Ceny, gramáže a složení jsou placeholdery pro vývoj e-shopu,
 * nejsou od výrobce. Před spuštěním se nahradí daty ze Supabase.
 */
const P = "[VÝROBCE]";
const SLOZENI = "[SLOŽENÍ OD VÝROBCE] ";

export const PRODUCTS: Product[] = [
  {
    slug: "zaklad-hovezi-mix",
    line: "zaklad",
    variant: "hovězí mix",
    animals: ["pes"],
    storage: "mrazene",
    weightGrams: 1000,
    priceCzk: 89,
    producer: P,
    intro: "Kompletní hovězí mix pro psy všech velikostí. Dobrý začátek pro toho, kdo s BARFem začíná.",
    composition: SLOZENI + "hovězí svalovina, hovězí dršťky, hovězí srdce, masité kosti.",
    storageNote: "Skladujte v mrazáku při −18 °C. Rozmrazujte v lednici, rozmražené spotřebujte do 48 hodin.",
    dosage: "Dospělý pes zhruba 2–3 % hmotnosti těla denně. Dvacetikilový pes tedy 400–600 g.",
    inStock: true,
    image: null,
  },
  {
    slug: "zaklad-drubezi-mix",
    line: "zaklad",
    variant: "drůbeží mix",
    animals: ["pes", "kocka"],
    storage: "mrazene",
    weightGrams: 1000,
    priceCzk: 69,
    producer: P,
    intro: "Lehčí kuřecí mix pro psy i kočky. Vhodný pro citlivější zažívání a pro seniory.",
    composition: SLOZENI + "kuřecí maso s kostí, kuřecí krky, kuřecí játra.",
    storageNote: "Skladujte v mrazáku při −18 °C. Rozmrazujte v lednici, rozmražené spotřebujte do 48 hodin.",
    dosage: "Pes 2–3 % hmotnosti denně, kočka zhruba 40–60 g na kilo hmotnosti týdně.",
    inStock: true,
    image: null,
  },
  {
    slug: "zaklad-kruti-mix",
    line: "zaklad",
    variant: "krůtí mix",
    animals: ["pes", "kocka"],
    storage: "mrazene",
    weightGrams: 500,
    priceCzk: 45,
    producer: P,
    intro: "Krůtí mix v půlkilovém balení. Praktické pro kočky a malé psy.",
    composition: SLOZENI + "krůtí maso, krůtí krky, krůtí žaludky.",
    storageNote: "Skladujte v mrazáku při −18 °C. Rozmrazujte v lednici, rozmražené spotřebujte do 48 hodin.",
    dosage: "Kočka zhruba 40–60 g na kilo hmotnosti týdně, malý pes 2–3 % hmotnosti denně.",
    inStock: true,
    isNew: true,
    image: null,
  },
  {
    slug: "zaklad-jehneci-mix",
    line: "zaklad",
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
    slug: "zaklad-rybi-mix",
    line: "zaklad",
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

export function getProduct(slug: string) {
  return PRODUCTS.find((p) => p.slug === slug) ?? null;
}

export function getProductsByLine(line: LineSlug) {
  return PRODUCTS.filter((p) => p.line === line);
}

export function isLineSlug(value: string): value is LineSlug {
  return (LINES as readonly string[]).includes(value);
}
