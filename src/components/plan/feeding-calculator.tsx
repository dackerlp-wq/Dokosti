"use client";

import { Check, ChevronLeft, Minus, Plus, RefreshCw, X } from "lucide-react";
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
import { type Activity, type AnimalInput, bowlTargets, buildPlan, containsMeat, FULL_ADDONS, foodKind, newAnimal, type Plan, seniorAgeYears, shelfDays, type Stage } from "@/lib/barf";
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
      addons: { ...FULL_ADDONS, ryba: !exclude.includes("ryby") },
      exclude,
    }),
    [species, name, kg, stage, ageM, act, neutered, newbie, meat, exclude],
  );
  /** Plán z nabídky omezené na zvolené maso; když žádný mix neodpovídá, z celé nabídky. */
  const { plan, meatMissing } = useMemo(() => {
    const pool = products.filter((p) => meatFits(p, meat));
    const fits = pool.some((p) => foodKind(p) === "mix" && p.inStock && p.animals.includes(species) && !containsMeat(p, exclude));
    return { plan: planInStock(fits ? pool : products, input, days), meatMissing: !fits };
  }, [products, meat, input, days, species, exclude]);

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
        map[o.slug] = pick.slug;
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

  const card = (on: boolean) => `flex flex-col items-center gap-1 rounded-card border-2 bg-white p-4 text-center transition-colors duration-300 ${on ? "border-green bg-paper" : "border-line hover:border-muted"}`;
  const chip = (on: boolean) => `min-h-11 rounded-control border-2 px-4 text-[15px] font-semibold transition-colors duration-300 ${on ? "border-green bg-green text-white" : "border-line bg-white text-ink hover:border-muted"}`;
  const next = () => setStep((s) => Math.min(4, s + 1));
  const cta = (label: string) => (
    <Button variant="action" size="lg" onClick={next} className="self-center px-10">
      {label}
    </Button>
  );

  return (
    <div className="bg-gradient-to-b from-cream to-paper px-5 pt-8 pb-16">
      <div className="mx-auto flex max-w-[880px] flex-col gap-7">
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
          <section className="flex flex-col gap-7" aria-label="Pro koho">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-48 items-end justify-center gap-1" aria-hidden>
                <Image src={M("vendy-pozdrav")} alt="" width={115} height={190} className="h-44 w-auto" priority />
                <Image src={M("cerveny-sedi")} alt="" width={132} height={190} className="h-48 w-auto" priority />
              </div>
              <h1 className="font-display text-display-lg text-green">
                Pro koho <em className="font-normal text-brick">vaříme?</em>
              </h1>
              <p className="text-[17px] text-muted">Čtyři otázky, za minutu víte, kolik krmit a co koupit.</p>
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
            <div className="grid gap-4 sm:grid-cols-2">
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
                    className={`flex flex-col items-center gap-2.5 rounded-panel border-2 bg-white px-5 py-7 transition-colors duration-300 ${on ? "border-green shadow-card" : "border-line hover:border-muted"}`}
                  >
                    <span className={`flex size-26 items-end justify-center overflow-hidden rounded-full ${on ? "bg-sand" : "bg-cream"}`} aria-hidden>
                      <Image src={img} alt="" width={80} height={96} className="h-24 w-auto" />
                    </span>
                    <span className="font-display text-[30px] font-black text-green">{label}</span>
                    <span className="text-[15px] text-muted">{desc}</span>
                  </button>
                );
              })}
            </div>
            {cta("Pokračovat")}
          </section>
        )}

        {step === 2 && (
          <section className="flex flex-col gap-7" aria-label="Váha a věk">
            <h1 className="text-center font-display text-display-md text-green md:text-display-lg">Kolik {nom} váží a jak {dog ? "je starý" : "je stará"}?</h1>
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex h-60 items-end justify-center" aria-hidden>
                <Image src={weighImg} alt="" width={260} height={400} className="w-auto transition-all duration-300" style={{ height: dog && stage !== "mlade" ? Math.min(240, 170 + kg * 1.8) : 170 }} />
              </div>
              <span className="rounded-full bg-sand px-3 py-1 text-small font-bold text-green">{stageLabel}</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
          <section className="flex flex-col gap-7" aria-label="Pohyb a krmení">
            <h1 className="text-center font-display text-display-md text-green md:text-display-lg">Jak žije a co teď jí?</h1>
            <div>
              <p className="mb-3 text-center text-[15px] font-semibold text-green">Pohyb</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ["klid", "Klidný", "krátké procházky", "cerveny-lezi"],
                    ["bezna", "Běžný", "1 až 2 hodiny denně", "cerveny-sedi-2"],
                    ["aktiv", "Aktivní", "sport, práce, celý den venku", "cerveny-bezi"],
                  ] as const
                ).map(([v, label, desc, img]) => (
                  <button key={v} type="button" aria-pressed={act === v} onClick={() => setAct(v)} className={card(act === v)}>
                    {dog && (
                      <span className="flex h-28 w-full items-end justify-center" aria-hidden>
                        <Image src={M(img)} alt="" width={180} height={150} className="max-h-28 w-auto" />
                      </span>
                    )}
                    <span className="text-[18px] font-bold text-green">{label}</span>
                    <span className="text-small text-muted">{desc}</span>
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
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                {(
                  [
                    ["granule", "Granule", "přejdeme postupně"],
                    ["konzervy", "Konzervy", "přejdeme postupně"],
                    ["varene", "Vařené", "syrové zavedeme postupně"],
                    ["barf", "Už BARF", "rovnou střídání druhů"],
                  ] as const
                ).map(([v, label, desc]) => (
                  <button key={v} type="button" aria-pressed={food === v} onClick={() => setFood(v)} className={card(food === v)}>
                    <span className="text-[18px] font-bold text-green">{label}</span>
                    <span className="text-small text-muted">{desc}</span>
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
          <section className="flex flex-col gap-6" aria-label="Plán">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              <Image src={dog ? M("vendy-miska") : M("kocka-miska")} alt="" width={160} height={200} className="h-50 w-auto" aria-hidden />
              <div className="flex max-w-[460px] flex-col gap-1.5">
                <p className="text-[17px] text-muted">{nom.charAt(0).toUpperCase() + nom.slice(1)} potřebuje denně</p>
                <p className="font-display text-[88px] leading-none font-black text-green">{r.dailyGrams} g</p>
                <p className="text-ink">
                  {r.mealsPerDay} {plural(r.mealsPerDay, "porce", "porce", "porcí")} po {Math.round(r.dailyGrams / r.mealsPerDay / 5) * 5} g · balení {kgText(basePack)} vydrží {dec(basePack / r.dailyGrams)} dne · {kgText(r.dailyGrams * 7)} týdně
                </p>
                <p className="text-small text-muted">
                  {dec(r.pct)} % váhy denně, {rule}. Po 2 až 4 týdnech {dog ? "psa" : "kočku"} zvažte a dávku upravte.
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2.5 text-[15px] font-semibold text-green">Jaké maso?</p>
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                {(
                  [
                    ["drubez", "Drůbeží", "snese skoro každý"],
                    ["hovezi", "Hovězí", "bez kuřete"],
                    ["jehneci", "Jehněčí", "pro citlivější"],
                    ["mix", "Střídat", "víc druhů masa"],
                  ] as const
                ).map(([v, label, desc]) => {
                  const ok = meatAllowed(v);
                  return (
                    <button key={v} type="button" aria-pressed={meat === v} disabled={!ok} onClick={() => setMeat(v)} className={`${card(meat === v)} disabled:cursor-not-allowed disabled:opacity-45`}>
                      <span className="font-bold text-green">{label}</span>
                      <span className="text-[13px] text-muted">{ok ? desc : "nesmí"}</span>
                    </button>
                  );
                })}
              </div>
              {exclude.length > 0 && <p className="mt-2 text-small text-muted">Bez masa: {exclude.map((k) => MEAT_LABEL[k].toLowerCase()).join(", ")}. Hlídáme i směsi a vnitřnosti.</p>}
              {meatMissing && <p className="mt-2 text-small text-brick-text">Tohle maso zrovna nemáme skladem, v balíčku je náhrada.</p>}
            </div>

            <div className="overflow-hidden rounded-panel border border-line bg-white">
              <div className="flex flex-col gap-4 p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-[28px] font-semibold text-green">
                    {newbie ? "Startovací balíček" : "Balíček"} pro {acc}
                  </h2>
                  <span className="text-small text-muted">
                    na {days === 14 ? "2 týdny" : "4 týdny"} · {kgText(plan.items.reduce((s, i) => s + (i.product.storage === "mrazene" ? i.qty * i.product.weightGrams : 0), 0))} do mrazáku
                  </span>
                </div>
                {plan.items.length === 0 ? (
                  <p>Pro tuto kombinaci zrovna nemáme skladem vhodné maso. Napište nám níže, poskládáme balíček spolu.</p>
                ) : (
                  <ul className="grid gap-2.5 sm:grid-cols-2">
                    {plan.items.map((i) => (
                      <li key={i.product.slug} className="flex items-center gap-3 rounded-card bg-paper p-2.5">
                        <div className="size-13 shrink-0 overflow-hidden rounded-control bg-white">
                          <ProductImage product={i.product} sizes="52px" className="h-13" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-eyebrow text-muted uppercase">{ROLE[i.role]}</p>
                          <Link href={`/produkt/${i.product.slug}`} className="block truncate text-[15px] font-bold text-ink hover:underline">
                            {productName(i.product)}
                          </Link>
                          <p className="text-[13px] text-muted">
                            {i.qty} ks{i.periods > 1 ? `, vydrží na ${i.periods} ${plural(i.periods, "dodávku", "dodávky", "dodávek")}` : ""} · {i.portionText}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
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
                      ["2. týden", "přidat játra"],
                      ["3. týden", "rybí den"],
                    ].map(([w, t]) => (
                      <li key={w} className="rounded-control border border-line px-3 py-2.5 text-[13px] text-muted">
                        <b className="block text-brick-text">{w}</b>
                        {t}
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              <div className="flex flex-col gap-3.5 bg-cream p-6">
                {subscription.enabled && (
                  <div role="radiogroup" aria-label="Jak objednat" className="grid gap-3 md:grid-cols-2">
                    <button type="button" role="radio" aria-checked={sub} onClick={() => setInterval(14)} className={`flex flex-col items-start gap-2 rounded-card border-2 bg-white p-4 text-left ${sub ? "border-green" : "border-line"}`}>
                      <span className="flex w-full items-center justify-between gap-2">
                        <span className="text-[17px] font-bold text-green">Posílat pravidelně</span>
                        <span className="rounded-full bg-brick px-2.5 py-0.5 text-[12px] font-bold text-white">{subscription.discountPct > 0 ? `−${subscription.discountPct} %` : "Doporučujeme"}</span>
                      </span>
                      <span className="flex flex-col gap-1 text-small text-muted">
                        <span>Mrazák nezůstane prázdný, maso přivezeme samo.</span>
                        {subscription.pointsBonusPct > 0 && <span>Kostičky navíc za každou dodávku.</span>}
                        <span>Přeskočíte, změníte nebo zrušíte kdykoli v účtu.</span>
                      </span>
                    </button>
                    <button type="button" role="radio" aria-checked={!sub} onClick={() => setInterval(0)} className={`flex flex-col items-start gap-2 rounded-card border-2 bg-white p-4 text-left ${!sub ? "border-green" : "border-line"}`}>
                      <span className="text-[17px] font-bold text-green">Jen jednou</span>
                      <span className="text-small text-muted">Vyzkoušet a objednat znovu, až dojde.</span>
                    </button>
                  </div>
                )}
                {sub && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-small text-muted">Jak často</span>
                    {([14, 28] as const).map((d) => (
                      <button key={d} type="button" aria-pressed={interval === d} onClick={() => setInterval(d)} className={chip(interval === d)}>
                        Každé {d === 14 ? "2 týdny" : "4 týdny"}
                      </button>
                    ))}
                    <label className="ml-auto inline-flex min-h-11 cursor-pointer items-center gap-2 text-small font-semibold text-green">
                      <input type="checkbox" checked={rotate} onChange={(e) => setRotate(e.target.checked)} className="size-4.5 accent-green" />
                      Střídat druhy masa
                    </label>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <p className="flex flex-col">
                    <span className="font-display text-[44px] leading-none font-black text-green">
                      {formatPrice(plan.perDayCzk)} <span className="text-[20px] font-semibold">za den</span>
                    </span>
                    <span className="text-[15px] text-muted">{sub ? `dodávka ${formatPrice(plan.totalCzk)} každé ${days === 14 ? "2 týdny" : "4 týdny"}, zrušíte kdykoli` : `nákup celkem ${formatPrice(plan.totalCzk)}`}</span>
                  </p>
                  <div className="flex items-center gap-3">
                    <Image src={M("cerveny-taska")} alt="" width={90} height={96} className="hidden h-24 w-auto sm:block" aria-hidden />
                    <Button variant="action" size="lg" onClick={order} disabled={pending || plan.items.length === 0}>
                      {sub ? "Objednat pravidelně" : "Vložit do košíku"}
                    </Button>
                  </div>
                </div>
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
              </div>
            </div>

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
                        <span className="text-[17px] font-bold text-green">{title}</span>
                        <span className="text-small text-muted">{subtitle}</span>
                      </span>
                      {open ? <Minus className="size-5 text-green" strokeWidth={1.75} aria-hidden /> : <Plus className="size-5 text-green" strokeWidth={1.75} aria-hidden />}
                    </button>
                    {open && id === "proc" && (
                      <div className="pb-5">
                        <PlanCoverage plan={plan} />
                      </div>
                    )}
                    {open && id === "rozpis" && (
                      <div className="flex flex-col gap-2.5 px-1 pb-5">
                        <div className="overflow-x-auto rounded-card border border-line bg-white">
                          <table className="w-full min-w-[480px] text-[15px]">
                            <thead>
                              <tr className="text-left text-eyebrow text-muted uppercase">
                                <th className="px-3.5 py-2.5 font-semibold">Složka</th>
                                <th className="px-3.5 py-2.5 text-right font-semibold">Podíl</th>
                                <th className="px-3.5 py-2.5 text-right font-semibold">Denně</th>
                                <th className="px-3.5 py-2.5 text-right font-semibold">Týdně</th>
                              </tr>
                            </thead>
                            <tbody>
                              {bowlTargets(plan).map((t) => (
                                <tr key={t.key} className="border-t border-line">
                                  <td className="px-3.5 py-2.5">
                                    <span className="font-semibold text-ink">{t.label}</span>
                                    {t.hint && <span className="block text-[13px] text-muted">{t.hint}</span>}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-right text-muted">{t.pct == null ? "" : `${t.pct.toLocaleString("cs-CZ")} %`}</td>
                                  <td className="px-3.5 py-2.5 text-right font-bold text-green">{t.perDay}</td>
                                  <td className="px-3.5 py-2.5 text-right text-muted">{t.perWeek}</td>
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
            <p className="text-center text-[13px] text-muted">
              Energie podle FEDIAF, poměry složek podle obecných zásad syrového krmení. Orientační výpočet pro zdravé zvíře; mražené maso není kompletní krmivo. Štěně velkého plemene, březí nebo nemocné zvíře: poraďte se s veterinářem.
            </p>
            <p className="flex items-center justify-center gap-1.5 text-small text-muted">
              <Check className="size-4 text-green" strokeWidth={1.75} aria-hidden /> Plán se nikam neukládá, dokud neobjednáte.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

const ROLE: Record<string, string> = { zaklad: "Základ", ryba: "Ryba", kosti: "Masité kosti", rekreacni: "Na okusování", vnitrnosti: "Vnitřnosti", olej: "Olej", zelenina: "Zelenina", doplnek: "Doplněk", granule: "Granule" };

/** Velké číslo s tlačítky − a + a možností napsat hodnotu. */
function Stepper({ label, value, unit, onMinus, onPlus, onType, step = 1 }: { label: string; value: number; unit: string; onMinus: () => void; onPlus: () => void; onType: (v: number) => void; step?: number }) {
  const round = "flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-line bg-white text-green hover:border-muted";
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-panel border border-line bg-white p-5">
      <span className="text-[15px] font-semibold text-green">{label}</span>
      <div className="flex items-center gap-3.5">
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
            className="min-h-18 w-28 border-0 border-b-2 border-line bg-transparent text-center font-display text-[56px] font-black text-green [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-[22px] font-semibold text-green">{unit}</span>
        </label>
        <button type="button" onClick={onPlus} aria-label={`${label}: přidat`} className={round}>
          <Plus className="size-6" strokeWidth={1.75} aria-hidden />
        </button>
      </div>
    </div>
  );
}
