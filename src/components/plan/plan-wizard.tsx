"use client";

import { ArrowLeft, Armchair, Baby, Beef, Cat, Check, Dog, Footprints, MailCheck, Moon, Plus, Soup, Trophy, UtensilsCrossed, Wheat, X, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { clubStart, clubVerify } from "@/app/(shop)/registrace/actions";
import { deletePetById, savePetProfile } from "@/app/(shop)/ucet/actions";
import { FeedingSchedule, leftoverText } from "@/components/barf/feeding-schedule";
import { useCart } from "@/components/cart/cart-context";
import { Button } from "@/components/ui/button";
import { chipClass, fieldInput } from "@/components/ui/field";
import { Choice, ChoiceGrid, SideCards, WizardLabel, WizardLayout, WizardPanel } from "@/components/plan/wizard-ui";
import { ACTIVITY_LABEL, addonForRole, type AddonKey, BASE_ADDONS, BREEDS, CONDITION_LABEL, buildPlan, foodKind, recommendExtras, shelfDays, type Activity, type AnimalInput, type Condition, type Reco } from "@/lib/barf";
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

const STEPS = ["Pro koho", "Věk", "Váha", "Aktivita", "Krmení", "Nesmí", "Plán", "Účet"] as const;
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
      const st = JSON.parse(raw) as { pet: PetProfile; rawShare: AnimalInput["rawShare"]; addKibble: boolean; removed: string[]; swaps: Record<string, string>; addons?: Record<AddonKey, boolean>; days: Days; delivery: Delivery; oneTime: boolean };
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
      const obcas = Object.entries(everyNth).map(([slug, n]) => `${slug}:${n}`).join(",");
      router.push(`/pokladna?predplatne=${oneTime ? 0 : days}&dodani=${delivery}${!oneTime && obcas ? `&obcas=${encodeURIComponent(obcas)}` : ""}`);
    });
  }

  function sendCode() {
    setError(null);
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({ pet, rawShare, addKibble, removed, swaps, addons, days, delivery, oneTime }));
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
  const side = (
    <SideCards
      items={[
        { icon: "timer", title: "Hotovo za chvilku", text: "Sedm otázek, zhruba dvě minuty. Bez zbytečného složitování.", tone: "paper" },
        { icon: "soup", title: "Plán na míru", text: "Výsledkem je denní dávka, složení dodávky a cena za den.", tone: "cream" },
        { icon: "package", title: "Jak vám to vyhovuje", text: "Krmení můžete dostávat pravidelně, nebo si ho objednat jen jednou.", tone: "white" },
      ]}
      trust={
        <>
          <strong>Jdeme krok za krokem.</strong> Údaje zadáváte postupně, ať je plán přehledný. Nic se neukládá, dokud plán nedokončíte.
        </>
      }
    />
  );
  const panelProps = { step, total, stepLabel: STEPS[step - 1], onBack: step > 1 ? back : undefined, onReset: step > 1 ? reset : undefined, nextDisabled: !canNext };

  return (
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
  rawShare: AnimalInput["rawShare"];
  onBack: () => void;
  onContinue: () => void;
  cta: string;
}) {
  const r = plan.result;
  const totalKg = plan.items.reduce((s, i) => s + i.qty * i.product.weightGrams, 0) / 1000;
  const shipFree = shipping.freeFromCzk !== null && plan.totalCzk >= shipping.freeFromCzk;
  const bonusPts = subscription.pointsBonusPct > 0 && loyalty.enabled ? Math.round(((plan.totalCzk * subscription.pointsBonusPct) / 100) * (loyalty.redeemStep / loyalty.redeemValueCzk)) : 0;
  const seg = (on: boolean) => `flex-1 rounded-panel border-2 bg-white p-3 text-left transition-colors duration-300 ${on ? "border-green bg-paper ring-1 ring-green" : "border-line hover:border-muted"}`;
  const removedItems = plan.pool.filter((p) => removed.includes(p.slug));

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
      <div className="space-y-5">
        <div>
          <button type="button" onClick={onBack} className="mb-3.5 inline-flex items-center gap-1.5 text-small font-semibold text-muted hover:text-green">
            <ArrowLeft strokeWidth={1.75} className="size-4" aria-hidden /> Zpět na otázky
          </button>
          <p className="text-eyebrow text-green uppercase">Plán pro {firstAcc}</p>
          <h2 className="mt-1 font-display text-display-md text-green md:text-display-lg">
            {pet.name} potřebuje {r.dailyGrams} g {rawShare < 100 ? "syrového" : "syrové stravy"}
            {rawShare < 100 && r.kibbleGrams ? ` a ${r.kibbleGrams} g granulí` : ""} denně
          </h2>
          {rawShare < 100 && !r.kibbleGrams && <p className="mt-1 text-sm text-muted">Zbytek ({100 - rawShare} % energie, {r.kibbleKcal} kcal) doplní granule podle tabulky na obalu.</p>}
          <p className="mt-2 max-w-2xl text-sm text-muted">
            {SEX_LABEL[pet.species][pet.sex]}{pet.sex === "samice" && pet.reproduction === "brezi" ? ", březí" : pet.sex === "samice" && pet.reproduction === "kojici" ? ", kojící" : ""}, {pet.weightKg} kg: zhruba {r.pct} % váhy denně, ve {r.mealsPerDay === 1 ? "jedné porci" : r.mealsPerDay === 2 ? "dvou porcích" : `${r.mealsPerDay} porcích`}
            {r.mealsPerDay > 1 ? ` po ${Math.round(r.dailyGrams / r.mealsPerDay)} g` : ""}. Orientační dávka, po 2 až 4 týdnech {firstAcc} zvažte a plán upravíte v účtu.
          </p>
        </div>

        <div className="overflow-hidden rounded-panel border border-line bg-white shadow-card">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3">
            <h3 className="text-heading-md text-green">Dodávka na {days === 14 ? "2 týdny" : "4 týdny"}</h3>
            <span className="text-xs text-muted">{totalKg.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} kg · {days === 14 ? "v mrazáku zhruba jedna police" : "větší mrazák"}</span>
          </div>
          <ul className="divide-y divide-line text-sm">
            {plan.items.map((i) => {
              const alternatives = i.role === "zaklad" || i.role === "kosti" ? plan.pool.filter((p) => foodKind(p) === foodKind(i.product) && p.slug !== i.product.slug && !plan.items.some((x) => x.product.slug === p.slug)) : [];
              return (
                <li key={i.product.slug} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p>
                      <span className="font-semibold">{productName(i.product)}</span> <span className="text-muted">{formatWeight(i.product.weightGrams)}</span>
                    </p>
                    <p className="text-xs text-muted">
                      {i.why.toLowerCase().startsWith(ROLE_LABEL[i.role]) ? i.why : `${ROLE_LABEL[i.role]}, ${i.why}`}
                      {leftoverText(i) && <> · {leftoverText(i)}</>}
                    </p>
                  </div>
                  <span className="text-xs text-muted">
                    {i.portionText}
                    {everyNth[i.product.slug] && <Durability item={i} every={everyNth[i.product.slug]} oneTime={oneTime} />}
                  </span>
                  <span className="w-12 text-right font-semibold">{i.qty} ks</span>
                  <span className="flex items-center gap-2 text-xs">
                    {alternatives.length > 0 && (
                      <select value={swaps[i.product.slug] ?? ""} onChange={(e) => setSwaps(e.target.value ? { ...swaps, [i.product.slug]: e.target.value } : Object.fromEntries(Object.entries(swaps).filter(([k]) => k !== i.product.slug)))} aria-label={`Nahradit ${productName(i.product)}`} className="min-h-8 w-auto py-0.5 text-xs">
                        <option value="">nahradit…</option>
                        {alternatives.map((a) => (
                          <option key={a.slug} value={a.slug}>
                            {productName(a)}
                          </option>
                        ))}
                      </select>
                    )}
                    <button type="button" onClick={() => (addonForRole(i.role) ? setAddon(i.role, false) : setRemoved([...removed, i.product.slug]))} className="text-brick-text underline">
                      odebrat
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
          {removedItems.length > 0 && (
            <p className="border-t border-line px-4 py-2 text-xs text-muted">
              Odebráno: {removedItems.map((p) => productName(p)).join(", ")}.{" "}
              <button type="button" onClick={() => setRemoved([])} className="text-brick-text underline">
                vrátit
              </button>
            </p>
          )}
        </div>
        {extras.length > 0 && (
          <section className="overflow-hidden rounded-panel border border-line bg-paper" aria-label="Doporučujeme navíc">
            <div className="border-b border-line px-4 py-3">
              <h3 className="text-heading-md text-green">Doporučujeme navíc</h3>
              <p className="text-xs text-muted">Vybráno tak, aby se balení za {days === 14 ? "2 týdny" : "4 týdny"} spotřebovalo celé nebo z co největší části. Co přidáte, zapadne do dávky místo části mixu.</p>
            </div>
            <ul className="divide-y divide-line text-sm">
              {extras.map((i) => (
                <li key={i.product.slug} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p>
                      <span className="text-eyebrow text-muted uppercase">{EXTRA_LABEL[i.role]}</span> <span className="font-semibold">{productName(i.product)}</span> <span className="text-muted">{formatWeight(i.product.weightGrams)}</span>
                    </p>
                    <p className="text-xs text-muted">
                      {i.portionText}
                      {i.why ? `, ${i.why}` : ""} · {i.qty} ks{i.periods > 1 ? `, vydrží ~${i.periods} dodávky` : ""}
                    </p>
                  </div>
                  <span className="font-semibold text-green tabular-nums">{formatPrice(i.qty * i.product.priceCzk)}</span>
                  <Button type="button" variant="secondary" onClick={() => setAddon(i.role, true)} aria-label={`Přidat ${productName(i.product)} do dodávky`}>
                    <Plus className="size-4" strokeWidth={2} aria-hidden /> Přidat
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}
        <details className="rounded-panel border border-line bg-white p-4 shadow-card">
          <summary className="cursor-pointer text-button text-green">Rozpis krmení po dnech: které balení kdy načít</summary>
          <div className="mt-3">
            <FeedingSchedule plan={plan} />
          </div>
        </details>
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

      <aside className="h-fit rounded-panel bg-paper p-5 lg:sticky lg:top-5">
        <p className="text-eyebrow text-green uppercase">Cena za den</p>
        <p className="text-display-lg text-green">{formatPrice(plan.perDayCzk)}</p>
        <p className="mt-1 text-xs text-muted">
          {formatPrice(plan.totalCzk)} za dodávku na {days === 14 ? "2 týdny" : "4 týdny"}
          {delivery === "rozvoz" ? (shipFree ? " · rozvoz zdarma" : ` · rozvoz ${formatPrice(shipping.rozvozPriceCzk)}`) : " · odběr v prodejně zdarma"}
        </p>

        <p className="mt-4 mb-1.5 text-label text-green">Jak často</p>
        <div className="flex gap-2">
          {([14, 28] as Days[]).map((d) => (
            <button key={d} type="button" onClick={() => { setDays(d); setOneTime(false); }} aria-pressed={days === d && !oneTime} className={seg(days === d && !oneTime)}>
              <span className="block text-sm font-semibold">{d === 14 ? "Každé 2 týdny" : "Každé 4 týdny"}</span>
              <span className="block text-xs text-muted">{d === 14 ? "menší balík, jedna police" : "větší balík, méně dodávek"}</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setOneTime(!oneTime)} aria-pressed={oneTime} className={`${seg(oneTime)} mt-2 w-full`}>
          <span className="block text-sm font-semibold">Jen jednou</span>
          <span className="block text-xs text-muted">balík na {days === 14 ? "2 týdny" : "4 týdny"}, bez dalších dodávek</span>
        </button>

        <p className="mt-4 mb-1.5 text-label text-green">Dodání</p>
        <div className="flex gap-2">
          {shipping.rozvoz && (
            <button type="button" onClick={() => setDelivery("rozvoz")} aria-pressed={delivery === "rozvoz"} className={seg(delivery === "rozvoz")}>
              <span className="block text-sm font-semibold">Rozvoz</span>
              <span className="block text-xs text-muted">{shipping.freeFromCzk !== null ? `zdarma od ${formatPrice(shipping.freeFromCzk)}` : formatPrice(shipping.rozvozPriceCzk)}</span>
            </button>
          )}
          {shipping.odber && (
            <button type="button" onClick={() => setDelivery("odber")} aria-pressed={delivery === "odber"} className={seg(delivery === "odber")}>
              <span className="block text-sm font-semibold">Vyzvednu v prodejně</span>
              <span className="block text-xs text-muted">v otevírací době</span>
            </button>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-brick-text">
            {error}
          </p>
        )}
        <Button type="button" variant="action" size="lg" onClick={onContinue} disabled={pending || plan.items.length === 0} className="mt-4 w-full">
          {pending ? "Ukládám…" : cta}
        </Button>
        <p className="mt-2 text-center text-xs text-muted">
          {oneTime ? "Jednorázová objednávka. Pravidelné dodávky si můžete nastavit kdykoli později v účtu." : "Bez závazku: dodávku přeskočíte, změníte nebo zrušíte kdykoli v účtu. Platíte za každou zvlášť."}
          {!oneTime && bonusPts > 0 && ` Za každou dodávku ${bonusPts} Kostiček navíc.`}
          {club.petPoints > 0 && ` Za profil ${first} ${club.petPoints} Kostiček.`}
        </p>
      </aside>
    </div>
  );
}

/**
 * Poznámka k položce, která vydrží déle než dodávka: kolik dní, případně že balení nestihne spotřebovat
 * před koncem trvanlivosti (a kolik z něj využije), a že do dalších dodávek jde jen občas.
 */
function Durability({ item, every, oneTime }: { item: Reco; every: number; oneTime: boolean }) {
  const lasts = Math.round((item.qty * item.product.weightGrams) / item.gramsPerDay);
  const shelf = shelfDays(item.product);
  const usedPct = Math.min(100, Math.round((shelf / lasts) * 100));
  const frozen = item.product.storage === "mrazene";
  return (
    <span className="block text-brick-text">
      {lasts > shelf ? (
        <>
          vydrží ~{lasts} dní, ale {frozen ? "zmrazené" : "po otevření"} spotřebujte do ~{shelf} dní (využijete asi {usedPct} % balení)
          {!oneTime ? `, proto jen každou ${every}. dodávku` : ""}
        </>
      ) : (
        <>
          vydrží ~{lasts} dní{!oneTime ? `, pak jen každou ${every}. dodávku` : ""}
        </>
      )}
    </span>
  );
}
