"use client";

import { ArrowLeft, Check, MailCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { clubStart, clubVerify } from "@/app/(shop)/registrace/actions";
import { savePetProfile } from "@/app/(shop)/ucet/actions";
import { useCart } from "@/components/cart/cart-context";
import { Button } from "@/components/ui/button";
import { ACTIVITY_LABEL, BREEDS, CONDITION_LABEL, buildPlan, DEFAULT_ADDONS, type Activity, type AnimalInput, type Condition, type Reco } from "@/lib/barf";
import { MEAT_LABEL, MEATS, type MeatKey, type Product, productName } from "@/lib/catalog";
import { emptyPet, FEEDING_LABEL, type FeedingNow, type PetProfile, petToAnimal } from "@/lib/club";
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
type AgeMode = "mlade" | "dospely" | "senior";
const ROLE_LABEL: Record<Reco["role"], string> = { zaklad: "základ", ryba: "rybí den", kosti: "kost navíc", rekreacni: "na okusování", vnitrnosti: "vnitřnosti", olej: "olej", zelenina: "zelenina", granule: "granule" };

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
export function PlanWizard({ products, club, subscription, loyalty, shipping, user, pets, meatImages }: Props) {
  const router = useRouter();
  const cart = useCart();
  const [step, setStep] = useState(1);
  const [pet, setPet] = useState<PetProfile>(() => emptyPet("pes"));
  const [petId, setPetId] = useState<string | undefined>(undefined);
  const [ageMode, setAgeMode] = useState<AgeMode>("dospely");
  const [ageValue, setAgeValue] = useState("");
  const [days, setDays] = useState<Days>(14);
  const [delivery, setDelivery] = useState<Delivery>(shipping.rozvoz ? "rozvoz" : "odber");
  const [removed, setRemoved] = useState<string[]>([]);
  const [swaps, setSwaps] = useState<Record<string, string>>({});
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
  const first = pet.name.trim().split(" ")[0] || (isDog ? "váš pes" : "vaše kočka");
  const total = user ? 7 : 8;
  const next = () => {
    setError(null);
    setStep((s) => Math.min(s + 1, total));
  };
  const back = () => {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  };

  const plan = useMemo(() => {
    if (step < 7 || pet.weightKg <= 0) return null;
    const input: AnimalInput = { ...petToAnimal(pet), rawShare, addons: { ...DEFAULT_ADDONS, granule: addKibble }, removed, swaps };
    return buildPlan(products, input, days);
  }, [step, pet, removed, swaps, products, days, rawShare, addKibble]);

  /** Položky, které vydrží déle než interval (olej, kosti navíc): v dalších dodávkách jen každou N. */
  const everyNth = useMemo(() => {
    const out: Record<string, number> = {};
    if (!plan) return out;
    for (const i of plan.items) {
      if (i.gramsPerDay <= 0) continue;
      const lasts = (i.qty * i.product.weightGrams) / i.gramsPerDay;
      if (lasts >= days * 2) out[i.product.slug] = Math.min(12, Math.floor(lasts / days));
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
    startTransition(async () => {
      const res = await clubStart({ name: owner.name, email: owner.email, cardCode: "", terms: owner.terms, marketingEmail: owner.marketing, kiosk: false });
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

  const box = "rounded-[var(--radius-card)] border border-line bg-paper p-5 md:p-6";
  const opt = (on: boolean) => `flex w-full items-center gap-3 rounded-[var(--radius-card)] border-2 p-4 text-left ${on ? "border-green bg-green text-cream" : "border-line bg-paper hover:border-green"}`;
  const sub = (on: boolean) => `block text-xs ${on ? "text-cream/80" : "text-muted"}`;
  const canNext = step === 1 ? pet.name.trim().length > 0 : step === 2 ? Number(ageValue) > 0 : step === 3 ? pet.weightKg > 0 : true;

  return (
    <div className={step === 7 ? "" : "mx-auto max-w-xl"}>
      <div className="mb-4 flex items-center justify-between text-sm">
        {step > 1 ? (
          <button type="button" onClick={back} className="inline-flex items-center gap-1 text-muted hover:text-green">
            <ArrowLeft strokeWidth={1.75} className="h-4 w-4" /> Zpět
          </button>
        ) : (
          <span />
        )}
        <span className="label text-[11px] text-muted">
          {step} / {total} · {STEPS[step - 1]}
        </span>
      </div>
      <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <div className="h-full bg-green transition-all" style={{ width: `${(step / total) * 100}%` }} />
      </div>

      {step === 1 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
          className={`${box} space-y-4`}
        >
          <h2 className="text-[26px]">Pro koho plán děláme?</h2>
          {pets.length > 0 && (
            <div className="rounded-[var(--radius-control)] border border-line bg-cream p-3 text-sm">
              <p className="label mb-2 text-[11px] text-muted">Z vašeho účtu</p>
              <div className="flex flex-wrap gap-2">
                {pets.map((p) => (
                  <button key={p.id} type="button" onClick={() => pickPet(p)} className="label inline-flex min-h-9 items-center rounded-full border border-green px-3 text-[11px] text-green hover:bg-green hover:text-cream">
                    Plán pro {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {(["pes", "kocka"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setPet({ ...pet, species: s })} aria-pressed={pet.species === s} className={opt(pet.species === s)}>
                <span className="font-display text-lg font-semibold">{s === "pes" ? "Pes" : "Kočka"}</span>
              </button>
            ))}
          </div>
          <label className="block">
            <span className="label mb-1 block text-[11px] text-muted">Jak se jmenuje</span>
            <input value={pet.name} onChange={(e) => setPet({ ...pet, name: e.target.value })} placeholder={isDog ? "např. Rex" : "např. Micka"} required autoFocus />
          </label>
          <Button type="submit" variant="action" className="w-full min-h-12" disabled={!canNext}>
            Pokračovat
          </Button>
        </form>
      )}

      {step === 2 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(ageValue);
            const months = ageMode === "mlade" ? n : Math.round(n * 12);
            setPet({ ...pet, bornOn: bornFrom(months) });
            next();
          }}
          className={`${box} space-y-4`}
        >
          <h2 className="text-[26px]">Kolik je {first === "váš pes" || first === "vaše kočka" ? first : first + "ovi"}?</h2>
          <div className="grid gap-2">
            {(
              [
                ["mlade", isDog ? "Štěně" : "Kotě", "do jednoho roku"],
                ["dospely", isDog ? "Dospělý pes" : "Dospělá kočka", "1 rok a víc"],
                ["senior", "Senior", isDog ? "zhruba od 7 let" : "zhruba od 11 let"],
              ] as [AgeMode, string, string][]
            ).map(([m, label, hint]) => (
              <button key={m} type="button" onClick={() => { setAgeMode(m); setAgeValue(""); }} aria-pressed={ageMode === m} className={opt(ageMode === m)}>
                <span>
                  <span className="font-semibold">{label}</span>
                  <span className={sub(ageMode === m)}>{hint}</span>
                </span>
              </button>
            ))}
          </div>
          <label className="block">
            <span className="label mb-1 block text-[11px] text-muted">{ageMode === "mlade" ? "Věk v měsících" : "Věk v letech"}</span>
            <input type="number" inputMode="numeric" min={ageMode === "mlade" ? 1 : 1} max={ageMode === "mlade" ? 12 : 25} value={ageValue} onChange={(e) => setAgeValue(e.target.value)} required autoFocus placeholder={ageMode === "mlade" ? "např. 4" : "např. 3"} />
          </label>
          {ageMode === "mlade" && isDog && (
            <label className="block">
              <span className="label mb-1 block text-[11px] text-muted">Plemeno (kvůli dospělé váze, nepovinné)</span>
              <select value={pet.breed} onChange={(e) => setPet({ ...pet, breed: e.target.value })}>
                <option value="">Nevím / kříženec</option>
                {BREEDS.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name} (~{b.kg} kg)
                  </option>
                ))}
              </select>
            </label>
          )}
          <Button type="submit" variant="action" className="w-full min-h-12" disabled={!canNext}>
            Pokračovat
          </Button>
        </form>
      )}

      {step === 3 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
          className={`${box} space-y-4`}
        >
          <h2 className="text-[26px]">Kolik {first} váží a jak vypadá?</h2>
          <label className="block">
            <span className="label mb-1 block text-[11px] text-muted">Aktuální váha (kg)</span>
            <input type="number" inputMode="decimal" min={0.3} max={120} step={0.1} value={pet.weightKg || ""} onChange={(e) => setPet({ ...pet, weightKg: Number(e.target.value) || 0 })} required autoFocus placeholder="např. 20" />
          </label>
          <div className="grid gap-2">
            {(Object.keys(CONDITION_LABEL) as Condition[]).map((c) => (
              <button key={c} type="button" onClick={() => setPet({ ...pet, condition: c })} aria-pressed={pet.condition === c} className={opt(pet.condition === c)}>
                <span className="font-semibold">{CONDITION_LABEL[c]}</span>
              </button>
            ))}
          </div>
          <Button type="submit" variant="action" className="w-full min-h-12" disabled={!canNext}>
            Pokračovat
          </Button>
        </form>
      )}

      {step === 4 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
          className={`${box} space-y-4`}
        >
          <h2 className="text-[26px]">Jak je {first} aktivní?</h2>
          <div className="grid gap-2">
            {(Object.keys(ACTIVITY_LABEL[pet.species]) as Activity[])
              .filter((a, i, arr) => arr.findIndex((x) => ACTIVITY_LABEL[pet.species][x] === ACTIVITY_LABEL[pet.species][a]) === i)
              .map((a) => (
                <button key={a} type="button" onClick={() => setPet({ ...pet, activity: a })} aria-pressed={pet.activity === a} className={opt(pet.activity === a)}>
                  <span className="font-semibold">{ACTIVITY_LABEL[pet.species][a]}</span>
                </button>
              ))}
          </div>
          <label className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-line p-4 text-sm">
            <span>{first} je {isDog ? "kastrovaný" : "kastrovaná"}</span>
            <input type="checkbox" checked={pet.neutered} onChange={(e) => setPet({ ...pet, neutered: e.target.checked })} className="h-5 w-5 min-h-0 accent-green" />
          </label>
          <Button type="submit" variant="action" className="w-full min-h-12">
            Pokračovat
          </Button>
        </form>
      )}

      {step === 5 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
          className={`${box} space-y-4`}
        >
          <h2 className="text-[26px]">Co {first} teď žere?</h2>
          <p className="text-sm text-muted">Když přecházíte z granulí, začneme jedním druhem masa a pošleme plán na první týdny.</p>
          <div className="grid gap-2">
            {(Object.keys(FEEDING_LABEL) as Exclude<FeedingNow, "">[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setPet({ ...pet, feedingNow: f });
                  setRawShare(f === "granule" || f === "mix" ? 50 : 100);
                }}
                aria-pressed={pet.feedingNow === f}
                className={opt(pet.feedingNow === f)}
              >
                <span className="font-semibold">{FEEDING_LABEL[f]}</span>
              </button>
            ))}
          </div>
          {(pet.feedingNow === "granule" || pet.feedingNow === "mix") && (
            <div className="rounded-[var(--radius-card)] border border-line bg-cream p-4">
              <p className="label mb-2 text-[11px] text-muted">Kolik syrového chcete krmit</p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    [100, "Úplně syrové", "granule vysadíme"],
                    [75, "Tři čtvrtiny", "granule jen občas"],
                    [50, "Půl na půl", "syrové a granule v jiných jídlech"],
                    [25, "Čtvrtina", "granule zůstávají základ"],
                  ] as [AnimalInput["rawShare"], string, string][]
                ).map(([v, label, hint]) => (
                  <button key={v} type="button" onClick={() => setRawShare(v)} aria-pressed={rawShare === v} className={`${opt(rawShare === v)} p-3`}>
                    <span>
                      <span className="text-sm font-semibold">{label}</span>
                      <span className={sub(rawShare === v)}>{hint}</span>
                    </span>
                  </button>
                ))}
              </div>
              {rawShare < 100 && (
                <label className="mt-3 flex items-center justify-between gap-3 text-sm">
                  <span>Přidat do dodávky i naše granule</span>
                  <input type="checkbox" checked={addKibble} onChange={(e) => setAddKibble(e.target.checked)} className="h-5 w-5 min-h-0 accent-green" />
                </label>
              )}
            </div>
          )}
          <Button type="submit" variant="action" className="w-full min-h-12" disabled={!pet.feedingNow}>
            Pokračovat
          </Button>
        </form>
      )}

      {step === 6 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
          className={`${box} space-y-4`}
        >
          <h2 className="text-[26px]">Co {first} nesmí nebo nemá rád?</h2>
          <p className="text-sm text-muted">Označte druhy masa, které vynecháme. Když nic, klidně přeskočte.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {MEATS.map((m) => {
              const on = pet.exclude.includes(m);
              const img = meatImages[m];
              return (
                <button key={m} type="button" onClick={() => setPet({ ...pet, exclude: on ? pet.exclude.filter((x) => x !== m) : [...pet.exclude, m] })} aria-pressed={on} className={`flex items-center gap-2 rounded-[var(--radius-card)] border-2 p-2 text-left text-sm ${on ? "border-brick bg-paper line-through decoration-brick" : "border-line bg-paper hover:border-green"}`}>
                  <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-line bg-cream">{img && <Image src={img} alt="" fill sizes="40px" className="object-contain p-1" />}</span>
                  <span className="capitalize">{MEAT_LABEL[m]}</span>
                  {on && <Check strokeWidth={1.75} className="ml-auto h-4 w-4 text-brick-text" />}
                </button>
              );
            })}
          </div>
          <Button type="submit" variant="action" className="w-full min-h-12">
            {pet.exclude.length ? "Sestavit plán" : "Nic, sestavit plán"}
          </Button>
        </form>
      )}

      {step === 7 && plan && (
        <PlanStep
          plan={plan}
          pet={pet}
          first={first}
          days={days}
          setDays={setDays}
          delivery={delivery}
          setDelivery={setDelivery}
          removed={removed}
          setRemoved={setRemoved}
          swaps={swaps}
          setSwaps={setSwaps}
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
          onContinue={() => (user ? finish() : next())}
          cta={user ? `Chci to takhle pro ${first}` : "Pokračovat k účtu"}
        />
      )}

      {step === 8 && !user && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (codeSent) verifyCode();
            else sendCode();
          }}
          className={`${box} space-y-4`}
        >
          {!codeSent ? (
            <>
              <h2 className="text-[26px]">Kam plán poslat?</h2>
              <p className="text-sm text-muted">
                Založíme vám účet a profil {first === "váš pes" || first === "vaše kočka" ? "zvířete" : first + "e"}, ať jde plán kdykoli upravit. Bez hesla, jen kód z e-mailu.
                {club.petPoints > 0 && ` Za profil zvířete ${club.petPoints} Kostiček`}
                {club.registrationPoints > 0 && `, za registraci ${club.registrationPoints}`}.
              </p>
              <label className="block">
                <span className="label mb-1 block text-[11px] text-muted">Vaše jméno a příjmení</span>
                <input value={owner.name} onChange={(e) => setOwner({ ...owner, name: e.target.value })} required autoComplete="name" autoFocus />
              </label>
              <label className="block">
                <span className="label mb-1 block text-[11px] text-muted">E-mail</span>
                <input type="email" value={owner.email} onChange={(e) => setOwner({ ...owner, email: e.target.value })} required autoComplete="email" />
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={owner.terms} onChange={(e) => setOwner({ ...owner, terms: e.target.checked })} required className="mt-0.5 h-4 min-h-0 w-4 accent-green" />
                <span>
                  Souhlasím s{" "}
                  <Link href="/obchodni-podminky" target="_blank" className="text-green underline">
                    obchodními podmínkami
                  </Link>{" "}
                  a beru na vědomí{" "}
                  <Link href="/ochrana-udaju" target="_blank" className="text-green underline">
                    zpracování osobních údajů
                  </Link>
                  .
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={owner.marketing} onChange={(e) => setOwner({ ...owner, marketing: e.target.checked })} className="mt-0.5 h-4 min-h-0 w-4 accent-green" />
                <span>Posílejte mi tipy ke krmení a akce e-mailem.</span>
              </label>
              {error && (
                <p role="alert" className="text-sm text-brick-text">
                  {error}
                </p>
              )}
              <Button type="submit" variant="action" className="w-full min-h-12" disabled={pending || !owner.terms}>
                {pending ? "Odesílám…" : "Poslat kód a pokračovat"}
              </Button>
              <p className="text-sm text-muted">
                Už máte účet?{" "}
                <Link href="/ucet/prihlaseni?next=/krmeni-na-miru" className="text-green underline">
                  Přihlásit se
                </Link>
              </p>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <MailCheck strokeWidth={1.75} className="mt-0.5 h-6 w-6 shrink-0 text-green" />
                <div>
                  <h2 className="text-[22px]">Opište kód z e-mailu</h2>
                  <p className="mt-1 text-sm">
                    Na <strong>{owner.email}</strong> jsme poslali šestimístný kód. Platí několik minut.
                  </p>
                </div>
              </div>
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" required autoFocus aria-label="Kód z e-mailu" className="text-center font-display text-2xl tracking-[0.4em]" />
              {error && (
                <p role="alert" className="text-sm text-brick-text">
                  {error}
                </p>
              )}
              <Button type="submit" variant="action" className="w-full min-h-12" disabled={pending || code.length !== 6}>
                {pending ? "Ověřuji…" : "Dokončit a jít k dodání"}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={sendCode} disabled={pending || cooldown > 0} className="text-green underline disabled:no-underline disabled:opacity-60">
                  {cooldown > 0 ? `Poslat znovu (${cooldown} s)` : "Poslat kód znovu"}
                </button>
                <button type="button" onClick={() => setCodeSent(false)} className="text-muted hover:underline">
                  Opravit e-mail
                </button>
              </div>
            </>
          )}
        </form>
      )}
    </div>
  );
}

function PlanStep({
  plan,
  pet,
  first,
  days,
  setDays,
  delivery,
  setDelivery,
  removed,
  setRemoved,
  swaps,
  setSwaps,
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
  onContinue,
  cta,
}: {
  plan: ReturnType<typeof buildPlan>;
  pet: PetProfile;
  first: string;
  days: Days;
  setDays: (d: Days) => void;
  delivery: Delivery;
  setDelivery: (d: Delivery) => void;
  removed: string[];
  setRemoved: (r: string[]) => void;
  swaps: Record<string, string>;
  setSwaps: (s: Record<string, string>) => void;
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
  onContinue: () => void;
  cta: string;
}) {
  const r = plan.result;
  const totalKg = plan.items.reduce((s, i) => s + i.qty * i.product.weightGrams, 0) / 1000;
  const shipFree = shipping.freeFromCzk !== null && plan.totalCzk >= shipping.freeFromCzk;
  const bonusPts = subscription.pointsBonusPct > 0 && loyalty.enabled ? Math.round(((plan.totalCzk * subscription.pointsBonusPct) / 100) * (loyalty.redeemStep / loyalty.redeemValueCzk)) : 0;
  const seg = (on: boolean) => `flex-1 rounded-[var(--radius-card)] border-2 p-3 text-left ${on ? "border-green" : "border-line hover:border-green"}`;
  const removedItems = plan.pool.filter((p) => removed.includes(p.slug));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <div className="space-y-4">
        <div>
          <p className="label text-brick-text">Plán pro {pet.name}</p>
          <h2 className="mt-1 text-[30px] leading-tight md:text-[34px]">
            {pet.name} potřebuje {r.dailyGrams} g {rawShare < 100 ? "syrového" : "syrové stravy"}
            {rawShare < 100 && r.kibbleGrams ? ` a ${r.kibbleGrams} g granulí` : ""} denně
          </h2>
          {rawShare < 100 && !r.kibbleGrams && <p className="mt-1 text-sm text-muted">Zbytek ({100 - rawShare} % energie, {r.kibbleKcal} kcal) doplní granule podle tabulky na obalu.</p>}
          <p className="mt-2 max-w-2xl text-sm text-muted">
            {pet.species === "pes" ? "Pes" : "Kočka"}, {pet.weightKg} kg: zhruba {r.pct} % váhy denně, ve {r.mealsPerDay === 1 ? "jedné porci" : r.mealsPerDay === 2 ? "dvou porcích" : `${r.mealsPerDay} porcích`}
            {r.mealsPerDay > 1 ? ` po ${Math.round(r.dailyGrams / r.mealsPerDay)} g` : ""}. Orientační dávka, po 2 až 4 týdnech {first} zvažte a plán upravíte v účtu.
          </p>
        </div>

        <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3">
            <h3 className="text-[17px]">Dodávka na {days === 14 ? "2 týdny" : "4 týdny"}</h3>
            <span className="text-xs text-muted">{totalKg.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} kg · {days === 14 ? "v mrazáku zhruba jedna police" : "větší mrazák"}</span>
          </div>
          <ul className="divide-y divide-line text-sm">
            {plan.items.map((i) => {
              const alternatives = i.role === "zaklad" || i.role === "kosti" ? plan.pool.filter((p) => p.line === i.product.line && p.slug !== i.product.slug && !plan.items.some((x) => x.product.slug === p.slug)) : [];
              return (
                <li key={i.product.slug} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p>
                      <span className="font-semibold">{productName(i.product)}</span> <span className="text-muted">{formatWeight(i.product.weightGrams)}</span>
                    </p>
                    <p className="text-xs text-muted">
                      {i.why.toLowerCase().startsWith(ROLE_LABEL[i.role]) ? i.why : `${ROLE_LABEL[i.role]}, ${i.why}`}
                    </p>
                  </div>
                  <span className="text-xs text-muted">
                    {i.gramsPerDay > 0 ? `${Math.round(i.gramsPerDay)} g/den` : ""}
                    {everyNth[i.product.slug] && (
                      <span className="block text-brick-text">vydrží ~{Math.round((i.qty * i.product.weightGrams) / i.gramsPerDay)} dní{!oneTime ? `, pak jen každou ${everyNth[i.product.slug]}. dodávku` : ""}</span>
                    )}
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
                    <button type="button" onClick={() => setRemoved([...removed, i.product.slug])} className="text-green underline">
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
              <button type="button" onClick={() => setRemoved([])} className="text-green underline">
                vrátit
              </button>
            </p>
          )}
        </div>
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

      <aside className="h-fit rounded-[var(--radius-card)] border border-line bg-paper p-5 lg:sticky lg:top-4">
        <p className="label text-[11px] text-muted">Cena za den</p>
        <p className="font-display text-[44px] font-semibold leading-none">{formatPrice(plan.perDayCzk)}</p>
        <p className="mt-1 text-xs text-muted">
          {formatPrice(plan.totalCzk)} za dodávku na {days === 14 ? "2 týdny" : "4 týdny"}
          {delivery === "rozvoz" ? (shipFree ? " · rozvoz zdarma" : ` · rozvoz ${formatPrice(shipping.rozvozPriceCzk)}`) : " · odběr v prodejně zdarma"}
        </p>

        <p className="label mt-4 mb-1.5 text-[11px] text-muted">Jak často</p>
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

        <p className="label mt-4 mb-1.5 text-[11px] text-muted">Dodání</p>
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
        <Button type="button" variant="action" onClick={onContinue} disabled={pending || plan.items.length === 0} className="mt-4 min-h-14 w-full text-[14px]">
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
