"use client";

import { ArrowLeftRight, Check, ChevronLeft, Info, Minus, Plus, RefreshCw, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { savePetProfile } from "@/app/(shop)/ucet/actions";
import { InquiryForm } from "@/components/barf/inquiry-form";
import { PlanCoverage } from "@/components/barf/plan-coverage";
import { useCart } from "@/components/cart/cart-context";
import { ProductImage } from "@/components/product/product-image";
import { Button } from "@/components/ui/button";
import { type Activity, type AnimalInput, bowlTargets, buildPlan, containsMeat, type DropKey, FULL_ADDONS, foodKind, newAnimal, type Plan, type Reco, seniorAgeYears, shelfDays, type Stage } from "@/lib/barf";
import { MEAT_LABEL, MEATS, type MeatKey, type Product, productName } from "@/lib/catalog";
import { ageMonths, emptyPet, type FeedingNow, type PetProfile } from "@/lib/club";
import { savePlan } from "@/lib/cart-plan";
import { formatPrice } from "@/lib/format";
import { ZASADY } from "@/lib/skladba";

/**
 * Kalkulačka Krmení na míru: čtyři otázky (kdo, váha a věk, pohyb, co teď jí) a jeden balíček s cenou za den.
 * Pravidelné dodávky jsou předvolené. Výpočet je stejný jako všude na webu (buildPlan: energie podle FEDIAF,
 * poměry složek podle obecných zásad BARF); podrobnosti jsou schované v rozbalovacích částech.
 */

type Species = "pes" | "kocka";
type Act = "klid" | "bezna" | "aktiv";
type Food = "granule" | "konzervy" | "varene" | "barf";
type Meat = "drubez" | "hovezi" | "jehneci" | "mix";
type Interval = 0 | 14 | 28;
type Panel = "" | "proc" | "rozpis" | "rada";

const M = (f: string) => `/maskot/${f}.webp`;
const ACT_INPUT: Record<Act, Activity> = { klid: "nizka", bezna: "bezna", aktiv: "vysoka" };
const POULTRY: MeatKey[] = ["kureci", "kruti", "kachni"];
const STATE_KEY = "dokosti-kalkulacka";
/** Druhy masa, které volba v kroku 4 nabízí; volba zmizí, když zvíře nesmí žádný z nich. */
const MEAT_OPTION: Record<Exclude<Meat, "mix">, MeatKey[]> = { drubez: POULTRY, hovezi: ["hovezi"], jehneci: ["jehneci"] };
const FOOD_TO_PROFILE: Record<Food, FeedingNow> = { granule: "granule", konzervy: "konzervy", varene: "", barf: "barf" };

type Saved = { species: Species; name: string; kg: number; ageM: number; act: Act; neutered: boolean; food: Food; exclude: MeatKey[]; meat: Meat | null; interval: Interval; rotate: boolean };

/** Profil z účtu → odpovědi kalkulačky. */
function fromProfile(p: PetProfile) {
  const m = ageMonths(p.bornOn);
  const food: Food = p.feedingNow === "barf" ? "barf" : p.feedingNow === "konzervy" ? "konzervy" : p.feedingNow === "granule" || p.feedingNow === "mix" ? "granule" : p.currentFood ? "varene" : "granule";
  const act: Act = p.activity === "nizka" ? "klid" : p.activity === "vysoka" || p.activity === "pracovni" ? "aktiv" : "bezna";
  return { species: p.species as Species, name: p.name, kg: p.weightKg > 0 ? p.weightKg : p.species === "pes" ? 20 : 4, ageM: m === null ? 36 : Math.max(1, m < 12 ? m : Math.round(m / 12) * 12), act, neutered: p.neutered, food, exclude: p.exclude };
}

/** Přibližné datum narození z věku (k dnešku, 15. den v měsíci). */
function bornFromMonths(months: number) {
  const d = new Date();
  d.setDate(15);
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

/** Pády jména pro texty: Rex → Rexe; bez jména obecně. */
function names(name: string, dog: boolean) {
  const n = name.trim();
  if (!n) return { nom: dog ? "váš pes" : "vaše kočka", acc: dog ? "vašeho psa" : "vaši kočku" };
  return { nom: n, acc: /[aeiouyáéíóúůý]$/i.test(n) ? n : `${n}e` };
}
const plural = (n: number, one: string, few: string, many: string) => (n === 1 ? one : n > 1 && n < 5 ? few : many);
const dec = (n: number) => (Math.round(n * 10) / 10).toLocaleString("cs-CZ");
const kgText = (g: number) => (g >= 1000 ? `${dec(g / 1000)} kg` : `${Math.round(g / 5) * 5} g`);

/**
 * Plán jen z toho, co je opravdu skladem: buildPlan bere zboží s příznakem skladem, tady se navíc
 * vyřadí položky, kterých by plán chtěl víc kusů, než sklad eviduje (pak vybere jiný mix).
 * Když by po vyřazení nezbyl žádný základ, zůstane původní plán a upozornění dá stav skladu v pokladně.
 */
function planInStock(products: Product[], input: AnimalInput, days: number): Plan {
  let removed = [...input.removed];
  let plan = buildPlan(products, input, days);
  for (let k = 0; k < 4; k++) {
    const over = plan.items.filter((i) => i.product.stockQty != null && i.qty > i.product.stockQty).map((i) => i.product.slug);
    if (!over.length) break;
    const next = buildPlan(products, { ...input, removed: [...removed, ...over] }, days);
    if (!next.items.some((i) => i.role === "zaklad")) break;
    removed = [...removed, ...over];
    plan = next;
  }
  return plan;
}

/** Odpovídá mix zvolenému druhu masa? Ostatní produkty (játra, ryba, doplňky) volba nefiltruje. */
function meatFits(p: Product, meat: Meat) {
  if (meat === "mix" || foodKind(p) !== "mix") return true;
  const m = p.meats ?? [];
  if (meat === "drubez") return m.some((x) => POULTRY.includes(x));
  if (meat === "hovezi") return m.includes("hovezi") && !m.includes("kureci");
  return m.includes("jehneci");
}

/** Druh položky v balíčku: podle něj se vysvětluje, nahrazuje a vyhazuje. */
type ItemKey = "zaklad" | "ryba" | "kosti" | "jatra" | "srdce" | "vnitrnosti" | "olej" | "jod" | "vapnik" | "jine";
type OffKey = "ryba" | "kosti" | "olej";
const txt = (p: Product) => `${p.variant} ${p.composition ?? ""}`.toLowerCase();

function itemKey(i: Reco): ItemKey {
  const t = txt(i.product);
  if (i.role === "zaklad" || i.role === "ryba" || i.role === "kosti" || i.role === "olej") return i.role;
  if (i.role === "vnitrnosti") return /játr|jatr/.test(t) ? "jatra" : /srdc/.test(t) ? "srdce" : "vnitrnosti";
  if (i.role === "doplnek") return /kelp/.test(t) ? "jod" : /vaječn|vápník/.test(t) ? "vapnik" : "jine";
  return "jine";
}

/** Čím jde položku nahradit: stejný druh, skladem, bez zakázaného masa (plan.pool) a mimo balíček. */
function alternativesFor(key: ItemKey, plan: Plan, pool: Product[]): Product[] {
  const inPlan = new Set(plan.items.map((i) => i.product.slug));
  const fits: Partial<Record<ItemKey, (p: Product) => boolean>> = {
    zaklad: (p) => foodKind(p) === "mix",
    ryba: (p) => foodKind(p) === "ryba",
    kosti: (p) => foodKind(p) === "kost",
    jatra: (p) => foodKind(p) === "vnitrnosti" && /játr|jatr/.test(txt(p)),
    vnitrnosti: (p) => foodKind(p) === "vnitrnosti" && !/játr|jatr|srdc/.test(txt(p)),
    olej: (p) => (foodKind(p) === "olej" && /losos|rybí|lněn|konop|mikrořas/.test(txt(p)) && !/tresč/.test(txt(p))) || (foodKind(p) === "mineraly" && /mikrořas/.test(txt(p))),
    jod: (p) => foodKind(p) === "mineraly" && /kelp/.test(txt(p)),
    vapnik: (p) => foodKind(p) === "mineraly" && /vaječn|vápník/.test(txt(p)),
  };
  const f = fits[key];
  return f ? pool.filter((p) => f(p) && !inPlan.has(p.slug)) : [];
}

/** Proč je položka v balíčku: obecně podle druhu, bez zdravotních tvrzení. */
const WHY: Record<ItemKey, string> = {
  zaklad: "Hlavní část misky. Co v ní je (maso, vnitřnosti, kost), říká složení od výrobce.",
  ryba: "Ryba jednou týdně místo porce masa. V mase skoro nejsou omega-3 mastné kyseliny ani jód, ryba je dodá.",
  kosti: "Masité kosti místo části porce, jako zdroj vápníku. Podávejte syrové, nikdy vařené.",
  jatra: "Játra jsou v syrové stravě hlavní zdroj vitaminu A. Jsou silná: po malých kouscích k masu a ze začátku méně.",
  srdce: "Srdce kvůli taurinu, který kočka potřebuje a v základu ho výrobce neuvádí.",
  vnitrnosti: "Ledvinky a další vnitřnosti patří do misky vedle jater, běžně se uvádí kolem 5 % dávky.",
  olej: "Omega-3 mastné kyseliny, když v balíčku není ryba. Dávka podle výrobce.",
  jod: "Mořská řasa jako zdroj jódu, když v jídelníčku není ryba. Dávka podle výrobce.",
  vapnik: "Vápník k masu, ve kterém není kost. Dávka podle výrobce.",
  jine: "",
};
/** Co se vyhozením ztratí (krátce, k odkazu „vrátit“). */
const GONE: Record<OffKey | DropKey, string> = {
  ryba: "bez ryby (omega-3 a jód doplní olej a mořská řasa)",
  kosti: "bez masitých kostí",
  olej: "bez oleje",
  jatra: "bez jater (chybí hlavní zdroj vitaminu A)",
  vnitrnosti: "bez dalších vnitřností",
  jod: "bez mořské řasy",
  vapnik: "bez vápníku",
};
const OFF_OF: Partial<Record<ItemKey, OffKey>> = { ryba: "ryba", kosti: "kosti", olej: "olej" };
const DROP_OF: Partial<Record<ItemKey, DropKey>> = { jatra: "jatra", vnitrnosti: "vnitrnosti", jod: "jod", vapnik: "vapnik" };

/** Ilustrace druhu masa (rytina zvířete); víc druhů se překrývá. */
function MeatFace({ meats, size = 44 }: { meats: readonly MeatKey[]; size?: number }) {
  const shown = meats.slice(0, 3);
  if (!shown.length) return null;
  return (
    <span className="flex shrink-0 items-center" aria-hidden>
      {shown.map((m, idx) => (
        <span key={m} className="relative overflow-hidden rounded-full border-2 border-white bg-cream" style={{ width: size, height: size, marginLeft: idx ? -size * 0.35 : 0 }}>
          <Image src={`/kategorie/maso-${m}.png`} alt="" fill sizes={`${size}px`} className="object-cover" />
        </span>
      ))}
    </span>
  );
}

export function FeedingCalculator({
  products,
  subscription,
  user,
  pets,
}: {
  products: Product[];
  subscription: { enabled: boolean; discountPct: number; pointsBonusPct: number };
  user: { email: string } | null;
  pets: PetProfile[];
}) {
  const router = useRouter();
  const cart = useCart();
  const [step, setStep] = useState(1);
  const [species, setSpecies] = useState<Species>("pes");
  const [name, setName] = useState("");
  const [kg, setKg] = useState(20);
  const [ageM, setAgeM] = useState(36);
  const [act, setAct] = useState<Act>("bezna");
  const [neutered, setNeutered] = useState(true);
  const [food, setFood] = useState<Food>("granule");
  const [meatChoice, setMeat] = useState<Meat | null>(null);
  const [interval, setInterval] = useState<Interval>(subscription.enabled ? 14 : 0);
  const [panel, setPanel] = useState<Panel>("");
  const [pending, setPending] = useState(false);
  const [exclude, setExclude] = useState<MeatKey[]>([]);
  const [rotate, setRotate] = useState(true);
  /** Načtený profil z účtu: při objednávce se aktualizuje, ostatní údaje (pohlaví, plemeno) zůstanou. */
  const [profile, setProfile] = useState<PetProfile | null>(null);
  const [saveNote, setSaveNote] = useState("");
  /** Úpravy balíčku: vypnuté části (ryba, kosti, olej), vyhozené (játra, vnitřnosti, doplňky) a náhrady (původní slug → nový). */
  const [off, setOff] = useState<OffKey[]>([]);
  const [drop, setDrop] = useState<DropKey[]>([]);
  const [swaps, setSwaps] = useState<Record<string, string>>({});
  const [openItem, setOpenItem] = useState<{ slug: string; mode: "proc" | "nahradit" } | null>(null);

  // Návrat z přihlášení: odpovědi, které zákazník vyplnil před odchodem, se obnoví a ukáže se výsledek.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STATE_KEY);
      if (!raw) return;
      sessionStorage.removeItem(STATE_KEY);
      const st = JSON.parse(raw) as Saved;
      // Obnova stavu z úložiště prohlížeče jde jen na klientovi.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSpecies(st.species);
      setName(st.name);
      setKg(st.kg);
      setAgeM(st.ageM);
      setAct(st.act);
      setNeutered(st.neutered);
      setFood(st.food);
      setExclude(st.exclude ?? []);
      setMeat(st.meat);
      setInterval(st.interval);
      setRotate(st.rotate);
      setStep(4);
    } catch {
      /* chybějící nebo rozbité úložiště: začneme od začátku */
    }
  }, []);
  const rememberForLogin = () => {
    try {
      const st: Saved = { species, name, kg, ageM, act, neutered, food, exclude, meat: meatChoice, interval, rotate };
      sessionStorage.setItem(STATE_KEY, JSON.stringify(st));
    } catch {
      /* bez úložiště se po přihlášení začne znovu */
    }
  };
  function loadPet(p: PetProfile) {
    const v = fromProfile(p);
    setProfile(p);
    setSpecies(v.species);
    setName(v.name);
    setKg(v.kg);
    setAgeM(v.ageM);
    setAct(v.act);
    setNeutered(v.neutered);
    setFood(v.food);
    setExclude(v.exclude);
    setMeat(null);
    setStep(4);
  }

  const dog = species === "pes";
  const { nom, acc } = names(name, dog);
  const stage: Stage = ageM < 12 ? "mlade" : ageM >= seniorAgeYears(species, kg) * 12 ? "senior" : "dospely";
  const newbie = food !== "barf";
  const meatAllowed = (m: Meat) => m === "mix" || MEAT_OPTION[m].some((k) => !exclude.includes(k));
  const meatWanted: Meat = meatChoice ?? (newbie ? "drubez" : "mix");
  // Nesmí-li zvíře zvolené maso, nováček dostane první povolený jeden druh, zkušený střídání.
  const meat: Meat = meatAllowed(meatWanted) ? meatWanted : newbie ? ((["drubez", "hovezi", "jehneci"] as const).find(meatAllowed) ?? "mix") : "mix";
  const days = interval || 14;

  const input = useMemo<AnimalInput>(
    () => ({
      ...newAnimal(species),
      name,
      weightKg: kg,
      stage,
      ageMonths: stage === "mlade" ? ageM : undefined,
      activity: ACT_INPUT[act],
      neutered,
      beginner: newbie && meat !== "mix",
      mode: "mixy",
      addons: { ...FULL_ADDONS, ryba: !exclude.includes("ryby") && !off.includes("ryba"), kosti: !off.includes("kosti"), olej: !off.includes("olej") },
      exclude,
      drop,
      swaps,
    }),
    [species, name, kg, stage, ageM, act, neutered, newbie, meat, exclude, off, drop, swaps],
  );
  /** Plán z nabídky omezené na zvolené maso; když žádný mix neodpovídá, z celé nabídky. */
  const { plan, meatMissing } = useMemo(() => {
    // Výchozí maso podle zkušenosti (nováček drůbež), náhrady, které si zákazník vybral, platí vždy.
    const chosen = new Set(Object.values(swaps));
    const pool = products.filter((p) => meatFits(p, meat) || chosen.has(p.slug));
    const fits = pool.some((p) => foodKind(p) === "mix" && p.inStock && p.animals.includes(species) && !containsMeat(p, exclude));
    return { plan: planInStock(fits ? pool : products, input, days), meatMissing: !fits };
  }, [products, meat, input, days, species, exclude, swaps]);

  /** Balení na víc dodávek (játra, olej): v dalších dodávkách jen každou N., nejvýš po dobu trvanlivosti. */
  const everyNth = useMemo(() => {
    const out: Record<string, number> = {};
    for (const i of plan.items) {
      const every = Math.min(12, i.periods, Math.max(1, Math.floor(shelfDays(i.product) / days)));
      if (every >= 2) out[i.product.slug] = every;
    }
    return out;
  }, [plan, days]);

  /**
   * Střídání masa: každá druhá dodávka (B) má místo mixů z dodávky A jiné mixy stejného druhu,
   * raději s jiným masem a stejnou gramáží. Vybírá jen ze zboží skladem a bez zakázaného masa (plan.pool).
   */
  const rotation = useMemo(() => {
    if (!interval || !rotate) return null;
    const inA = new Set(plan.items.map((i) => i.product.slug));
    const meatsA = new Set(plan.items.filter((i) => i.role === "zaklad").flatMap((i) => i.product.meats ?? []));
    const map: Record<string, string> = {};
    const taken = new Set<string>();
    for (const o of plan.items.filter((i) => i.role === "zaklad").map((i) => i.product)) {
      const cands = plan.pool.filter((p) => foodKind(p) === foodKind(o) && !inA.has(p.slug) && !taken.has(p.slug));
      const score = (p: Product) => (p.weightGrams === o.weightGrams ? 2 : 0) + ((p.meats ?? []).some((m) => meatsA.has(m)) ? 0 : 1);
      const pick = [...cands].sort((a, b) => score(b) - score(a))[0];
      if (pick) {
        // Klíčem náhrady je původní volba výpočtu (před zákazníkovou výměnou masa).
        map[Object.keys(input.swaps).find((k) => input.swaps[k] === o.slug) ?? o.slug] = pick.slug;
        taken.add(pick.slug);
      }
    }
    if (!Object.keys(map).length) return null;
    const planB = planInStock(plan.pool, { ...input, swaps: { ...input.swaps, ...map } }, days);
    const qa = new Map(plan.items.map((i) => [i.product.slug, i.qty]));
    const qb = new Map(planB.items.map((i) => [i.product.slug, i.qty]));
    const aOnly = plan.items.filter((i) => qb.get(i.product.slug) !== i.qty && !everyNth[i.product.slug]).map((i) => i.product.slug);
    const b = planB.items.filter((i) => qa.get(i.product.slug) !== i.qty && !everyNth[i.product.slug]);
    if (!b.some((i) => i.role === "zaklad")) return null;
    return { aOnly, b };
  }, [interval, rotate, plan, input, days, everyNth]);
  const r = plan.result;
  const base = plan.items.filter((i) => i.role === "zaklad");
  const basePack = base[0]?.product.weightGrams ?? 1000;

  const ageLabel = ageM < 12 ? plural(ageM, "měsíc", "měsíce", "měsíců") : plural(Math.round(ageM / 12), "rok", "roky", "let");
  const ageValue = ageM < 12 ? ageM : Math.round(ageM / 12);
  const stageLabel = stage === "mlade" ? (dog ? "Štěně" : "Kotě") : stage === "senior" ? "Senior" : "Dospělý";
  const weighImg = dog ? M(stage === "mlade" ? "vek-stene" : stage === "senior" ? "vek-senior" : "vek-dospely") : M("kocka-miska");
  const rule = dog ? (stage === "mlade" ? "u štěňat se běžně uvádí 4–6 %" : "běžně se uvádí 2–3 %") : stage === "mlade" ? "u koťat se běžně uvádí 4–10 %" : "běžně se uvádí 2–4 %";
  const sub = interval > 0;
  const gone = [...off, ...drop];
  /** Čím jde nahrazovat: všechno skladem pro dané zvíře a bez zakázaného masa (i jiné druhy masa než výchozí). */
  const altPool = products.filter((p) => p.inStock && p.unit !== "kg" && p.animals.includes(species) && !containsMeat(p, exclude));
  /** Balení na víc dodávek: v předplatném chodí jen každou N. dodávku, běžná dodávka je tedy levnější než první. */
  const occasional = plan.items.filter((i) => everyNth[i.product.slug]);
  const regularTotal = plan.items.filter((i) => !everyNth[i.product.slug]).reduce((n, i) => n + i.qty * i.product.priceCzk, 0);
  /** Původní slug položky (před náhradou): náhrady se ukládají k němu. */
  const origOf = (slug: string) => Object.keys(swaps).find((k) => swaps[k] === slug) ?? slug;
  function replaceItem(slug: string, to: string) {
    const o = origOf(slug);
    setSwaps((sw) => {
      const nextSw = { ...sw };
      if (to === o) delete nextSw[o];
      else nextSw[o] = to;
      return nextSw;
    });
    setOpenItem(null);
  }
  function removeItem(key: ItemKey) {
    const o = OFF_OF[key];
    const d = DROP_OF[key];
    if (o) setOff((x) => [...x, o]);
    if (d) setDrop((x) => [...x, d]);
    setOpenItem(null);
  }
  const restore = (k: OffKey | DropKey) => {
    setOff((x) => x.filter((v) => v !== k));
    setDrop((x) => x.filter((v) => v !== k));
  };

  async function order() {
    setPending(true);
    setSaveNote("");
    // Přihlášenému se profil zvířete uloží (nebo aktualizuje) v účtu; objednávku chyba uložení nezastaví.
    if (user && name.trim()) {
      const base = profile ?? emptyPet(species);
      const sameAge = profile && fromProfile(profile).ageM === ageM;
      const res = await savePetProfile(
        {
          ...base,
          species,
          name: name.trim(),
          weightKg: kg,
          bornOn: sameAge ? base.bornOn : bornFromMonths(ageM),
          activity: profile?.activity === "pracovni" && act === "aktiv" ? "pracovni" : ACT_INPUT[act],
          neutered,
          feedingNow: FOOD_TO_PROFILE[food],
          currentFood: food === "varene" ? "vařené" : base.currentFood,
          exclude,
          note: base.note || "Plán z kalkulačky Krmení na míru",
        },
        profile?.id,
      ).catch(() => null);
      if (!res?.ok) setSaveNote("Profil se nepodařilo uložit, objednávka ale pokračuje.");
    }
    cart.clear();
    plan.items.forEach((i) => cart.add(i.product.slug, i.qty));
    savePlan({
      forName: acc,
      intervalDays: interval,
      delivery: "rozvoz",
      lines: plan.items.map((i) => ({ slug: i.product.slug, qty: i.qty })),
      once: sub ? everyNth : {},
      aOnly: rotation ? rotation.aOnly : [],
      b: rotation ? rotation.b.map((i) => ({ slug: i.product.slug, qty: i.qty, name: productName(i.product) })) : [],
      dailyGrams: r.dailyGrams,
      preview: true,
    });
    router.push(`/pokladna?predplatne=${interval}`);
  }

  const card = (on: boolean) => `flex flex-col items-center gap-1 rounded-card border-2 bg-white p-3 text-center sm:p-4 transition-colors duration-300 ${on ? "border-green bg-paper" : "border-line hover:border-muted"}`;
  const chip = (on: boolean) => `min-h-11 rounded-control border-2 px-4 text-[15px] font-semibold transition-colors duration-300 ${on ? "border-green bg-green text-white" : "border-line bg-white text-ink hover:border-muted"}`;
  const next = () => setStep((s) => Math.min(4, s + 1));
  const cta = (label: string) => (
    <Button variant="action" size="lg" onClick={next} className="w-full self-center px-10 sm:w-auto">
      {label}
    </Button>
  );

  return (
    <div className="bg-gradient-to-b from-cream to-paper px-4 pt-5 pb-14 sm:px-6 sm:pt-8 sm:pb-16">
      <div className={`mx-auto flex w-full flex-col gap-6 sm:gap-7 ${step === 4 ? "max-w-[1160px]" : "max-w-[880px]"}`}>
        <div className="flex items-center justify-between gap-4">
          {step > 1 ? (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-muted hover:text-green">
              <ChevronLeft className="size-5" strokeWidth={1.75} aria-hidden /> Zpět
            </button>
          ) : (
            <span className="text-eyebrow text-muted uppercase">Krmení na míru</span>
          )}
          <div className="flex items-center gap-2.5">
            <span className="text-small text-muted">Krok {step} ze 4</span>
            <span className="flex gap-1" aria-hidden>
              {[1, 2, 3, 4].map((n) => (
                <span key={n} className={`h-1.5 w-6 rounded-full ${step >= n ? "bg-brick" : "bg-line"}`} />
              ))}
            </span>
          </div>
        </div>

        {step === 1 && (
          <section className="flex flex-col gap-6 sm:gap-7" aria-label="Pro koho">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-32 items-end justify-center gap-1 sm:h-48" aria-hidden>
                <Image src={M("vendy-pozdrav")} alt="" width={115} height={190} className="h-30 w-auto sm:h-44" priority />
                <Image src={M("cerveny-sedi")} alt="" width={132} height={190} className="h-32 w-auto sm:h-48" priority />
              </div>
              <h1 className="font-display text-display-md text-green sm:text-display-lg">
                Pro koho <em className="font-normal text-brick">vaříme?</em>
              </h1>
              <p className="text-[15px] text-muted sm:text-[17px]">Čtyři otázky, za minutu víte, kolik krmit a co koupit.</p>
            </div>
            {pets.length > 0 && (
              <div className="flex flex-col items-center gap-2.5">
                <span className="text-[15px] font-semibold text-green">Vaši mazlíčci</span>
                <div className="flex flex-wrap justify-center gap-2">
                  {pets.map((p) => (
                    <button key={p.id ?? p.name} type="button" onClick={() => loadPet(p)} className="min-h-11 rounded-control border-2 border-line bg-white px-4 text-[15px] font-semibold text-green hover:border-green">
                      {p.name}
                      <span className="ml-1.5 font-normal text-muted">
                        {p.species === "kocka" ? "kočka" : "pes"}
                        {p.weightKg > 0 ? `, ${dec(p.weightKg)} kg` : ""}
                      </span>
                    </button>
                  ))}
                </div>
                <span className="text-small text-muted">nebo vyplňte nového</span>
              </div>
            )}
            <label className="mx-auto flex w-full max-w-[420px] flex-col gap-2">
              <span className="text-[15px] font-semibold text-green">Jak se jmenuje?</span>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (profile) setProfile(null);
                }} placeholder="Třeba Rex" maxLength={40} autoComplete="off" className="min-h-13 rounded-control border border-line bg-white px-4 text-[18px]" />
            </label>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {(
                [
                  ["pes", "Pes", "Dávka podle váhy a pohybu", M("cerveny-sedi")],
                  ["kocka", "Kočka", "Jen maso, bez zeleniny", M("kocka-miska")],
                ] as const
              ).map(([v, label, desc, img]) => {
                const on = species === v;
                return (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      if (v === species) return;
                      setSpecies(v);
                      setKg(v === "pes" ? 20 : 4);
                      setProfile(null);
                    }}
                    className={`flex flex-col items-center gap-2 rounded-panel border-2 bg-white px-3 py-4 transition-colors sm:gap-2.5 sm:px-5 sm:py-7 duration-300 ${on ? "border-green shadow-card" : "border-line hover:border-muted"}`}
                  >
                    <span className={`flex size-18 items-end justify-center overflow-hidden rounded-full sm:size-26 ${on ? "bg-sand" : "bg-cream"}`} aria-hidden>
                      <Image src={img} alt="" width={80} height={96} className="h-16 w-auto sm:h-24" />
                    </span>
                    <span className="font-display text-[24px] font-black text-green sm:text-[30px]">{label}</span>
                    <span className="text-[13px] text-muted sm:text-[15px]">{desc}</span>
                  </button>
                );
              })}
            </div>
            {cta("Pokračovat")}
          </section>
        )}

        {step === 2 && (
          <section className="flex flex-col gap-6 sm:gap-7" aria-label="Váha a věk">
            <h1 className="text-center font-display text-display-md text-green md:text-display-lg">Kolik {nom} váží a jak {dog ? "je starý" : "je stará"}?</h1>
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex h-40 items-end justify-center sm:h-60" aria-hidden>
                <Image src={weighImg} alt="" width={260} height={400} className="max-h-40 w-auto transition-all duration-300 sm:max-h-60" style={{ height: dog && stage !== "mlade" ? Math.min(240, 170 + kg * 1.8) : 170 }} />
              </div>
              <span className="rounded-full bg-sand px-3 py-1 text-small font-bold text-green">{stageLabel}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <Stepper
                label="Váha"
                value={kg}
                unit="kg"
                onMinus={() => setKg((v) => Math.max(1, Math.round((v - 1) * 10) / 10))}
                onPlus={() => setKg((v) => Math.min(90, Math.round((v + 1) * 10) / 10))}
                onType={(v) => v > 0 && setKg(Math.min(90, v))}
                step={0.1}
              />
              <Stepper
                label="Věk"
                value={ageValue}
                unit={ageLabel}
                onMinus={() => setAgeM((m) => (m <= 12 ? Math.max(1, m - 1) : m - 12))}
                onPlus={() => setAgeM((m) => (m < 12 ? m + 1 : Math.min(240, m + 12)))}
                onType={(v) => v > 0 && setAgeM(ageM < 12 ? Math.min(11, Math.round(v)) : Math.min(240, Math.round(v) * 12))}
              />
            </div>
            <p className="-mt-3 text-center text-small text-muted">Věk do roka po měsících, pak po letech.</p>
            {cta("Pokračovat")}
          </section>
        )}

        {step === 3 && (
          <section className="flex flex-col gap-6 sm:gap-7" aria-label="Pohyb a krmení">
            <h1 className="text-center font-display text-display-md text-green md:text-display-lg">Jak žije a co teď jí?</h1>
            <div>
              <p className="mb-3 text-center text-[15px] font-semibold text-green">Pohyb</p>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {(
                  [
                    ["klid", "Klidný", "krátké procházky", "cerveny-lezi"],
                    ["bezna", "Běžný", "1 až 2 hodiny denně", "cerveny-sedi-2"],
                    ["aktiv", "Aktivní", "sport, práce, celý den venku", "cerveny-bezi"],
                  ] as const
                ).map(([v, label, desc, img]) => (
                  <button key={v} type="button" aria-pressed={act === v} onClick={() => setAct(v)} className={card(act === v)}>
                    {dog && (
                      <span className="flex h-16 w-full items-end justify-center sm:h-28" aria-hidden>
                        <Image src={M(img)} alt="" width={180} height={150} className="max-h-16 w-auto sm:max-h-28" />
                      </span>
                    )}
                    <span className="text-[15px] font-bold text-green sm:text-[18px]">{label}</span>
                    <span className="text-[12px] leading-snug text-muted sm:text-small">{desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="mr-1 text-[15px] font-semibold text-green">Kastrace</span>
              <button type="button" aria-pressed={neutered} onClick={() => setNeutered(true)} className={chip(neutered)}>
                Ano
              </button>
              <button type="button" aria-pressed={!neutered} onClick={() => setNeutered(false)} className={chip(!neutered)}>
                Ne
              </button>
            </div>
            <div>
              <p className="mb-3 text-center text-[15px] font-semibold text-green">Co {nom} jí teď</p>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
                {(
                  [
                    ["granule", "Granule", "přejdeme postupně"],
                    ["konzervy", "Konzervy", "přejdeme postupně"],
                    ["varene", "Vařené", "syrové zavedeme postupně"],
                    ["barf", "BARF", "rovnou střídání druhů"],
                  ] as const
                ).map(([v, label, desc]) => (
                  <button key={v} type="button" aria-pressed={food === v} onClick={() => setFood(v)} className={card(food === v)}>
                    <span className="text-[16px] font-bold text-green sm:text-[18px]">{label}</span>
                    <span className="text-[12px] text-muted sm:text-small">{desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-center text-[15px] font-semibold text-green">Co nesmí nebo nesnáší?</p>
              <p className="mb-3 text-center text-small text-muted">Označené maso v balíčku nebude, ani ve směsích. Když nic, pokračujte.</p>
              <div className="flex flex-wrap justify-center gap-2">
                {MEATS.map((m) => {
                  const on = exclude.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setExclude((x) => (on ? x.filter((k) => k !== m) : [...x, m]))}
                      className={`inline-flex min-h-11 items-center gap-1.5 rounded-control border-2 px-3.5 text-[15px] font-semibold capitalize transition-colors duration-300 ${on ? "border-brick bg-white text-brick-text line-through" : "border-line bg-white text-ink hover:border-muted"}`}
                    >
                      {on && <X className="size-4" strokeWidth={1.75} aria-hidden />}
                      {MEAT_LABEL[m]}
                    </button>
                  );
                })}
              </div>
            </div>
            {cta(`Ukázat plán pro ${acc}`)}
          </section>
        )}

        {step === 4 && (
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8" aria-label="Plán">
            <div className="flex min-w-0 flex-col gap-6">
              <div className="flex items-center justify-center gap-4 sm:gap-8 lg:justify-start">
                <Image src={dog ? M("vendy-miska") : M("kocka-miska")} alt="" width={160} height={200} className="h-28 w-auto shrink-0 sm:h-44 lg:h-50" aria-hidden />
                <div className="flex min-w-0 max-w-[480px] flex-col gap-1 sm:gap-1.5">
                  <p className="text-[15px] text-muted sm:text-[17px]">{nom.charAt(0).toUpperCase() + nom.slice(1)} potřebuje denně</p>
                  <p className="font-display text-[clamp(52px,15vw,88px)] leading-none font-black text-green">{r.dailyGrams} g</p>
                  <p className="text-[14px] text-ink sm:text-[16px]">
                    {r.mealsPerDay} {plural(r.mealsPerDay, "porce", "porce", "porcí")} po {Math.round(r.dailyGrams / r.mealsPerDay / 5) * 5} g · balení {kgText(basePack)} vydrží {dec(basePack / r.dailyGrams)} dne · {kgText(r.dailyGrams * 7)} týdně
                  </p>
                  <p className="text-[13px] text-muted sm:text-small">
                    {dec(r.pct)} % váhy denně, {rule}. Po 2 až 4 týdnech {dog ? "psa" : "kočku"} zvažte a dávku upravte.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4 rounded-panel border border-line bg-white p-4 sm:p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h2 className="font-display text-[24px] font-semibold text-green sm:text-[28px]">
                    {newbie ? "Startovací balíček" : "Balíček"} pro {acc}
                  </h2>
                  <span className="text-small text-muted">
                    na {days === 14 ? "2 týdny" : "4 týdny"} · {kgText(plan.items.reduce((s, i) => s + (i.product.storage === "mrazene" ? i.qty * i.product.weightGrams : 0), 0))} do mrazáku
                  </span>
                </div>
                {exclude.length > 0 && <p className="-mt-2 text-small text-muted">Bez masa: {exclude.map((k) => MEAT_LABEL[k].toLowerCase()).join(", ")}. Hlídáme i směsi a vnitřnosti.</p>}
                {meatMissing && <p className="-mt-2 text-small text-brick-text">Vhodné maso zrovna nemáme skladem, v balíčku je náhrada.</p>}
                {plan.items.length === 0 ? (
                  <p>Pro tuto kombinaci zrovna nemáme skladem vhodné maso. Napište nám níže, poskládáme balíček spolu.</p>
                ) : (
                  <ul className="flex flex-col gap-2.5">
                    {plan.items.map((i) => {
                      const key = itemKey(i);
                      const alts = alternativesFor(key, plan, altPool);
                      const orig = origOf(i.product.slug);
                      const swappedFrom = orig !== i.product.slug ? products.find((p) => p.slug === orig) : undefined;
                      const removable = Boolean(OFF_OF[key] || DROP_OF[key]);
                      const open = openItem?.slug === i.product.slug ? openItem.mode : null;
                      const btn = "inline-flex min-h-10 items-center gap-1.5 rounded-control border px-3 text-[13px] font-semibold transition-colors duration-300";
                      const toggle = (mode: "proc" | "nahradit") => setOpenItem(open === mode ? null : { slug: i.product.slug, mode });
                      return (
                        <li key={i.product.slug} className="rounded-card border border-line bg-paper p-3 sm:p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="size-14 shrink-0 overflow-hidden rounded-control bg-white sm:size-16">
                              <ProductImage product={i.product} sizes="64px" className="h-14 sm:h-16" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="flex flex-wrap items-center gap-x-2 text-eyebrow text-muted uppercase">
                                {ROLE[i.role]}
                                {sub && everyNth[i.product.slug] && <span className="rounded-full bg-sand px-2 text-[11px] font-bold tracking-normal text-green normal-case">každou {everyNth[i.product.slug]}. dodávku</span>}
                              </p>
                              <Link href={`/produkt/${i.product.slug}`} className="block text-[15px] leading-snug font-bold text-ink hover:underline">
                                {productName(i.product)}
                              </Link>
                              <p className="text-[13px] text-muted">
                                {sub && everyNth[i.product.slug]
                                  ? `přijde teď a pak znovu, až bude docházet · `
                                  : i.periods > 1
                                    ? `vydrží na ${i.periods} ${plural(i.periods, "dodávku", "dodávky", "dodávek")} · `
                                    : ""}
                                {i.portionText}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-[15px] font-bold text-green tabular-nums">{formatPrice(i.qty * i.product.priceCzk)}</p>
                              <p className="text-[13px] text-muted">{i.qty} ks</p>
                            </div>
                          </div>
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            {WHY[key] && (
                              <button type="button" aria-expanded={open === "proc"} onClick={() => toggle("proc")} className={`${btn} ${open === "proc" ? "border-green bg-white text-green" : "border-line bg-white text-green hover:border-green"}`}>
                                <Info className="size-4" strokeWidth={1.75} aria-hidden /> Proč?
                              </button>
                            )}
                            {(alts.length > 0 || swappedFrom) && (
                              <button type="button" aria-expanded={open === "nahradit"} onClick={() => toggle("nahradit")} className={`${btn} ${open === "nahradit" ? "border-green bg-white text-green" : "border-line bg-white text-green hover:border-green"}`}>
                                <ArrowLeftRight className="size-4" strokeWidth={1.75} aria-hidden /> {key === "zaklad" ? "Vyměnit maso" : "Nahradit"}
                              </button>
                            )}
                            {removable && (
                              <button type="button" onClick={() => removeItem(key)} className={`${btn} border-line bg-white text-brick-text hover:border-brick`}>
                                <X className="size-4" strokeWidth={1.75} aria-hidden /> Vyhodit
                              </button>
                            )}
                          </div>
                          {open === "proc" && (
                            <p className="mt-2.5 rounded-control bg-white px-3 py-2.5 text-[14px] text-ink">
                              {WHY[key]}
                              {i.why && <span className="mt-1 block text-[13px] text-muted">V tomto plánu: {i.why}.</span>}
                            </p>
                          )}
                          {open === "nahradit" && (
                            <div className="mt-2.5 flex flex-col gap-2">
                              <ul className={`grid gap-2 ${key === "zaklad" ? "grid-cols-2 sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                                {[...(swappedFrom ? [swappedFrom] : []), ...alts.filter((a) => a.slug !== swappedFrom?.slug)].map((a) => (
                                  <li key={a.slug}>
                                    <button
                                      type="button"
                                      onClick={() => replaceItem(i.product.slug, a.slug)}
                                      className={`flex h-full w-full rounded-card border-2 border-line bg-white p-2.5 text-left transition-colors duration-300 hover:border-green ${key === "zaklad" ? "flex-col items-center gap-1.5 text-center" : "items-center gap-2.5"}`}
                                    >
                                      {key === "zaklad" && a.meats?.length ? (
                                        <MeatFace meats={a.meats} size={a.meats.length > 1 ? 44 : 60} />
                                      ) : (
                                        <span className="size-11 shrink-0 overflow-hidden rounded-control bg-cream">
                                          <ProductImage product={a} sizes="44px" className="h-11" />
                                        </span>
                                      )}
                                      <span className="min-w-0">
                                        <span className="block text-[14px] leading-snug font-bold text-ink">{productName(a)}</span>
                                        <span className="block text-[12px] text-muted">
                                          {formatPrice(a.priceCzk)}
                                          {a.slug === swappedFrom?.slug ? " · původní volba" : ""}
                                        </span>
                                      </span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                              {key === "zaklad" && <p className="text-[12px] text-muted">Množství se přepočítá podle nového masa.</p>}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {sub && occasional.length > 0 && (
                  <p className="rounded-control bg-paper px-3 py-2.5 text-small text-ink">
                    <b className="text-green">Jen občas:</b> {occasional.map((i) => `${productName(i.product)} (každou ${everyNth[i.product.slug]}. dodávku)`).join(", ")}. Balení vydrží déle, proto přijde teď a pak samo znovu, až bude docházet. Před každou dodávkou vám napíšeme, co přijde, a jde to změnit.
                  </p>
                )}
                {gone.length > 0 && (
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-small text-muted">
                    <span>Vyhozeno:</span>
                    {gone.map((g) => (
                      <span key={g} className="inline-flex items-center gap-1.5 rounded-control bg-paper px-2.5 py-1">
                        {GONE[g]}
                        <button type="button" onClick={() => restore(g)} className="font-semibold text-brick-text underline">
                          vrátit
                        </button>
                      </span>
                    ))}
                  </p>
                )}
                {rotation && (
                  <p className="flex items-start gap-2 rounded-control bg-paper px-3 py-2.5 text-small text-ink">
                    <RefreshCw className="mt-0.5 size-4 shrink-0 text-green" strokeWidth={1.75} aria-hidden />
                    <span>
                      Maso se střídá: další dodávka přiveze{" "}
                      <b>
                        {rotation.b
                          .filter((i) => i.role === "zaklad")
                          .map((i) => productName(i.product))
                          .join(", ")}
                      </b>
                      , pak zase tenhle balíček.
                    </span>
                  </p>
                )}
                {newbie && (
                  <ol className="grid grid-cols-3 gap-2">
                    {[
                      ["1. týden", "jen jeden druh masa"],
                      ["2. týden", "játra po malých kouscích"],
                      ["3. týden", "rybí den"],
                    ].map(([w, t]) => (
                      <li key={w} className="rounded-control border border-line px-2.5 py-2 text-[12px] text-muted sm:px-3 sm:py-2.5 sm:text-[13px]">
                        <b className="block text-brick-text">{w}</b>
                        {t}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>

            <aside className="flex flex-col gap-3.5 rounded-panel border border-line bg-cream p-4 sm:p-6 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1">
              {subscription.enabled && (
                <div role="radiogroup" aria-label="Jak objednat" className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
                  <button type="button" role="radio" aria-checked={sub} onClick={() => setInterval(14)} className={`flex flex-col items-start gap-2 rounded-card border-2 bg-white p-3.5 text-left sm:p-4 ${sub ? "border-green" : "border-line"}`}>
                    <span className="flex w-full items-center justify-between gap-2">
                      <span className="text-[16px] font-bold text-green sm:text-[17px]">Posílat pravidelně</span>
                      <span className="rounded-full bg-brick px-2.5 py-0.5 text-[12px] font-bold text-white">{subscription.discountPct > 0 ? `−${subscription.discountPct} %` : "Doporučujeme"}</span>
                    </span>
                    <span className="flex flex-col gap-1 text-[13px] text-muted sm:text-small">
                      <span>Mrazák nezůstane prázdný, maso přivezeme včas.</span>
                      {subscription.pointsBonusPct > 0 && <span>Kostičky navíc za každou dodávku.</span>}
                      <span>Přeskočíte, změníte nebo zrušíte kdykoli v účtu.</span>
                    </span>
                  </button>
                  <button type="button" role="radio" aria-checked={!sub} onClick={() => setInterval(0)} className={`flex flex-col items-start gap-2 rounded-card border-2 bg-white p-3.5 text-left sm:p-4 ${!sub ? "border-green" : "border-line"}`}>
                    <span className="text-[16px] font-bold text-green sm:text-[17px]">Jen jednou</span>
                    <span className="text-[13px] text-muted sm:text-small">Vyzkoušet a objednat znovu, až dojde.</span>
                  </button>
                </div>
              )}
              {subscription.enabled && (
                <Link href="/pravidelne-dodavky" className="-mt-1 text-small font-semibold text-brick-text underline">
                  Jak pravidelné dodávky fungují
                </Link>
              )}
              {sub && (
                <div className="flex flex-wrap items-center gap-2">
                  {([14, 28] as const).map((d) => (
                    <button key={d} type="button" aria-pressed={interval === d} onClick={() => setInterval(d)} className={`${chip(interval === d)} flex-1 px-3 sm:flex-none lg:flex-1`}>
                      Každé {d === 14 ? "2 týdny" : "4 týdny"}
                    </button>
                  ))}
                  <label className="inline-flex min-h-11 w-full cursor-pointer items-center gap-2 text-small font-semibold text-green sm:ml-auto sm:w-auto lg:ml-0 lg:w-full">
                    <input type="checkbox" checked={rotate} onChange={(e) => setRotate(e.target.checked)} className="size-4.5 accent-green" />
                    Střídat druhy masa
                  </label>
                </div>
              )}
              <div className="flex items-end justify-between gap-3">
                <p className="flex flex-col">
                  <span className="font-display text-[clamp(34px,9vw,44px)] leading-none font-black text-green">
                    {formatPrice(plan.perDayCzk)} <span className="text-[18px] font-semibold sm:text-[20px]">za den</span>
                  </span>
                  <span className="mt-1 text-[14px] text-muted sm:text-[15px]">{sub
                      ? occasional.length
                        ? `první dodávka ${formatPrice(plan.totalCzk)}, další obvykle ${formatPrice(regularTotal)} každé ${days === 14 ? "2 týdny" : "4 týdny"}`
                        : `dodávka ${formatPrice(plan.totalCzk)} každé ${days === 14 ? "2 týdny" : "4 týdny"}`
                      : `nákup celkem ${formatPrice(plan.totalCzk)}`}</span>
                </p>
                <Image src={M("cerveny-taska")} alt="" width={90} height={96} className="h-20 w-auto shrink-0 sm:h-24" aria-hidden />
              </div>
              <Button variant="action" size="lg" onClick={order} disabled={pending || plan.items.length === 0} className="w-full">
                {sub ? "Objednat pravidelně" : "Vložit do košíku"}
              </Button>
              {user ? (
                name.trim() && <p className="text-small text-muted">Profil {acc} se při objednávce uloží do vašeho účtu, příště stačí jedno kliknutí.</p>
              ) : (
                <p className="text-small text-muted">
                  <Link href="/ucet/prihlaseni?next=/krmeni-na-miru" onClick={rememberForLogin} className="font-semibold text-brick-text underline">
                    Přihlaste se
                  </Link>{" "}
                  a profil {acc} uložíme, příště ho nebudete vyplňovat.
                </p>
              )}
              {saveNote && <p className="text-small text-brick-text">{saveNote}</p>}
            </aside>

            <div className="flex min-w-0 flex-col gap-6 lg:col-start-1">
              <div className="flex flex-col border-t border-line">
                {(
                  [
                    ["proc", "Co v balíčku je a proč", "Pro ty, kdo s BARFem začínají"],
                    ["rozpis", "Podrobný rozpis", "Gramy po složkách a energie"],
                    ["rada", "Chci poradit", "Napište nám, projdeme plán s vámi"],
                  ] as const
                ).map(([id, title, subtitle]) => {
                  const open = panel === id;
                  return (
                    <div key={id} className="border-b border-line">
                      <button type="button" aria-expanded={open} onClick={() => setPanel(open ? "" : id)} className="flex min-h-15 w-full items-center justify-between gap-3 px-1 text-left">
                        <span className="flex flex-col">
                          <span className="text-[16px] font-bold text-green sm:text-[17px]">{title}</span>
                          <span className="text-small text-muted">{subtitle}</span>
                        </span>
                        {open ? <Minus className="size-5 shrink-0 text-green" strokeWidth={1.75} aria-hidden /> : <Plus className="size-5 shrink-0 text-green" strokeWidth={1.75} aria-hidden />}
                      </button>
                      {open && id === "proc" && (
                        <div className="pb-5">
                          <PlanCoverage plan={plan} />
                        </div>
                      )}
                      {open && id === "rozpis" && (
                        <div className="flex flex-col gap-2.5 px-1 pb-5">
                          <div className="overflow-x-auto rounded-card border border-line bg-white">
                            <table className="w-full min-w-[440px] text-[14px] sm:text-[15px]">
                              <thead>
                                <tr className="text-left text-eyebrow text-muted uppercase">
                                  <th className="px-3 py-2.5 font-semibold">Složka</th>
                                  <th className="px-3 py-2.5 text-right font-semibold">Podíl</th>
                                  <th className="px-3 py-2.5 text-right font-semibold">Denně</th>
                                  <th className="px-3 py-2.5 text-right font-semibold">Týdně</th>
                                </tr>
                              </thead>
                              <tbody>
                                {bowlTargets(plan).map((t) => (
                                  <tr key={t.key} className="border-t border-line">
                                    <td className="px-3 py-2.5">
                                      <span className="font-semibold text-ink">{t.label}</span>
                                      {t.hint && <span className="block text-[13px] text-muted">{t.hint}</span>}
                                    </td>
                                    <td className="px-3 py-2.5 text-right text-muted">{t.pct == null ? "" : `${t.pct.toLocaleString("cs-CZ")} %`}</td>
                                    <td className="px-3 py-2.5 text-right font-bold text-green">{t.perDay}</td>
                                    <td className="px-3 py-2.5 text-right text-muted">{t.perWeek}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <p className="text-small text-muted">
                            {r.kcalPerDay} kcal denně{r.energyMode ? "" : " při běžné hustotě syrové stravy 150 kcal na 100 g"}. {ZASADY}
                          </p>
                        </div>
                      )}
                      {open && id === "rada" && (
                        <div className="pb-5">
                          <InquiryForm />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {plan.notes.some((n) => n.kind === "warn") && (
                <ul className="space-y-1 text-small text-brick-text">
                  {plan.notes
                    .filter((n) => n.kind === "warn")
                    .map((n) => (
                      <li key={n.text}>{n.text}</li>
                    ))}
                </ul>
              )}
              <p className="text-center text-[13px] text-muted lg:text-left">
                Energie podle FEDIAF, poměry složek podle obecných zásad syrového krmení. Orientační výpočet pro zdravé zvíře; mražené maso není kompletní krmivo. Štěně velkého plemene, březí nebo nemocné zvíře: poraďte se s veterinářem.
              </p>
              <p className="flex items-center justify-center gap-1.5 text-small text-muted lg:justify-start">
                <Check className="size-4 text-green" strokeWidth={1.75} aria-hidden /> Plán se nikam neukládá, dokud neobjednáte.
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

const ROLE: Record<string, string> = { zaklad: "Základ", ryba: "Ryba", kosti: "Masité kosti", rekreacni: "Na okusování", vnitrnosti: "Vnitřnosti", olej: "Olej", zelenina: "Zelenina", doplnek: "Doplněk", granule: "Granule" };

/** Velké číslo s tlačítky − a + a možností napsat hodnotu. */
function Stepper({ label, value, unit, onMinus, onPlus, onType, step = 1 }: { label: string; value: number; unit: string; onMinus: () => void; onPlus: () => void; onType: (v: number) => void; step?: number }) {
  const round = "flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-line bg-white text-green hover:border-muted sm:size-14";
  return (
    <div className="flex flex-col items-center gap-2 rounded-panel border border-line bg-white p-4 sm:gap-2.5 sm:p-5">
      <span className="text-[15px] font-semibold text-green">{label}</span>
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        <button type="button" onClick={onMinus} aria-label={`${label}: ubrat`} className={round}>
          <Minus className="size-6" strokeWidth={1.75} aria-hidden />
        </button>
        <label className="flex items-baseline gap-1.5">
          <span className="sr-only">{label}</span>
          <input
            type="number"
            inputMode="decimal"
            step={step}
            min={0}
            value={value}
            onChange={(e) => onType(Number(e.target.value.replace(",", ".")))}
            className="min-h-14 w-22 border-0 border-b-2 border-line bg-transparent text-center font-display text-[42px] font-black text-green sm:min-h-18 sm:w-28 sm:text-[56px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-[17px] font-semibold text-green sm:text-[22px]">{unit}</span>
        </label>
        <button type="button" onClick={onPlus} aria-label={`${label}: přidat`} className={round}>
          <Plus className="size-6" strokeWidth={1.75} aria-hidden />
        </button>
      </div>
    </div>
  );
}
