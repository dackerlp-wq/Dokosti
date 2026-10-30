/**
 * Strukturované údaje vytažené z textů výrobce (složení, skladování) pro přehledné zobrazení v detailu produktu.
 * Nic se nedopočítává ani nevymýšlí: co se z textu nepodaří spolehlivě přečíst, zůstane jen v celém textu.
 */

export type Ingredient = { name: string; pct?: number };
export type Nutrient = { key: string; label: string; pct: number };
export type Micro = { name: string; amount: string };
export type CompositionFacts = {
  /** Suroviny v pořadí od výrobce. U balení s více variantami (multipack) prázdné. */
  ingredients: Ingredient[];
  /** Analytické složky v % (bílkoviny, tuk, vláknina, popel, vlhkost, škrob). */
  nutrients: Nutrient[];
  /** Minerální látky a mastné kyseliny v %, které se do hlavních živin nehodí. */
  minor: Nutrient[];
  /** Vitamíny, minerály a účinné látky s jednotkou (mg, g, IU) a k čemu se vztahují („v 1 kg“). */
  micros: Micro[];
  microsPer?: string;
};

const NUM = String.raw`(\d+(?:[.,]\d+)?)`;
const toNum = (s: string) => Number(s.replace(",", "."));
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Rozdělí text podle čárek mimo závorky; desetinná čárka (bez mezery) se nedělí. */
function splitTop(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if ((ch === "," || ch === ";") && depth === 0 && /\s/.test(text[i + 1] ?? " ")) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

function parseIngredient(raw: string): Ingredient | null {
  let s = raw.replace(/\.$/, "").trim();
  let pct: number | undefined;
  // „68 % hovězí“
  const lead = s.match(new RegExp(`^${NUM}\\s*%\\s+(.+)$`));
  if (lead) {
    pct = toNum(lead[1]);
    s = lead[2];
  } else {
    // „Kuře včetně kostí 60 %“
    const trail = s.match(new RegExp(`^(.+?)\\s+${NUM}\\s*%$`));
    if (trail && !trail[1].endsWith("(")) {
      pct = toNum(trail[2]);
      s = trail[1];
    }
  }
  // „Čerstvé jehněčí (26 %)“, „(zdroj glukosaminu, 0,022 %)“, „(90 %; krůta 66 %, …)“
  s = s.replace(/\(([^()]*)\)/g, (whole, inner: string) => {
    const m = inner.match(new RegExp(`^(?:(.*?),\\s+)?${NUM}\\s*%(?:\\s*;.*)?$`));
    if (m) {
      if (pct === undefined) pct = toNum(m[2]);
      return m[1] ? `(${m[1].trim()})` : "";
    }
    return whole;
  });
  s = s.replace(/\s+/g, " ").replace(/\s+\)/g, ")").trim();
  if (!s || /^\d/.test(s) || s.length > 70) return null;
  return { name: cap(s), pct };
}

const NUTRIENTS: { key: string; label: string; re: RegExp; main: boolean }[] = [
  { key: "protein", label: "Bílkoviny", re: /(?:hrub[ýéá]\s+(?:protein|bílkoviny)|(?<!z celkového obsahu )(?<![A-Za-zÀ-ž])bílkoviny|(?<![A-Za-zÀ-ž])protein)\s+/i, main: true },
  { key: "fat", label: "Tuk", re: /(?:hrub[ýý]\s+tuk|obsah\s+tuku|tuky?\s+celkem|(?<![A-Za-zÀ-ž])tuky?)\s+/i, main: true },
  { key: "fiber", label: "Vláknina", re: /(?:hrub[áa]\s+vláknina|(?<![A-Za-zÀ-ž])vláknina)\s+/i, main: true },
  { key: "ash", label: "Minerální látky (popel)", re: /(?:hrub[ýy]\s+popel|(?<![A-Za-zÀ-ž])popel)\s+/i, main: true },
  { key: "moisture", label: "Vlhkost", re: /(?<![A-Za-zÀ-ž])vlhkost\s+/i, main: true },
  { key: "starch", label: "Škrob", re: /(?<![A-Za-zÀ-ž])škrob\s+/i, main: true },
  { key: "ca", label: "Vápník", re: /(?<![A-Za-zÀ-ž])vápník\s+/i, main: false },
  { key: "p", label: "Fosfor", re: /(?<![A-Za-zÀ-ž])fosfor\s+/i, main: false },
  { key: "omega3", label: "Omega-3", re: /omega-3\s+mastné\s+kyseliny\s+/i, main: false },
  { key: "omega6", label: "Omega-6", re: /omega-6\s+mastné\s+kyseliny\s+/i, main: false },
  { key: "linoleic", label: "Kyselina linolová", re: /(?<![A-Za-zÀ-ž])linolová\s+/i, main: false },
  { key: "alpha", label: "Kyselina alfa-linolenová", re: /(?<![A-Za-zÀ-ž])(?:alfa-linolenová|linolenová)\s+/i, main: false },
  { key: "gla", label: "Kyselina gama-linolenová", re: /(?<![A-Za-zÀ-ž])gama-linolenová\s+/i, main: false },
  { key: "epa", label: "EPA", re: /(?<![A-Za-zÀ-ž])EPA\s+/, main: false },
  { key: "dha", label: "DHA", re: /(?<![A-Za-zÀ-ž])DHA\s+/, main: false },
];

const MICRO_NAMES: Record<string, string> = { Ca: "Vápník", P: "Fosfor", K: "Draslík", Mg: "Hořčík", Fe: "Železo", Mn: "Mangan", Zn: "Zinek", Cu: "Měď", Na: "Sodík", Se: "Selen", I: "Jód", B7: "Biotin (B7)" };

function parseMicros(text: string): { micros: Micro[]; per?: string } {
  const micros: Micro[] = [];
  const seen = new Set<string>();
  const per = text.match(/(?:v|na)\s+1\s+(?:kg|g)\b/i)?.[0]?.replace(/\s+/g, " ");
  // „B1 125 mg“, „Fe 91 mg“, „zinek (3b606) 15 mg“, „hydrolyzovaný vepřový kolagen 300 mg“, „Vitamin D3 (E671) 250 IU“
  const re = new RegExp(String.raw`(?:^|[,:;.]\s*)((?:[A-Za-zÀ-ž][A-Za-zÀ-ž0-9-]*\s?){1,4}?)(?:\s*\([^)]*\))?\s+${NUM}\s*(mg|g|µg|μg|IU|m²)\b`, "g");
  for (const m of text.matchAll(re)) {
    const raw = m[1].trim().replace(/^(?:a|obsah|vitamíny|minerály|vitaminy)\s+/i, "");
    if (!raw || /^(?:v|na|ve|z|do)$/i.test(raw) || /kg$/i.test(raw) || /\s(?:v|na)$/i.test(raw)) continue;
    const name = MICRO_NAMES[raw] ?? cap(raw.replace(/^vitamin\b/i, "Vitamín"));
    if (seen.has(name)) continue;
    seen.add(name);
    micros.push({ name, amount: `${m[2]} ${m[3]}` });
  }
  return { micros: micros.slice(0, 16), per };
}

/** Přečte složení od výrobce. */
export function parseComposition(text: string | null | undefined): CompositionFacts {
  const empty: CompositionFacts = { ingredients: [], nutrients: [], minor: [], micros: [] };
  if (!text?.trim()) return empty;
  const t = text.replace(/ /g, " ");
  const analyticIdx = t.search(/analytick[éá]\s+složky/i);
  const cutRe = /(?:\.\s+|^)(?:analytick|nutriční aditiva|minerál|vitamín|vitamin|obsah|mastné kyseliny|energie)/i;
  const cut = t.search(cutRe);
  let ingredientPart = (cut >= 0 ? t.slice(0, cut) : t).replace(/^\s*složení\s*:\s*/i, "").trim();
  // Multipack s více recepturami, nebo jen analytické složky bez surovin: suroviny nečteme.
  const multipack = /:\s/.test(ingredientPart) || (t.match(/analytick/gi)?.length ?? 0) > 1 && /:\s.*:\s/.test(t.slice(analyticIdx));
  if (/^analytick/i.test(ingredientPart) || /^(?:hrub|obsah)/i.test(ingredientPart)) ingredientPart = "";
  const ingredients = multipack ? [] : splitTop(ingredientPart).map(parseIngredient).filter((i): i is Ingredient => i !== null);

  // Živiny hledáme v části s analytickými složkami (u multipacku jen první receptura), jinak v celém textu.
  let nutrientPart = analyticIdx >= 0 ? t.slice(analyticIdx) : t;
  if (multipack) {
    const firstEnd = nutrientPart.indexOf(".", nutrientPart.indexOf(":") + 1);
    nutrientPart = firstEnd > 0 ? nutrientPart.slice(0, firstEnd) : nutrientPart;
  }
  const nutrients: Nutrient[] = [];
  const minor: Nutrient[] = [];
  for (const n of NUTRIENTS) {
    const m = nutrientPart.match(new RegExp(n.re.source + NUM + String.raw`\s*%`, n.re.flags));
    if (!m) continue;
    const pct = toNum(m[1]);
    if (!(pct > 0 && pct <= 100)) continue;
    (n.main ? nutrients : minor).push({ key: n.key, label: n.label, pct });
  }

  const microSource = t.slice(cut >= 0 ? cut : t.length);
  const { micros, per } = parseMicros(microSource);
  return { ingredients, nutrients, minor, micros, microsPer: per };
}

export type StorageKind = "freezer" | "thaw" | "open" | "shelf" | "place" | "tip";
export type StorageTile = { kind: StorageKind; title: string; value?: string; text: string };

const STORAGE_TITLES: Record<StorageKind, string> = {
  freezer: "V mrazáku",
  thaw: "Rozmrazení",
  open: "Po otevření",
  shelf: "Trvanlivost",
  place: "Kde skladovat",
  tip: "Dobré vědět",
};

function classify(sentence: string): StorageKind {
  const s = sentence.toLowerCase();
  if (/rozmraz|rozmražen/.test(s)) return "thaw";
  if (/−18|-18|zmrazen|v mrazáku/.test(s)) return "freezer";
  if (/(?<!ne)otevř/.test(s) && /lednic|spotřebujte|uchovejte|hned/.test(s)) return "open";
  if (/spotřebujte|trvanlivost|nejlépe do|měsíc|rok/.test(s)) return "shelf";
  if (/°c|chlad|such|temn|slunc|pokojov|uzavřen|stínu/.test(s)) return "place";
  return "tip";
}

/** Výrazné číslo z věty: teplota, nebo doba („1 rok“, „10 měsíců“, „2 dnů“ → „2 dny“). */
function keyValue(kind: StorageKind, sentence: string): string | undefined {
  const temp = sentence.match(/(?:do\s+)?[−-]?\d+\s*°C/);
  const time = sentence.match(/(\d+(?:–\d+)?)\s+(rok\w*|let|měsíc\w*|dn\w*|týdn\w*)/i);
  const unit = (n: string, w: string) => {
    const big = Number(n.split("–").pop());
    if (/^rok|^let/i.test(w)) return big === 1 ? "rok" : big < 5 ? "roky" : "let";
    if (/^měsíc/i.test(w)) return big === 1 ? "měsíc" : big < 5 ? "měsíce" : "měsíců";
    if (/^týdn/i.test(w)) return big === 1 ? "týden" : big < 5 ? "týdny" : "týdnů";
    return big === 1 ? "den" : big < 5 ? "dny" : "dní";
  };
  if (kind === "freezer" && temp) return temp[0].replace("-", "−");
  if (time && (kind === "shelf" || kind === "thaw" || kind === "open" || kind === "freezer")) return `${time[1]} ${unit(time[1], time[2])}`;
  if (temp) return temp[0].replace("-", "−");
  return undefined;
}

/** Rozdělí pokyny ke skladování na dlaždice s ikonou, titulkem a výrazným číslem. Pořadí jako v textu, stejné druhy spojí. */
export function parseStorage(text: string | null | undefined): StorageTile[] {
  if (!text?.trim()) return [];
  const sentences = text
    .replace(/ /g, " ")
    .split(/(?<=[.!?])\s+(?=[A-ZÁ-Ž])/)
    .map((s) => s.trim())
    .filter(Boolean);
  const tiles: StorageTile[] = [];
  for (const sentence of sentences) {
    // „…, trvanlivost v mrazáku 1 rok“ ve větě o mrazáku: číslo patří k mrazáku.
    const kind = classify(sentence);
    const existing = tiles.find((t) => t.kind === kind);
    if (existing) {
      existing.text = `${existing.text} ${sentence}`;
      existing.value ??= keyValue(kind, sentence);
      continue;
    }
    tiles.push({ kind, title: STORAGE_TITLES[kind], value: keyValue(kind, sentence), text: sentence });
  }
  return tiles;
}

export type MeatSplit = { meat: number; meatLabel: string; organs: number };

const ORGANS = /droby|drobů|játr|ledvin|slezin|vnitřnost/i;
const BONES = /kost|krky|křídl|stehn|skelet/i;
const isOrgan = (name: string) => ORGANS.test(name) && !/bez drob/i.test(name);

/**
 * Podíl masa (s kostmi) a vnitřností sečtený z procent, která výrobce uvádí u surovin.
 * Jen když má procenta každá surovina a dávají dohromady zhruba 100 %; maso a kosti výrobce nerozlišuje, tak je nedělíme.
 */
export function meatSplit(ingredients: Ingredient[]): MeatSplit | null {
  if (ingredients.length === 0 || ingredients.some((i) => i.pct === undefined)) return null;
  const total = ingredients.reduce((n, i) => n + i.pct!, 0);
  if (Math.abs(total - 100) > 2) return null;
  const organs = ingredients.filter((i) => isOrgan(i.name)).reduce((n, i) => n + i.pct!, 0);
  const rest = ingredients.filter((i) => !isOrgan(i.name));
  const meat = rest.reduce((n, i) => n + i.pct!, 0);
  const meatLabel = rest.some((i) => BONES.test(i.name)) ? "masa s kostmi" : "masa";
  return { meat: Math.round(meat * 10) / 10, meatLabel, organs: Math.round(organs * 10) / 10 };
}
