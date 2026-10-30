"use client";

import { ArrowLeft, Armchair, Baby, Beef, CalendarDays, Cat, Check, ChevronDown, Dog, Footprints, MailCheck, Moon, Plus, Soup, Trophy, UtensilsCrossed, Wheat, X, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { clubStart, clubVerify } from "@/app/(shop)/registrace/actions";
import { deletePetById, savePetProfile } from "@/app/(shop)/ucet/actions";
import { FeedingSchedule, leftoverText } from "@/components/barf/feeding-schedule";
import { useCart } from "@/components/cart/cart-context";
import { savePlan } from "@/lib/cart-plan";
import { ProductImage } from "@/components/product/product-image";
import { Button } from "@/components/ui/button";
import { chipClass, fieldInput } from "@/components/ui/field";
import { PlanSide } from "@/components/plan/plan-side";
import { Choice, ChoiceGrid, WizardLabel, WizardLayout, WizardPanel, WizardSteps } from "@/components/plan/wizard-ui";
import { ACTIVITY_LABEL, addonForRole, calculate, type AddonKey, BASE_ADDONS, BREEDS, CONDITION_LABEL, buildPlan, foodKind, recommendExtras, shelfDays, type Activity, type AnimalInput, type Condition, type Reco } from "@/lib/barf";
import { MEAT_LABEL, MEATS, type MeatKey, type Product, productName } from "@/lib/catalog";
import { emptyPet, FEEDING_LABEL, type FeedingNow, type PetProfile, petToAnimal, REPRODUCTION_LABEL, type Reproduction, SEX_LABEL, stageFor } from "@/lib/club";
import { type Pad, type Sex, sklonuj } from "@/lib/jmena";
import { formatPrice, formatWeight } from "@/lib/format";
import type { Settings } from "@/lib/settings";

type Props = {
  products: Product[];
  club: Settings["club"];
  subscription: Settings["subscription"];
  loyalty: Settings["loyalty"];
  shipping: { rozvoz: boolean; odber: boolean; freeFromCzk: number | null; rozvozPriceCzk: number };
  /** Přihlášený zákazník: krok s e-mailem se přeskočí. */
  user: { email: string; name: string } | null;
  /** Zvířata v účtu: dají se vybrat místo vyplňování. */
  pets: PetProfile[];
  /** Ilustrace druhů masa (jen ty, které existují). */
  meatImages: Partial<Record<MeatKey, string>>;
};

const STEPS = ["Pro koho", "Věk", "Váha", "Pohyb", "Miska", "Nesmí", "Plán", "Účet"] as const;
/** Kroky v krokovači nad průvodcem (účet je až za plánem, do krokovače nepatří). */
const SHOWN_STEPS = STEPS.slice(0, 7);
type Days = 14 | 28;
type Delivery = "rozvoz" | "odber";
type AgeUnit = "mesice" | "roky";
/** Rozpracovaný průvodce, aby po přihlášení odkazem z e-mailu šlo pokračovat u plánu. */
const STORE_KEY = "dokosti-plan";

/** Jméno ve správném pádu, bez jména „váš pes / vaše kočka“. */
function petName(name: string, species: PetProfile["species"], sex: Sex, pad: Pad): string {
  const first = name.trim().split(" ")[0];
  if (first) return sklonuj(first, sex, pad);
  const dog = species === "pes";
  return pad === "dat" ? (dog ? "vašemu psovi" : "vaší kočce") : pad === "acc" ? (dog ? "vašeho psa" : "vaši kočku") : dog ? "váš pes" : "vaše kočka";
}
const ROLE_LABEL: Record<Reco["role"], string> = { zaklad: "základ", ryba: "rybí den", kosti: "kost navíc", rekreacni: "na okusování", vnitrnosti: "vnitřnosti", olej: "olej", zelenina: "zelenina", doplnek: "doplněk", granule: "granule" };
const EXTRA_LABEL: Partial<Record<Reco["role"], string>> = { kosti: "Masité kosti", ryba: "Rybí den", vnitrnosti: "Vnitřnosti", olej: "Olej", zelenina: "Zelenina", doplnek: "Doplněk", rekreacni: "Na okusování" };

/** Datum narození zpětně z věku (měsíce nebo roky), přibližně na začátek měsíce. */
function bornFrom(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

/**
 * Průvodce „Krmení na míru“: sedm otázek, plán s cenou za den, pravidelné dodávky.
 * Výpočet je stejný jako v kalkulačce (petToAnimal → buildPlan), profil zvířete se uloží do účtu.
 */
export function PlanWizard({ products, club, subscription, loyalty, shipping, user, pets: initialPets, meatImages }: Props) {
  const router = useRouter();
  const cart = useCart();
  const [pets, setPets] = useState<PetProfile[]>(initialPets);
  const [step, setStep] = useState(1);
  const [pet, setPet] = useState<PetProfile>(() => emptyPet("pes"));
  const [petId, setPetId] = useState<string | undefined>(undefined);
  const [ageUnit, setAgeUnit] = useState<AgeUnit>("roky");
  const [ageValue, setAgeValue] = useState("");
  const [days, setDays] = useState<Days>(14);
  const [delivery, setDelivery] = useState<Delivery>(shipping.rozvoz ? "rozvoz" : "odber");
  const [removed, setRemoved] = useState<string[]>([]);
  const [swaps, setSwaps] = useState<Record<string, string>>({});
  /** Doplňky k základu (kosti, ryba, olej…): v dodávce jen to, co si zákazník přidá z doporučení. */
  const [addons, setAddons] = useState<Record<AddonKey, boolean>>({ ...BASE_ADDONS });
  /** Podíl syrové stravy (zbytek granule) a zda přidat naše granule do dodávky. */
  const [rawShare, setRawShare] = useState<AnimalInput["rawShare"]>(100);
  const [addKibble, setAddKibble] = useState(true);
  /** Jen jednou = bez předplatného. */
  const [oneTime, setOneTime] = useState(false);
  /** Předplatné: střídat druhy masa (dodávka A a B) a e-mail s náhledem dodávky předem. */
  const [rotate, setRotate] = useState(false);
  const [preview, setPreview] = useState(true);
  /** Dodávka B: původní mix → náhrada, kterou si zákazník vybral (jinak se vybere sama). */
  const [swapsB, setSwapsB] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Krok 8: účet
  const [owner, setOwner] = useState({ name: "", email: "", terms: false, marketing: false });
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const isDog = pet.species === "pes";
  const first = petName(pet.name, pet.species, pet.sex, "nom");
  const firstDat = petName(pet.name, pet.species, pet.sex, "dat");
  const firstAcc = petName(pet.name, pet.species, pet.sex, "acc");
  /** Věk v měsících z aktuálního zadání a z něj životní fáze (štěně, dospělý, senior). */
  const ageM = Number(ageValue) > 0 ? (ageUnit === "mesice" ? Number(ageValue) : Math.round(Number(ageValue) * 12)) : null;
  const stage = stageFor(pet.species, ageM);

  // Po přihlášení odkazem z e-mailu pokračujeme u plánu, ne od začátku.
  useEffect(() => {
    if (!user) return;
    try {
      const raw = sessionStorage.getItem(STORE_KEY);
      if (!raw) return;
      sessionStorage.removeItem(STORE_KEY);
      const st = JSON.parse(raw) as { pet: PetProfile; rawShare: AnimalInput["rawShare"]; addKibble: boolean; removed: string[]; swaps: Record<string, string>; addons?: Record<AddonKey, boolean>; days: Days; delivery: Delivery; oneTime: boolean; rotate?: boolean; preview?: boolean; swapsB?: Record<string, string> };
      if (!st.pet?.name) return;
      // Obnova rozpracovaného průvodce po návratu z e-mailu: stav se musí nastavit až na klientovi.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPet(st.pet);
      setRawShare(st.rawShare);
      setAddKibble(st.addKibble);
      setRemoved(st.removed);
      setSwaps(st.swaps);
      setAddons({ ...BASE_ADDONS, ...(st.addons ?? {}) });
      setDays(st.days);
      setDelivery(st.delivery);
      setOneTime(st.oneTime);
      setRotate(Boolean(st.rotate));
      setPreview(st.preview !== false);
      setSwapsB(st.swapsB ?? {});
      setStep(7);
    } catch {
      /* rozbité nebo chybějící úložiště: začneme od začátku */
    }
  }, [user]);
  const total = user ? 7 : 8;
  const next = () => {
    setError(null);
    setStep((s) => Math.min(s + 1, total));
  };
  const back = () => {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  };

  const input = useMemo<AnimalInput | null>(() => {
    if (step < 7 || pet.weightKg <= 0) return null;
    return { ...petToAnimal(pet), rawShare, addons: { ...addons, granule: addKibble }, removed, swaps };
  }, [step, pet, removed, swaps, rawShare, addons, addKibble]);
  const plan = useMemo(() => (input ? buildPlan(products, input, days) : null), [input, products, days]);
  /* Doporučení navíc: pro každý vypnutý doplněk nejlepší produkt podle využití balení a výhodnosti. */
  const extras = useMemo(() => (input ? recommendExtras(products, input, days) : []), [input, products, days]);
  const setAddon = (role: Reco["role"], on: boolean) => {
    const key = addonForRole(role);
    if (key) setAddons((a) => ({ ...a, [key]: on }));
  };

  /**
   * Položky, které vydrží déle než interval (olej, kosti navíc): v dalších dodávkách jen každou N.
   * Strop je trvanlivost balení (`shelfDays`): co by vydrželo déle, stejně musí zákazník spotřebovat dřív.
   */
  const everyNth = useMemo(() => {
    const out: Record<string, number> = {};
    if (!plan) return out;
    for (const i of plan.items) {
      // Balení na víc nákupů (olej, sáček kostí): v dalších dodávkách jen každou N., nejvýš po dobu trvanlivosti.
      const every = Math.min(12, i.periods, Math.max(1, Math.floor(shelfDays(i.product) / days)));
      if (every >= 2) out[i.product.slug] = every;
    }
    return out;
  }, [plan, days]);

  /**
   * Dodávka B pro střídání masa: každý mix z plánu nahradí jiný stejného typu, který v dodávce A není
   * (raději jiné maso a stejná gramáž balení). Množství se přepočítá podle energie nových mixů.
   */
  const rotation = useMemo(() => {
    if (!rotate || oneTime || !input || !plan) return null;
    const originals = buildPlan(products, { ...input, swaps: {} }, days).items.filter((i) => i.role === "zaklad").map((i) => i.product);
    const inA = new Set(plan.items.map((i) => i.product.slug));
    const meatsA = new Set(plan.items.filter((i) => i.role === "zaklad").flatMap((i) => i.product.meats ?? []));
    const map: Record<string, string> = {};
    const taken = new Set<string>();
    for (const o of originals) {
      const cands = plan.pool.filter((p) => foodKind(p) === foodKind(o) && !inA.has(p.slug) && !taken.has(p.slug));
      const score = (p: Product) => (p.weightGrams === o.weightGrams ? 2 : 0) + ((p.meats ?? []).some((m) => meatsA.has(m)) ? 0 : 1);
      const pick = cands.find((c) => c.slug === swapsB[o.slug]) ?? [...cands].sort((a, b) => score(b) - score(a))[0];
      if (pick) {
        map[o.slug] = pick.slug;
        taken.add(pick.slug);
      }
    }
    if (!Object.keys(map).length) return null;
    const planB = buildPlan(products, { ...input, swaps: { ...input.swaps, ...map } }, days);
    const qa = new Map(plan.items.map((i) => [i.product.slug, i.qty]));
    const qb = new Map(planB.items.map((i) => [i.product.slug, i.qty]));
    const aOnly = plan.items.filter((i) => qb.get(i.product.slug) !== i.qty && !everyNth[i.product.slug]).map((i) => i.product.slug);
    const b = planB.items.filter((i) => qa.get(i.product.slug) !== i.qty && !everyNth[i.product.slug]);
    if (!b.length) return null;
    // B produkt → původní mix (pro výběr náhrady v záložce B)
    const origOf = Object.fromEntries(Object.entries(map).map(([o, x]) => [x, o]));
    return { plan: planB, aOnly, b, origOf };
  }, [rotate, oneTime, input, plan, products, days, swapsB, everyNth]);

  function pickPet(p: PetProfile) {
    setPet(p);
    setPetId(p.id);
    setRemoved([]);
    setSwaps({});
    setStep(7);
  }
  /** Smazání profilu z účtu přímo z průvodce (s potvrzením). */
  function removePet(p: PetProfile) {
    if (!p.id || !window.confirm(`Smazat profil ${p.name || "zvířete"} z účtu?`)) return;
    const id = p.id;
    startTransition(async () => {
      const res = await deletePetById(id);
      if (!res.ok) return setError("Profil se nepodařilo smazat.");
      setPets((list) => list.filter((x) => x.id !== id));
      if (petId === id) setPetId(undefined);
    });
  }

  /** Uloží profil, naplní košík plánem a přejde do pokladny s předplatným. */
  function finish() {
    if (!plan) return;
    setError(null);
    startTransition(async () => {
      const saved = await savePetProfile({ ...pet, note: pet.note || "Plán z průvodce Krmení na míru" }, petId);
      if (!saved.ok) return setError(saved.error);
      cart.clear();
      plan.items.forEach((r) => cart.add(r.product.slug, r.qty));
      // Plán se uloží vedle košíku: když si zákazník cestou přidá pamlsky, předplatné z plánu v pokladně zůstane.
      const daily = plan.items.filter((i) => i.role === "zaklad").reduce((n, i) => n + i.gramsPerDay, 0);
      savePlan({
        forName: petName(pet.name, pet.species, pet.sex, "acc"),
        intervalDays: oneTime ? 0 : days,
        delivery,
        lines: plan.items.map((r) => ({ slug: r.product.slug, qty: r.qty })),
        once: oneTime ? {} : everyNth,
        aOnly: rotation && !oneTime ? rotation.aOnly : [],
        b: rotation && !oneTime ? rotation.b.map((i) => ({ slug: i.product.slug, qty: i.qty, name: productName(i.product) })) : [],
        dailyGrams: daily > 0 ? Math.round(daily) : undefined,
        preview,
      });
      router.push(`/pokladna?predplatne=${oneTime ? 0 : days}&dodani=${delivery}`);
    });
  }

  function sendCode() {
    setError(null);
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({ pet, rawShare, addKibble, removed, swaps, addons, days, delivery, oneTime, rotate, preview, swapsB }));
    } catch {
      /* bez úložiště jen nepůjde pokračovat po kliknutí na odkaz z e-mailu */
    }
    startTransition(async () => {
      const res = await clubStart({ name: owner.name, email: owner.email, cardCode: "", terms: owner.terms, marketingEmail: owner.marketing, kiosk: false, next: "/krmeni-na-miru" });
      if (!res.ok) return setError(res.error);
      if (res.state === "done") return finish();
      setCodeSent(true);
      setCooldown(60);
    });
  }
  function verifyCode() {
    setError(null);
    startTransition(async () => {
      const res = await clubVerify(owner.email, code, false);
      if (!res.ok) return setError(res.error);
      finish();
    });
  }

  const canNext = step === 1 ? pet.name.trim().length > 0 : step === 2 ? Number(ageValue) > 0 : step === 3 ? pet.weightKg > 0 : step === 5 ? Boolean(pet.feedingNow) : true;
  const reset = () => {
    setStep(1);
    setPet(emptyPet("pes"));
    setPetId(undefined);
    setAgeValue("");
    setAgeUnit("roky");
    setRemoved([]);
    setSwaps({});
    setAddons({ ...BASE_ADDONS });
    setRawShare(100);
    setError(null);
  };
  /** Věk z karty: štěně v měsících (doplní zákazník), dospělý zhruba 3 roky, senior podle druhu. */
  const pickStage = (s: "mlade" | "dospely" | "senior") => {
    if (s === "mlade") {
      setAgeUnit("mesice");
      if (ageUnit !== "mesice" || Number(ageValue) > 24) setAgeValue("");
    } else {
      setAgeUnit("roky");
      const years = Number(ageUnit === "roky" ? ageValue : 0);
      const seniorFrom = isDog ? 7 : 11;
      if (s === "dospely" && !(years >= 1 && years < seniorFrom)) setAgeValue("3");
      if (s === "senior" && !(years >= seniorFrom)) setAgeValue(String(seniorFrom + 1));
    }
  };
  // Odhad denní dávky do bočního panelu a mobilní lišty: stejný výpočet jako plán, jakmile známe váhu.
  const estimate = useMemo(() => {
    if (!(pet.weightKg > 0)) return null;
    try {
      const r = calculate({ ...petToAnimal({ ...pet, bornOn: ageM !== null ? bornFrom(ageM) : pet.bornOn }), rawShare });
      return r.dailyGrams > 0 ? { grams: Math.round(r.dailyGrams / 10) * 10, pct: r.pct } : null;
    } catch {
      return null;
    }
  }, [pet, ageM, rawShare]);
  const side = <PlanSide pet={pet} ageMonths={ageM} step={step} grams={estimate?.grams ?? null} pct={estimate?.pct ?? null} firstAcc={firstAcc} />;
  const mobileBar = (
    <>
      <p className="truncate text-[12px]/[18px]">{pet.name.trim() ? `${pet.name.trim()}${pet.weightKg > 0 ? `, ${pet.weightKg.toLocaleString("cs-CZ")} kg` : ""} · zatím` : "Odhad dávky"}</p>
      <p className="text-[22px]/[28px] font-extrabold">{estimate ? `~${estimate.grams} g denně` : "po zadání váhy"}</p>
    </>
  );
  const panelProps = { step, total: step <= 7 ? 7 : undefined, stepLabel: STEPS[step - 1], onBack: step > 1 ? back : undefined, onReset: step > 1 ? reset : undefined, nextDisabled: !canNext, hideProgress: true, mobileBar };

  return (
    <>
    <WizardSteps labels={SHOWN_STEPS} current={Math.min(step, 8) - 1} />
    <WizardLayout side={step === 7 ? undefined : side}>
      {step === 1 && (
        <WizardPanel {...panelProps} kicker="Nejdřív se poznáme" title="Pro koho plán děláme?" helper="Vyberte zvíře a napište nám, jak mu říkáte." onSubmit={next}>
          {pets.length > 0 && (
            <div className="mb-5 rounded-panel bg-paper p-4">
              <p className="mb-2 text-label text-green">Z vašeho účtu</p>
              <ul className="flex flex-wrap gap-1.25" aria-busy={pending}>
                {pets.map((p) => (
                  <li key={p.id} className="flex items-center">
                    <button type="button" onClick={() => pickPet(p)} className={chipClass(false, "rounded-r-none border-r-0")}>
                      Plán pro {petName(p.name, p.species, p.sex, "acc")}
                    </button>
                    <button type="button" onClick={() => removePet(p)} disabled={pending} aria-label={`Smazat profil ${p.name}`} title="Smazat profil" className={chipClass(false, "rounded-l-none px-2 text-muted hover:text-brick-text")}>
                      <X className="size-3.5" strokeWidth={2} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-small">Plán se přepočítá podle uložené váhy a věku. Křížkem profil z účtu smažete.</p>
            </div>
          )}
          <ChoiceGrid label="Zvíře">
            <Choice icon={Dog} title="Pes" desc="dávka podle váhy a aktivity" checked={isDog} onSelect={() => setPet({ ...pet, species: "pes" })} />
            <Choice icon={Cat} title="Kočka" desc="striktní masožravec" checked={!isDog} onSelect={() => setPet({ ...pet, species: "kocka" })} />
          </ChoiceGrid>
          <WizardLabel>Je to…</WizardLabel>
          <ChoiceGrid label="Pohlaví">
            {(["samec", "samice"] as const).map((sx) => (
              <Choice key={sx} compact title={SEX_LABEL[pet.species][sx]} checked={pet.sex === sx} onSelect={() => setPet({ ...pet, sex: sx, reproduction: sx === "samice" ? pet.reproduction : "" })} />
            ))}
          </ChoiceGrid>
          <WizardLabel htmlFor="plan-name" required>
            Jak se jmenuje?
          </WizardLabel>
          <input id="plan-name" value={pet.name} onChange={(e) => setPet({ ...pet, name: e.target.value })} placeholder={isDog ? "Třeba Rex" : "Třeba Micka"} maxLength={60} autoComplete="off" required className={fieldInput} />
          <p className="mt-2 text-small">Plán připravíme na jméno.</p>
        </WizardPanel>
      )}

      {step === 2 && (
        <WizardPanel
          {...panelProps}
          kicker="Věk"
          title={`Kolik je ${firstDat}?`}
          helper={isDog ? "Štěně počítáme podle měsíců a dospělé váhy, senior dostane o něco méně energie." : "Kotě počítáme podle měsíců, senior dostane o něco méně energie."}
          onSubmit={() => {
            if (ageM === null) return;
            setPet({ ...pet, bornOn: bornFrom(ageM) });
            next();
          }}
        >
          <ChoiceGrid cols={3} label="Věk">
            <Choice icon={Baby} title={isDog ? "Štěně" : "Kotě"} desc="do roka" checked={stage === "mlade" && ageUnit === "mesice"} onSelect={() => pickStage("mlade")} />
            <Choice icon={isDog ? Dog : Cat} title={pet.sex === "samice" ? "Dospělá" : "Dospělý"} desc={isDog ? "1 až 7 let" : "1 až 11 let"} checked={ageUnit === "roky" && stage !== "senior" && stage !== "mlade"} onSelect={() => pickStage("dospely")} />
            <Choice icon={Moon} title="Senior" desc={isDog ? "od 7 let" : "od 11 let"} checked={ageUnit === "roky" && stage === "senior"} onSelect={() => pickStage("senior")} />
          </ChoiceGrid>
          <WizardLabel htmlFor="plan-age" required={ageUnit === "mesice"}>
            {ageUnit === "mesice" ? "Věk v měsících" : "Přesnější věk v letech"}
          </WizardLabel>
          <input id="plan-age" type="number" inputMode="numeric" min={1} max={ageUnit === "mesice" ? 24 : 25} value={ageValue} onChange={(e) => setAgeValue(e.target.value)} placeholder={ageUnit === "mesice" ? "např. 4" : "např. 3"} className={`${fieldInput} max-w-xs`} />
          {stage === "mlade" && isDog && (
            <>
              <WizardLabel htmlFor="plan-breed">Plemeno (kvůli dospělé váze, nepovinné)</WizardLabel>
              <select id="plan-breed" value={pet.breed} onChange={(e) => setPet({ ...pet, breed: e.target.value })} className={fieldInput}>
                <option value="">Nevím / kříženec</option>
                {BREEDS.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name} (~{b.kg} kg)
                  </option>
                ))}
              </select>
            </>
          )}
          {pet.sex === "samice" && stage !== "mlade" && (
            <>
              <WizardLabel>Je {first} březí nebo kojí?</WizardLabel>
              <ChoiceGrid cols={3} label="Březost">
                {(
                  [
                    ["", "Ne"],
                    ["brezi", REPRODUCTION_LABEL[pet.species].brezi],
                    ["kojici", REPRODUCTION_LABEL[pet.species].kojici],
                  ] as [Reproduction, string][]
                ).map(([v, label]) => (
                  <Choice key={v} compact title={label} checked={pet.reproduction === v} onSelect={() => setPet({ ...pet, reproduction: v })} />
                ))}
              </ChoiceGrid>
              {pet.reproduction === "brezi" && (
                <>
                  <WizardLabel htmlFor="plan-week">Týden březosti (1 až 9)</WizardLabel>
                  <input id="plan-week" type="number" inputMode="numeric" min={1} max={9} value={pet.pregnancyWeek ?? ""} onChange={(e) => setPet({ ...pet, pregnancyWeek: Number(e.target.value) || undefined })} placeholder="např. 6" className={`${fieldInput} max-w-xs`} />
                </>
              )}
              {pet.reproduction && <p className="mt-2 text-small">Dávka se zvýší, u kojení podle počtu mláďat. Při potížích se poraďte s veterinářem.</p>}
            </>
          )}
        </WizardPanel>
      )}

      {step === 3 && (
        <WizardPanel {...panelProps} kicker="Váha a postava" title={`Kolik ${first} váží?`} helper="Při nadváze počítáme z cílové váhy, proto se ptáme i na postavu." onSubmit={next}>
          <WizardLabel htmlFor="plan-weight" required>
            Aktuální váha v kg
          </WizardLabel>
          <input id="plan-weight" type="number" inputMode="decimal" min={0.3} max={120} step={0.1} value={pet.weightKg || ""} onChange={(e) => setPet({ ...pet, weightKg: Number(e.target.value) || 0 })} placeholder="např. 20" className={`${fieldInput} max-w-xs`} />
          <WizardLabel>Jak vypadá</WizardLabel>
          <ChoiceGrid label="Kondice">
            {(Object.keys(CONDITION_LABEL) as Condition[]).map((c) => (
              <Choice key={c} compact title={CONDITION_LABEL[c]} checked={pet.condition === c} onSelect={() => setPet({ ...pet, condition: c })} />
            ))}
          </ChoiceGrid>
        </WizardPanel>
      )}

      {step === 4 && (
        <WizardPanel {...panelProps} kicker="Pohyb" title={`Jak je ${first} aktivní?`} helper="Klidné zvíře potřebuje o čtvrtinu méně než sportovní, kastrace ubírá zhruba 15 %." onSubmit={next}>
          <ChoiceGrid label="Aktivita">
            {(Object.keys(ACTIVITY_LABEL[pet.species]) as Activity[])
              .filter((a, i, arr) => arr.findIndex((x) => ACTIVITY_LABEL[pet.species][x] === ACTIVITY_LABEL[pet.species][a]) === i)
              .map((a, i) => (
                <Choice key={a} icon={[Armchair, Footprints, Zap, Trophy][i] ?? Footprints} title={ACTIVITY_LABEL[pet.species][a]} checked={pet.activity === a} onSelect={() => setPet({ ...pet, activity: a })} />
              ))}
          </ChoiceGrid>
          <WizardLabel>Kastrace</WizardLabel>
          <ChoiceGrid label="Kastrace">
            <Choice compact title={pet.sex === "samice" ? "Kastrovaná" : "Kastrovaný"} checked={pet.neutered} onSelect={() => setPet({ ...pet, neutered: true })} />
            <Choice compact title={pet.sex === "samice" ? "Nekastrovaná" : "Nekastrovaný"} checked={!pet.neutered} onSelect={() => setPet({ ...pet, neutered: false })} />
          </ChoiceGrid>
        </WizardPanel>
      )}

      {step === 5 && (
        <WizardPanel {...panelProps} kicker="Dnešní miska" title={`Co ${first} teď žere?`} helper="Když přecházíte z granulí, začneme jedním druhem masa a pošleme plán na první týdny." onSubmit={next}>
          <ChoiceGrid label="Co teď krmíte">
            {(Object.keys(FEEDING_LABEL) as Exclude<FeedingNow, "">[]).map((f, i) => (
              <Choice
                key={f}
                icon={[Wheat, Beef, Soup, UtensilsCrossed][i] ?? Soup}
                title={FEEDING_LABEL[f]}
                checked={pet.feedingNow === f}
                onSelect={() => {
                  setPet({ ...pet, feedingNow: f });
                  setRawShare(f === "granule" || f === "mix" ? 50 : 100);
                }}
              />
            ))}
          </ChoiceGrid>
          {(pet.feedingNow === "granule" || pet.feedingNow === "mix") && (
            <>
              <WizardLabel>Kolik syrového chcete krmit</WizardLabel>
              <ChoiceGrid label="Podíl syrového">
                {(
                  [
                    [100, "Úplně syrové", "granule vysadíme"],
                    [75, "Tři čtvrtiny", "granule jen občas"],
                    [50, "Půl na půl", "syrové a granule v jiných jídlech"],
                    [25, "Čtvrtina", "granule zůstávají základ"],
                  ] as [AnimalInput["rawShare"], string, string][]
                ).map(([v, label, hint]) => (
                  <Choice key={v} compact title={label} desc={hint} checked={rawShare === v} onSelect={() => setRawShare(v)} />
                ))}
              </ChoiceGrid>
              {rawShare < 100 && (
                <label className="mt-5 flex items-center justify-between gap-3 rounded-panel border border-line p-4">
                  <span>Přidat do dodávky i naše granule</span>
                  <input type="checkbox" checked={addKibble} onChange={(e) => setAddKibble(e.target.checked)} className="size-5 min-h-0 w-5 accent-green" />
                </label>
              )}
            </>
          )}
        </WizardPanel>
      )}

      {step === 6 && (
        <WizardPanel {...panelProps} kicker="Chutě a alergie" title={`Co ${first} nesmí nebo nemá rád?`} helper="Označte druhy masa, které vynecháme. Když nic, klidně pokračujte." onSubmit={next} nextLabel={pet.exclude.length ? "Sestavit plán" : "Nic, sestavit plán"}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {MEATS.map((m) => {
              const on = pet.exclude.includes(m);
              const img = meatImages[m];
              return (
                <button key={m} type="button" onClick={() => setPet({ ...pet, exclude: on ? pet.exclude.filter((x) => x !== m) : [...pet.exclude, m] })} aria-pressed={on} className={`flex items-center gap-2.5 rounded-panel border-2 bg-white p-2.5 text-left transition-colors duration-300 ${on ? "border-brick bg-paper line-through decoration-brick" : "border-line hover:border-muted"}`}>
                  <span className="relative size-10 shrink-0 overflow-hidden rounded-full bg-cream">{img && <Image src={img} alt="" fill sizes="40px" className="object-contain p-1" />}</span>
                  <span className="font-semibold text-green capitalize">{MEAT_LABEL[m]}</span>
                  {on && <Check strokeWidth={1.75} className="ml-auto size-4 text-brick-text" aria-hidden />}
                </button>
              );
            })}
          </div>
        </WizardPanel>
      )}

      {step === 7 && plan && (
        <PlanStep
          plan={plan}
          pet={pet}
          first={first}
          firstAcc={firstAcc}
          days={days}
          setDays={setDays}
          delivery={delivery}
          setDelivery={setDelivery}
          removed={removed}
          setRemoved={setRemoved}
          swaps={swaps}
          setSwaps={setSwaps}
          extras={extras}
          setAddon={setAddon}
          shipping={shipping}
          subscription={subscription}
          loyalty={loyalty}
          club={club}
          pending={pending}
          error={error}
          everyNth={everyNth}
          oneTime={oneTime}
          setOneTime={setOneTime}
          rotation={rotation}
          rotate={rotate}
          setRotate={setRotate}
          swapsB={swapsB}
          setSwapsB={setSwapsB}
          preview={preview}
          setPreview={setPreview}
          rawShare={rawShare}
          onBack={back}
          onContinue={() => (user ? finish() : next())}
          cta={user ? `Chci to takhle pro ${firstAcc}` : "Pokračovat k účtu"}
        />
      )}

      {step === 8 && !user && (
        <WizardPanel
          {...panelProps}
          kicker="Účet"
          title={codeSent ? "Opište kód z e-mailu" : "Kam plán poslat?"}
          helper={
            codeSent ? (
              <>
                Na <strong>{owner.email}</strong> jsme poslali šestimístný kód, platí několik minut. Když je v e-mailu jen tlačítko, klikněte na něj a vrátíme vás k plánu.
              </>
            ) : (
              <>
                Založíme vám účet a uložíme plán pro {firstAcc}, ať jde kdykoli upravit. Bez hesla, jen kód z e-mailu.
                {club.petPoints > 0 && ` Za profil zvířete ${club.petPoints} Kostiček`}
                {club.registrationPoints > 0 && `, za registraci ${club.registrationPoints}`}.
              </>
            )
          }
          onSubmit={() => (codeSent ? verifyCode() : sendCode())}
          nextLabel={pending ? (codeSent ? "Ověřuji…" : "Odesílám…") : codeSent ? "Dokončit a jít k dodání" : "Poslat kód a pokračovat"}
          nextDisabled={pending || (codeSent ? code.length !== 6 : !owner.terms)}
          error={error}
        >
          {!codeSent ? (
            <>
              <WizardLabel htmlFor="owner-name" required>
                Vaše jméno a příjmení
              </WizardLabel>
              <input id="owner-name" value={owner.name} onChange={(e) => setOwner({ ...owner, name: e.target.value })} required autoComplete="name" className={fieldInput} />
              <WizardLabel htmlFor="owner-email" required>
                E-mail
              </WizardLabel>
              <input id="owner-email" type="email" value={owner.email} onChange={(e) => setOwner({ ...owner, email: e.target.value })} required autoComplete="email" className={fieldInput} />
              <label className="mt-5 flex items-start gap-2.5 text-small">
                <input type="checkbox" checked={owner.terms} onChange={(e) => setOwner({ ...owner, terms: e.target.checked })} required className="mt-0.5 size-4 min-h-0 w-4 accent-green" />
                <span>
                  Souhlasím s{" "}
                  <Link href="/obchodni-podminky" target="_blank" className="text-brick-text underline">
                    obchodními podmínkami
                  </Link>{" "}
                  a beru na vědomí{" "}
                  <Link href="/ochrana-udaju" target="_blank" className="text-brick-text underline">
                    zpracování osobních údajů
                  </Link>
                  .
                </span>
              </label>
              <label className="mt-2.5 flex items-start gap-2.5 text-small">
                <input type="checkbox" checked={owner.marketing} onChange={(e) => setOwner({ ...owner, marketing: e.target.checked })} className="mt-0.5 size-4 min-h-0 w-4 accent-green" />
                <span>Posílejte mi tipy ke krmení a akce e-mailem.</span>
              </label>
              <p className="mt-5 text-small">
                Už máte účet?{" "}
                <Link href="/ucet/prihlaseni?next=/krmeni-na-miru" className="text-brick-text underline">
                  Přihlásit se
                </Link>
              </p>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3 rounded-panel bg-paper p-4">
                <MailCheck strokeWidth={1.75} className="mt-0.5 size-6 shrink-0 text-green" aria-hidden />
                <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" required autoFocus aria-label="Kód z e-mailu" className={`${fieldInput} max-w-xs text-center text-2xl tracking-[0.4em]`} />
              </div>
              <div className="mt-3.5 flex items-center justify-between text-small">
                <button type="button" onClick={sendCode} disabled={pending || cooldown > 0} className="text-brick-text underline disabled:no-underline disabled:opacity-60">
                  {cooldown > 0 ? `Poslat znovu (${cooldown} s)` : "Poslat kód znovu"}
                </button>
                <button type="button" onClick={() => setCodeSent(false)} className="text-muted hover:underline">
                  Opravit e-mail
                </button>
              </div>
            </>
          )}
        </WizardPanel>
      )}
    </WizardLayout>
    </>
  );
}

function PlanStep({
  plan,
  pet,
  first,
  firstAcc,
  days,
  setDays,
  delivery,
  setDelivery,
  removed,
  setRemoved,
  swaps,
  setSwaps,
  extras,
  setAddon,
  shipping,
  subscription,
  loyalty,
  club,
  pending,
  error,
  everyNth,
  oneTime,
  setOneTime,
  rotation,
  rotate,
  setRotate,
  swapsB,
  setSwapsB,
  preview,
  setPreview,
  rawShare,
  onBack,
  onContinue,
  cta,
}: {
  plan: ReturnType<typeof buildPlan>;
  pet: PetProfile;
  first: string;
  firstAcc: string;
  days: Days;
  setDays: (d: Days) => void;
  delivery: Delivery;
  setDelivery: (d: Delivery) => void;
  removed: string[];
  setRemoved: (r: string[]) => void;
  swaps: Record<string, string>;
  setSwaps: (s: Record<string, string>) => void;
  extras: Reco[];
  setAddon: (role: Reco["role"], on: boolean) => void;
  shipping: Props["shipping"];
  subscription: Settings["subscription"];
  loyalty: Settings["loyalty"];
  club: Settings["club"];
  pending: boolean;
  error: string | null;
  everyNth: Record<string, number>;
  oneTime: boolean;
  setOneTime: (v: boolean) => void;
  rotation: { plan: ReturnType<typeof buildPlan>; aOnly: string[]; b: Reco[]; origOf: Record<string, string> } | null;
  rotate: boolean;
  setRotate: (v: boolean) => void;
  swapsB: Record<string, string>;
  setSwapsB: (s: Record<string, string>) => void;
  preview: boolean;
  setPreview: (v: boolean) => void;
  rawShare: AnimalInput["rawShare"];
  onBack: () => void;
  onContinue: () => void;
  cta: string;
}) {
  const r = plan.result;
  const totalKg = plan.items.reduce((s, i) => s + i.qty * i.product.weightGrams, 0) / 1000;
  const shipFree = shipping.freeFromCzk !== null && plan.totalCzk >= shipping.freeFromCzk;
  const bonusPts = subscription.pointsBonusPct > 0 && loyalty.enabled ? Math.round(((plan.totalCzk * subscription.pointsBonusPct) / 100) * (loyalty.redeemStep / loyalty.redeemValueCzk)) : 0;
  const seg = (on: boolean) => `min-h-11 rounded-control border-2 px-2.5 py-2 text-center text-[13px]/[18px] font-bold transition-colors duration-300 ${on ? "border-green bg-paper text-green" : "border-line bg-white text-muted hover:border-muted"}`;
  const removedItems = plan.pool.filter((p) => removed.includes(p.slug));

  // Barvy produktů v misce a v kalendáři (stejné pořadí jako dodávka).
  const PALETTE = ["bg-green text-cream", "bg-brick text-white", "bg-muted text-white", "bg-ochre text-ink", "bg-olive text-white", "bg-ink text-white"];
  const mealItems = plan.items.filter((i) => ["zaklad", "ryba", "kosti", "vnitrnosti"].includes(i.role));
  const colorOf = (slug: string) => PALETTE[Math.max(0, mealItems.findIndex((i) => i.product.slug === slug)) % PALETTE.length];
  const mealKg = mealItems.reduce((s, i) => s + i.qty * i.product.weightGrams, 0) / 1000;
  // Zkratka do kalendáře: první písmeno, při shodě (kuře, králík, kachna) první dvě.
  const letterOf = (slug: string) => {
    const p = mealItems.find((i) => i.product.slug === slug)?.product;
    if (!p) return "?";
    const n = productName(p);
    const clash = mealItems.some((m) => m.product.slug !== slug && productName(m.product).charAt(0).toUpperCase() === n.charAt(0).toUpperCase());
    return clash ? n.charAt(0).toUpperCase() + n.charAt(1).toLowerCase() : n.charAt(0).toUpperCase();
  };
  const calendar = plan.schedule.map((d) => {
    const main = [...d.items].filter((x) => mealItems.some((m) => m.product.slug === x.product.slug)).sort((a, b) => b.grams - a.grams);
    return { day: d, main: main[0]?.product ?? null, extra: main.length > 1 };
  });
  const [showSchedule, setShowSchedule] = useState(false);
  const [tab, setTab] = useState<"A" | "B">("A");
  const shown = tab === "B" && rotation ? rotation.plan : plan;
  const meatsOf = (p: ReturnType<typeof buildPlan>) =>
    p.items
      .filter((i) => i.role === "zaklad")
      .map((i) => productName(i.product).replace(/\s+\d.*$/, "").toLowerCase())
      .join(", ");
  const period = days === 14 ? "2 týdny" : "4 týdny";
  const meals = r.mealsPerDay;
  return (
    <div className="lg:col-span-2">
      <section className="-mx-5 bg-paper px-5 py-10">
        <div className="mx-auto max-w-site">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-small font-semibold text-muted hover:text-green">
            <ArrowLeft strokeWidth={1.75} className="size-4" aria-hidden /> Zpět na otázky
          </button>
          <div className="mt-3.5 flex flex-wrap items-center gap-7.5">
            <span className="hidden size-30 shrink-0 items-center justify-center rounded-full bg-green text-cream sm:flex">
              {pet.species === "kocka" ? <Cat className="size-15" strokeWidth={1.5} aria-hidden /> : <Dog className="size-15" strokeWidth={1.5} aria-hidden />}
            </span>
            <div className="min-w-0 flex-1 basis-[400px]">
              <p className="text-eyebrow text-muted uppercase">Plán pro {firstAcc} je hotový</p>
              <h2 className="font-display text-display-lg text-green md:text-[64px]/[70px]">
                {pet.name.trim() || first} potřebuje {r.dailyGrams} g {rawShare < 100 ? "syrového" : ""} denně
                {rawShare < 100 && r.kibbleGrams ? ` a ${r.kibbleGrams} g granulí` : ""}
              </h2>
              <p className="mt-1">
                {SEX_LABEL[pet.species][pet.sex]}
                {pet.sex === "samice" && pet.reproduction === "brezi" ? ", březí" : pet.sex === "samice" && pet.reproduction === "kojici" ? ", kojící" : ""}, {pet.weightKg.toLocaleString("cs-CZ")} kg: zhruba {r.pct.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} % váhy denně. Po 2 až 4 týdnech {firstAcc} zvažte, dávku upravíte v účtu.
              </p>
              {rawShare < 100 && !r.kibbleGrams && <p className="mt-1 text-small">Zbytek ({100 - rawShare} % energie, {r.kibbleKcal} kcal) doplní granule podle tabulky na obalu.</p>}
            </div>
          </div>
          <ul className="mt-7.5 grid grid-cols-2 gap-3.5 md:grid-cols-4">
            <li className="rounded-card border border-line bg-white p-4.5 text-center">
              <p className="text-[22px]/[28px] md:text-[30px]/[36px] font-extrabold text-green">{r.dailyGrams} g</p>
              <p className="text-small">{rawShare < 100 ? "syrového denně" : "syrové stravy denně"}</p>
            </li>
            <li className="rounded-card border border-line bg-white p-4.5 text-center">
              <p className="text-[22px]/[28px] md:text-[30px]/[36px] font-extrabold text-green">{meals > 1 ? `${meals} × ${Math.round(r.dailyGrams / meals)} g` : `${r.dailyGrams} g`}</p>
              <p className="text-small">{meals === 1 ? "v jedné porci" : meals === 2 ? "ráno a večer" : `v ${meals} porcích`}</p>
            </li>
            <li className="rounded-card border border-line bg-white p-4.5 text-center">
              <p className="text-[22px]/[28px] md:text-[30px]/[36px] font-extrabold text-green">{totalKg.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} kg</p>
              <p className="text-small">dodávka na {period}</p>
            </li>
            <li className="rounded-card bg-green p-4.5 text-center text-cream">
              <p className="text-[22px]/[28px] md:text-[30px]/[36px] font-extrabold">{formatPrice(plan.perDayCzk)}</p>
              <p className="text-small">za den</p>
            </li>
          </ul>
        </div>
      </section>

      <div className="mx-auto mt-10 grid max-w-site items-start gap-7.5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-10">
          {mealItems.length > 0 && (
            <section>
              <h3 className="text-heading-lg text-green">Co bude v misce</h3>
              <p className="mt-1 mb-4 text-[15px]/[24px]">Podíl v dodávce na {period} podle hmotnosti.</p>
              <div className="flex h-6.5 overflow-hidden rounded-control" role="img" aria-label={mealItems.map((i) => `${productName(i.product)} ${Math.round(((i.qty * i.product.weightGrams) / 1000 / mealKg) * 100)} %`).join(", ")}>
                {mealItems.map((i) => (
                  <div key={i.product.slug} className={colorOf(i.product.slug).split(" ")[0]} style={{ width: `${((i.qty * i.product.weightGrams) / 1000 / mealKg) * 100}%` }} />
                ))}
              </div>
              <ul className="mt-2.5 flex flex-wrap gap-x-6 gap-y-1.5 text-[14px]/[22px]">
                {mealItems.map((i) => (
                  <li key={i.product.slug} className="inline-flex items-center gap-2">
                    <span className={`size-3 rounded-full ${colorOf(i.product.slug).split(" ")[0]}`} aria-hidden />
                    <b className="text-green">{Math.round(((i.qty * i.product.weightGrams) / 1000 / mealKg) * 100)} %</b> {productName(i.product).toLowerCase()}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-heading-lg text-green">Dodávka na {period}</h3>
              <span className="text-small">
                {totalKg.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} kg · {days === 14 ? "v mrazáku zhruba jedna police" : "větší mrazák"}
              </span>
            </div>
            {rotation && (
              <div className="mb-3.5 rounded-card bg-paper p-3.5">
                <p className="mb-2.5 text-[14px]/[22px]">
                  <b className="text-green">Druhy masa se střídají.</b> Dodávky jdou A, B, A, B. Ani jedna nemá maso, které {first} nesmí, a obě mají stejnou denní dávku.
                </p>
                <div role="tablist" aria-label="Sestava dodávky" className="inline-flex flex-wrap gap-1 rounded-control bg-white p-1">
                  {(["A", "B"] as const).map((t) => (
                    <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`min-h-12 rounded-control px-4 py-1.5 text-left text-[14px]/[18px] transition-colors duration-300 ${tab === t ? "bg-green text-cream" : "text-green hover:bg-paper"}`}>
                      <b className="block">Dodávka {t}</b>
                      <span className="text-[12px] font-semibold">{meatsOf(t === "A" ? plan : rotation.plan)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <ul className="flex flex-col gap-2.5">
              {shown.items.map((i) => {
                const inB = tab === "B" && rotation !== null;
                const origB = inB ? rotation.origOf[i.product.slug] : undefined;
                const alternatives =
                  (inB ? Boolean(origB) : i.role === "zaklad" || i.role === "kosti")
                    ? plan.pool.filter((p) => foodKind(p) === foodKind(i.product) && p.slug !== i.product.slug && !shown.items.some((x) => x.product.slug === p.slug) && !(inB && plan.items.some((x) => x.product.slug === p.slug)))
                    : [];
                const once = everyNth[i.product.slug];
                return (
                  <li key={i.product.slug} className="flex flex-wrap items-center gap-3.5 rounded-card border border-line bg-white p-3.5">
                    <div className="size-16 shrink-0 overflow-hidden rounded-control bg-cream">
                      <ProductImage product={i.product} sizes="64px" className="h-16" />
                    </div>
                    <div className="min-w-0 flex-1 basis-[220px]">
                      <span className="inline-block rounded-control bg-paper px-2 text-[11px]/[18px] font-bold tracking-wide text-green uppercase">
                        {ROLE_LABEL[i.role]}
                        {once ? " · jednorázově" : ""}
                      </span>
                      <p className="mt-1 text-[16px]/[22px] font-extrabold text-green">
                        {productName(i.product)}
                        {!/\d\s*(kg|g|ml|l)(?![a-zž])/i.test(productName(i.product)) && <span className="font-normal text-muted"> {formatWeight(i.product.weightGrams)}</span>}
                      </p>
                      <p className="text-[13px]/[20px]">
                        {i.portionText}
                        {i.why && !i.why.toLowerCase().startsWith(ROLE_LABEL[i.role]) ? ` · ${i.why}` : ""}
                        {leftoverText(i) && <> · {leftoverText(i)}</>}
                      </p>
                      {once && <Durability item={i} oneTime={oneTime} />}
                    </div>
                    <span className="w-12 text-right font-bold text-ink">{i.qty} ks</span>
                    <span className="w-18 text-right font-bold text-green tabular-nums">{formatPrice(i.qty * i.product.priceCzk)}</span>
                    <span className="flex basis-full items-center justify-end gap-3 text-[13px] sm:basis-auto">
                      {alternatives.length > 0 && (
                        <select
                          value={inB ? "" : (swaps[i.product.slug] ?? "")}
                          onChange={(e) => {
                            if (inB && origB) setSwapsB({ ...swapsB, [origB]: e.target.value });
                            else setSwaps(e.target.value ? { ...swaps, [i.product.slug]: e.target.value } : Object.fromEntries(Object.entries(swaps).filter(([k]) => k !== i.product.slug)));
                          }} aria-label={`Nahradit ${productName(i.product)}`} className="min-h-8 w-auto py-0.5 text-xs">
                          <option value="">Nahradit…</option>
                          {alternatives.map((a) => (
                            <option key={a.slug} value={a.slug}>
                              {productName(a)}
                            </option>
                          ))}
                        </select>
                      )}
                      <button type="button" onClick={() => (addonForRole(i.role) ? setAddon(i.role, false) : setRemoved([...removed, i.product.slug]))} className="font-semibold text-brick-text underline">
                        Odebrat
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
            {removedItems.length > 0 && (
              <p className="mt-2.5 text-small">
                Odebráno: {removedItems.map((p) => productName(p)).join(", ")}.{" "}
                <button type="button" onClick={() => setRemoved([])} className="text-brick-text underline">
                  vrátit
                </button>
              </p>
            )}
          </section>

          {extras.length > 0 && (
            <section aria-label="Doporučujeme navíc">
              <h3 className="text-heading-lg text-green">Doporučujeme navíc</h3>
              <p className="mt-1 mb-3.5 text-[15px]/[24px]">Co přidáte, zapadne do dávky místo části mixu. Co vydrží déle než jednu dodávku, přijde jen jednou.</p>
              <ul className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                {extras.map((i) => {
                  const lastsDays = i.gramsPerDay > 0 ? Math.round((i.qty * i.product.weightGrams) / i.gramsPerDay) : 0;
                  const lasting = i.periods > 1;
                  return (
                    <li key={i.product.slug} className="flex flex-col gap-1 rounded-card border-2 border-line bg-white p-3.5">
                      <div className="mb-1 overflow-hidden rounded-control bg-cream">
                        <ProductImage product={i.product} sizes="200px" className="h-27" />
                      </div>
                      <span className="text-[11px]/[18px] font-bold tracking-wide uppercase">{EXTRA_LABEL[i.role]}</span>
                      <span className="text-[16px]/[21px] font-extrabold text-green">
                        {productName(i.product)}
                        {!/\d\s*(kg|g|ml|l)(?![a-zž])/i.test(productName(i.product)) && <span className="font-normal text-muted"> {formatWeight(i.product.weightGrams)}</span>}
                      </span>
                      <span className="text-[13px]/[20px]">
                        {i.portionText}
                        {i.why ? `, ${i.why}` : ""}
                      </span>
                      <span className="mt-1 inline-flex items-center gap-1.5 text-[12px]/[18px] font-semibold text-green">
                        <CalendarDays className="size-3.5" strokeWidth={2} aria-hidden />
                        {lasting ? `Jednorázově · vydrží ${lastsDays >= 60 ? `asi ${Math.round(lastsDays / 30)} měsíců` : `asi ${lastsDays} dní`}` : "V každé dodávce"}
                      </span>
                      <span className="mt-auto flex items-center justify-between gap-2.5 pt-2">
                        <b className="text-[18px] text-green">{formatPrice(i.qty * i.product.priceCzk)}</b>
                        <Button type="button" variant="secondary" onClick={() => setAddon(i.role, true)} aria-label={`Přidat ${productName(i.product)} do dodávky`}>
                          <Plus className="size-4" strokeWidth={2} aria-hidden /> Přidat
                        </Button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {calendar.length > 0 && (
            <section className="rounded-card bg-paper p-6">
              <h3 className="text-heading-lg text-green">Které balení kdy načít</h3>
              <p className="mt-1 mb-4 text-[15px]/[24px]">Večer před krmením přendejte balení z mrazáku do lednice.</p>
              <ol className="grid grid-cols-7 gap-1" aria-label="Kalendář krmení">
                {calendar.map(({ day, main, extra }) => (
                  <li key={day.day} className="flex flex-col items-center gap-1" title={day.items.map((x) => productName(x.product)).join(", ")}>
                    <span className="text-[11px]/[14px] font-semibold">{day.weekday.slice(0, 2)}</span>
                    <span className={`flex h-10 w-full items-center justify-center rounded-control text-[13px] font-extrabold ${main ? colorOf(main.slug) : "bg-white text-muted"}`}>
                      {main ? letterOf(main.slug) : "–"}
                      {extra ? "+" : ""}
                    </span>
                  </li>
                ))}
              </ol>
              <ul className="mt-3 flex flex-wrap gap-x-4.5 gap-y-1.5 text-[13px]/[20px]">
                {mealItems.map((i) => (
                  <li key={i.product.slug} className="inline-flex items-center gap-1.5">
                    <span className={`size-2.5 rounded-xs ${colorOf(i.product.slug).split(" ")[0]}`} aria-hidden />
                    {letterOf(i.product.slug)} {productName(i.product).toLowerCase()}
                  </li>
                ))}
                <li>+ ten den i další balení</li>
              </ul>
              <button type="button" onClick={() => setShowSchedule(!showSchedule)} aria-expanded={showSchedule} className="mt-4.5 flex min-h-12 w-full items-center justify-between gap-2.5 rounded-control border border-green bg-white px-4 text-button text-green">
                {showSchedule ? "Skrýt podrobný rozpis" : "Zobrazit podrobný rozpis po dnech"}
                <ChevronDown className={`size-4.5 transition-transform duration-300 ${showSchedule ? "rotate-180" : ""}`} strokeWidth={2} aria-hidden />
              </button>
              {showSchedule && (
                <div className="mt-2.5 rounded-control border border-line bg-white p-4">
                  <FeedingSchedule plan={plan} />
                </div>
              )}
            </section>
          )}

          {plan.notes.length > 0 && (
            <ul className="space-y-1 text-sm text-muted">
              {plan.notes.map((n, idx) => (
                <li key={idx} className={n.kind === "warn" ? "text-brick-text" : ""}>
                  {n.text}
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="h-fit rounded-card border border-line bg-white p-6 shadow-card lg:sticky lg:top-5">
          <p className="text-eyebrow text-muted uppercase">Shrnutí</p>
          <p className="text-[40px]/[46px] font-extrabold text-green">{formatPrice(plan.totalCzk)}</p>
          <p className="mb-4.5 text-[13px]/[20px]">
            {rotation && !oneTime ? `první dodávka (A) · další B za ${formatPrice(rotation.plan.totalCzk)}` : `za dodávku na ${period}`} · {formatPrice(plan.perDayCzk)} za den
            {delivery === "rozvoz" ? (shipFree ? " · rozvoz zdarma" : ` · rozvoz ${formatPrice(shipping.rozvozPriceCzk)}`) : " · odběr v prodejně zdarma"}
          </p>
          <p className="mb-1.5 text-[15px]/[21px] font-semibold text-green">Jak často</p>
          <div className="mb-4 grid grid-cols-3 gap-1.5">
            {([14, 28] as Days[]).map((d) => (
              <button key={d} type="button" onClick={() => { setDays(d); setOneTime(false); }} aria-pressed={days === d && !oneTime} className={seg(days === d && !oneTime)}>
                {d === 14 ? "Každé 2 týdny" : "Každé 4 týdny"}
              </button>
            ))}
            <button type="button" onClick={() => setOneTime(true)} aria-pressed={oneTime} className={seg(oneTime)}>
              Jen jednou
            </button>
          </div>
          {!oneTime && (
            <div className="mb-4 flex flex-col gap-2">
              <Toggle on={rotate} onChange={(v) => { setRotate(v); setTab("A"); }} title="Střídat druhy masa" desc="každá druhá dodávka s jinými mixy" />
              <Toggle on={preview} onChange={setPreview} title="Ukázat dodávku předem" desc={`e-mail ${subscription.reminderDaysBefore} dny před dodávkou, můžete ji upravit`} />
            </div>
          )}
          <p className="mb-1.5 text-[15px]/[21px] font-semibold text-green">Dodání</p>
          <div className="grid grid-cols-2 gap-1.5">
            {shipping.rozvoz && (
              <button type="button" onClick={() => setDelivery("rozvoz")} aria-pressed={delivery === "rozvoz"} className={`${seg(delivery === "rozvoz")} text-left`}>
                <span className="block text-green">Rozvoz</span>
                <span className="block text-[12px]/[18px] font-normal text-muted">{shipping.freeFromCzk !== null ? `zdarma od ${formatPrice(shipping.freeFromCzk)}` : formatPrice(shipping.rozvozPriceCzk)}</span>
              </button>
            )}
            {shipping.odber && (
              <button type="button" onClick={() => setDelivery("odber")} aria-pressed={delivery === "odber"} className={`${seg(delivery === "odber")} text-left`}>
                <span className="block text-green">Vyzvednu</span>
                <span className="block text-[12px]/[18px] font-normal text-muted">v prodejně zdarma</span>
              </button>
            )}
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm text-brick-text">
              {error}
            </p>
          )}
          <Button type="button" variant="action" size="lg" onClick={onContinue} disabled={pending || plan.items.length === 0} className="mt-5 w-full">
            {pending ? "Ukládám…" : cta}
          </Button>
          <p className="mt-2.5 text-center text-[12px]/[19px] text-muted">
            {oneTime ? "Jednorázová objednávka. Pravidelné dodávky si můžete nastavit kdykoli později v účtu." : "Bez závazku: dodávku přeskočíte, změníte nebo zrušíte kdykoli v účtu."}
            {!oneTime && bonusPts > 0 && ` Za každou dodávku ${bonusPts} Kostiček navíc.`}
            {club.petPoints > 0 && ` Za profil ${first} ${club.petPoints} Kostiček.`}
          </p>
        </aside>
      </div>
    </div>
  );
}

/** Přepínač v souhrnu plánu (Střídat druhy masa, Ukázat dodávku předem). */
function Toggle({ on, onChange, title, desc }: { on: boolean; onChange: (v: boolean) => void; title: string; desc: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex items-start justify-between gap-3 rounded-control border border-line p-3 text-left hover:border-muted">
      <span>
        <b className="block text-[14px]/[20px] text-green">{title}</b>
        <span className="text-[12px]/[18px]">{desc}</span>
      </span>
      <span className={`relative mt-0.5 h-6 w-10.5 shrink-0 rounded-full transition-colors duration-300 ${on ? "bg-green" : "bg-line"}`} aria-hidden>
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow-card transition-[left] duration-300 ${on ? "left-5" : "left-0.5"}`} />
      </span>
    </button>
  );
}

/**
 * Poznámka k položce, která vydrží déle než dodávka: kolik dní, případně že balení nestihne spotřebovat
 * před koncem trvanlivosti (a kolik z něj využije), a že do dalších dodávek jde jen občas.
 */
function Durability({ item, oneTime }: { item: Reco; oneTime: boolean }) {
  const lasts = Math.round((item.qty * item.product.weightGrams) / item.gramsPerDay);
  const shelf = shelfDays(item.product);
  const usedPct = Math.min(100, Math.round((shelf / lasts) * 100));
  const frozen = item.product.storage === "mrazene";
  return (
    <span className="block text-brick-text">
      {lasts > shelf ? (
        <>
          vydrží ~{lasts} dní, ale {frozen ? "zmrazené" : "po otevření"} spotřebujte do ~{shelf} dní (využijete asi {usedPct} % balení)
          {!oneTime ? ", přijde jen v této dodávce" : ""}
        </>
      ) : (
        <>
          vydrží ~{lasts} dní{!oneTime ? ", přijde jen v této dodávce; až bude docházet, nabídneme ho v e-mailu" : ""}
        </>
      )}
    </span>
  );
}
