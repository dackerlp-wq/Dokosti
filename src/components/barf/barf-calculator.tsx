"use client";

import { Baby, Cat, Check, Dog, Moon, PawPrint, Plus, ShoppingBasket, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { deletePetById, loadPets } from "@/app/(shop)/ucet/actions";
import { FeedingSchedule, leftoverText } from "@/components/barf/feeding-schedule";
import { useCart } from "@/components/cart/cart-context";
import { Choice, ChoiceGrid, WizardLabel, WizardPanel } from "@/components/plan/wizard-ui";
import { Button, ButtonLink } from "@/components/ui/button";
import { chipClass, fieldInput } from "@/components/ui/field";
import { ACTIVITY_LABEL, addonForRole, BASE_ADDONS, buildPlan, CONDITION_LABEL, MEAT_LABEL, newAnimal, recommendExtras, type Activity, type AnimalInput, type Condition, type MeatKey, type Plan, type Reco, type Stage } from "@/lib/barf";
import { productName, type Product } from "@/lib/catalog";
import { type PetProfile, petToAnimal } from "@/lib/club";
import { formatPrice, formatWeight } from "@/lib/format";

/**
 * Kalkulačka dávky: tři otázky (kdo, kolik váží, jak je starý), výsledek a nákup na 14 dní.
 * Aktivita, kastrace, kondice, březost a vyloučené maso jsou pod „Upřesnit“ s rozumnými výchozími hodnotami.
 * Základní nákup jsou jen mixy (a granule při kombinaci). Kosti, ryba, vnitřnosti, olej a zelenina se nabízejí
 * zvlášť v „Doporučujeme navíc“ a zákazník si je přidá jedním klepnutím.
 * Plán, rozpis a pravidelné dodávky dělá průvodce Krmení na míru.
 */
const STORAGE_KEY = "dokosti-kalkulacka-v4";
const EXTRA_LABEL: Partial<Record<Reco["role"], string>> = { kosti: "Masité kosti", ryba: "Rybí den", vnitrnosti: "Vnitřnosti", olej: "Olej", zelenina: "Zelenina", doplnek: "Doplněk", rekreacni: "Na okusování" };
const DAYS = [7, 14, 30] as const;
type Days = (typeof DAYS)[number];

function withDefaults(a: Partial<AnimalInput>): AnimalInput {
  const base = newAnimal(a.species);
  return { ...base, ...a, addons: { ...BASE_ADDONS, ...(a.addons ?? {}) }, exclude: a.exclude ?? [], removed: [], swaps: {} };
}

/* Stav v prohlížeči; useSyncExternalStore drží server a klient v souladu bez setState v efektu. */
let cached: AnimalInput | null | undefined;
function readStored(): AnimalInput | null {
  if (cached !== undefined) return cached;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cached = raw ? withDefaults(JSON.parse(raw) as Partial<AnimalInput>) : null;
  } catch {
    cached = null;
  }
  return cached;
}
function writeStored(a: AnimalInput) {
  cached = a;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(a));
  } catch {
    /* bez localStorage se stav nepamatuje */
  }
}
const noop = () => () => {};
const DEFAULT: AnimalInput = { ...newAnimal("pes"), id: "prvni", addons: { ...BASE_ADDONS } };

const kgText = (g: number) => (g >= 1000 ? `${(g / 1000).toFixed(1).replace(".", ",")} kg` : `${g} g`);
const round5 = (g: number) => Math.max(5, Math.round(g / 5) * 5);
const num = (s: string) => {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export function BarfCalculator({ products }: { products: Product[] }) {
  const cart = useCart();
  const router = useRouter();
  const stored = useSyncExternalStore(noop, readStored, () => null);
  const [edited, setEdited] = useState<AnimalInput | null>(null);
  const a = edited ?? stored ?? DEFAULT;
  const [days, setDays] = useState<Days>(14);
  const [added, setAdded] = useState(false);
  /* Zvířata z účtu: načtou se v prohlížeči, stránka zůstává statická. */
  const [pets, setPets] = useState<PetProfile[] | null>(null);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    let live = true;
    loadPets()
      .then((r) => live && setPets(r.user ? r.pets : null))
      .catch(() => live && setPets(null));
    return () => {
      live = false;
    };
  }, []);

  function patch(p: Partial<AnimalInput>) {
    const next = { ...a, ...p };
    setEdited(next);
    writeStored(next);
    setAdded(false);
  }
  /** Profil z účtu do kalkulačky: přepočítá se podle uložené váhy a věku, doplňky zůstávají na výběr. */
  function pickPet(p: PetProfile) {
    patch({ ...petToAnimal(p), id: p.id ?? a.id, addons: { ...BASE_ADDONS }, removed: [], swaps: {} });
  }
  function removePet(p: PetProfile) {
    if (!p.id || !window.confirm(`Smazat profil ${p.name || "zvířete"} z účtu?`)) return;
    const id = p.id;
    startTransition(async () => {
      const res = await deletePetById(id);
      if (res.ok) setPets((list) => (list ?? []).filter((x) => x.id !== id));
    });
  }
  const setAddon = (role: Reco["role"], on: boolean) => {
    const key = addonForRole(role);
    if (key) patch({ addons: { ...a.addons, [key]: on } });
  };

  const isDog = a.species === "pes";
  const young = a.stage === "mlade";
  const valid = a.weightKg > 0 && (!young || (a.ageMonths ?? 0) > 0);
  const plan = useMemo<Plan | null>(() => (valid ? buildPlan(products, a, days) : null), [valid, a, products, days]);
  const extras = useMemo<Reco[]>(() => (valid ? recommendExtras(products, a, days) : []), [valid, a, products, days]);
  const r = plan?.result;
  const warnings = plan?.notes.filter((n) => n.kind === "warn") ?? [];
  const infos = plan?.notes.filter((n) => n.kind === "info") ?? [];
  const stageCards: { value: Stage; icon: typeof Dog; title: string; desc: string }[] = [
    { value: "mlade", icon: Baby, title: isDog ? "Štěně" : "Kotě", desc: "do roka, počítáme podle měsíců" },
    { value: "dospely", icon: isDog ? Dog : Cat, title: isDog ? "Dospělý" : "Dospělá", desc: "běžná dávka podle váhy" },
    { value: "senior", icon: Moon, title: "Senior", desc: isDog ? "zhruba od 7 let" : "zhruba od 11 let" },
  ];
  const stageValue: Stage = a.stage === "brezi" || a.stage === "kojici" ? "dospely" : a.stage;

  return (
    <div id="kalkulacka" className="scroll-mt-4 space-y-5">
      <WizardPanel kicker="Tři údaje" title="Kdo bude jíst a kolik váží?" helper="Vyberte zvíře, zadejte váhu a věk. Výsledek se spočítá hned." hideActions>
        {pets && pets.length > 0 && (
          <div className="mb-5 rounded-panel bg-paper p-4">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
              <p className="text-label text-green">Vaše zvířata</p>
              <Link href="/ucet" className="text-small font-semibold text-green hover:underline">
                Upravit v účtu
              </Link>
            </div>
            <ul className="flex flex-wrap gap-1.25" aria-busy={pending}>
              {pets.map((p) => {
                const active = a.id === p.id;
                return (
                  <li key={p.id} className="flex items-center">
                    <button type="button" onClick={() => pickPet(p)} aria-pressed={active} className={chipClass(active, "rounded-r-none border-r-0")}>
                      {active && <Check className="size-3.5" strokeWidth={2.5} aria-hidden />}
                      {p.name || (p.species === "pes" ? "Pes" : "Kočka")}
                    </button>
                    <button type="button" onClick={() => removePet(p)} disabled={pending} aria-label={`Smazat profil ${p.name}`} title="Smazat profil" className={chipClass(false, "rounded-l-none px-2 text-muted hover:text-brick-text")}>
                      <X className="size-3.5" strokeWidth={2} aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-small">Klepnutím se dávka přepočítá podle uložené váhy a věku. Křížkem profil z účtu smažete.</p>
          </div>
        )}
        <ChoiceGrid label="Kdo bude jíst">
          <Choice icon={Dog} title="Pes" desc="dávka podle váhy a aktivity" checked={isDog} onSelect={() => patch({ species: "pes", stage: "dospely", ration: "pmr", rawShare: 100 })} />
          <Choice icon={Cat} title="Kočka" desc="striktní masožravec, bez zeleniny" checked={!isDog} onSelect={() => patch({ species: "kocka", stage: "dospely", ration: "pmr", rawShare: 100 })} />
        </ChoiceGrid>

        <WizardLabel htmlFor="kalk-vaha" required>
          Aktuální váha v kg
        </WizardLabel>
        <input id="kalk-vaha" type="number" inputMode="decimal" min={0.3} max={120} step={0.1} value={a.weightKg > 0 ? a.weightKg : ""} onChange={(e) => patch({ weightKg: num(e.target.value) })} placeholder="např. 20" className={`${fieldInput} max-w-xs`} />

        <WizardLabel>Věk</WizardLabel>
        <ChoiceGrid cols={3} label="Věk">
          {stageCards.map((c) => (
            <Choice key={c.value} icon={c.icon} title={c.title} desc={c.desc} checked={stageValue === c.value} onSelect={() => patch({ stage: c.value, rawShare: 100 })} />
          ))}
        </ChoiceGrid>
        {young && (
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-label text-green">
                Věk v měsících <span className="text-brick-text">*</span>
              </span>
              <input type="number" inputMode="numeric" min={1} max={24} value={a.ageMonths && a.ageMonths > 0 ? a.ageMonths : ""} onChange={(e) => patch({ ageMonths: num(e.target.value) })} placeholder="např. 4" className={fieldInput} />
            </label>
            {isDog && (
              <label className="block">
                <span className="mb-2 block text-label text-green">
                  Dospělá váha v kg <span className="font-normal text-muted">(nepovinné, odhadneme)</span>
                </span>
                <input type="number" inputMode="decimal" min={1} max={100} step={0.5} value={a.adultWeightKg ?? ""} onChange={(e) => patch({ adultWeightKg: num(e.target.value) || undefined })} placeholder="podle rodičů nebo plemene" className={fieldInput} />
              </label>
            )}
          </div>
        )}

        <details className="mt-6 rounded-panel border border-line bg-paper p-4 open:pb-5">
          <summary className="cursor-pointer text-button text-green">Upřesnit: aktivita, kastrace, kondice, co nesmí</summary>
          <div className="mt-4 space-y-5">
            <Row label="Aktivita">
              {(Object.keys(ACTIVITY_LABEL[a.species]) as Activity[])
                .filter((k, i, arr) => arr.findIndex((x) => ACTIVITY_LABEL[a.species][x] === ACTIVITY_LABEL[a.species][k]) === i)
                .map((k) => (
                  <button key={k} type="button" onClick={() => patch({ activity: k })} aria-pressed={a.activity === k} className={chipClass(a.activity === k)}>
                    {ACTIVITY_LABEL[a.species][k]}
                  </button>
                ))}
            </Row>
            <Row label="Kondice">
              {(Object.keys(CONDITION_LABEL) as Condition[]).map((k) => (
                <button key={k} type="button" onClick={() => patch({ condition: k })} aria-pressed={a.condition === k} className={chipClass(a.condition === k)}>
                  {CONDITION_LABEL[k]}
                </button>
              ))}
            </Row>
            <Row label="Kastrace">
              <button type="button" onClick={() => patch({ neutered: true })} aria-pressed={a.neutered} className={chipClass(a.neutered)}>
                {isDog ? "Kastrovaný" : "Kastrovaná"}
              </button>
              <button type="button" onClick={() => patch({ neutered: false })} aria-pressed={!a.neutered} className={chipClass(!a.neutered)}>
                Nekastrovaný
              </button>
            </Row>
            {!young && (
              <Row label={isDog ? "Fena" : "Kočka"}>
                <button type="button" onClick={() => patch({ stage: "dospely", pregnancyWeek: undefined })} aria-pressed={a.stage !== "brezi" && a.stage !== "kojici"} className={chipClass(a.stage !== "brezi" && a.stage !== "kojici")}>
                  Není březí ani nekojí
                </button>
                <button type="button" onClick={() => patch({ stage: "brezi" })} aria-pressed={a.stage === "brezi"} className={chipClass(a.stage === "brezi")}>
                  Březí
                </button>
                <button type="button" onClick={() => patch({ stage: "kojici" })} aria-pressed={a.stage === "kojici"} className={chipClass(a.stage === "kojici")}>
                  Kojící
                </button>
                {a.stage === "brezi" && (
                  <input type="number" inputMode="numeric" min={1} max={9} value={a.pregnancyWeek ?? ""} onChange={(e) => patch({ pregnancyWeek: num(e.target.value) || undefined })} placeholder="týden 1–9" aria-label="Týden březosti" className="w-28" />
                )}
              </Row>
            )}
            <Row label="Nesmí">
              {(Object.keys(MEAT_LABEL) as MeatKey[]).map((k) => {
                const on = a.exclude.includes(k);
                return (
                  <button key={k} type="button" onClick={() => patch({ exclude: on ? a.exclude.filter((x) => x !== k) : [...a.exclude, k] })} aria-pressed={on} className={chipClass(on, "capitalize")}>
                    {on && <Check className="size-3.5" strokeWidth={2.5} aria-hidden />}
                    {MEAT_LABEL[k]}
                  </button>
                );
              })}
            </Row>
          </div>
        </details>
      </WizardPanel>

      {plan && r ? (
        <>
          <section className="rounded-panel border border-line bg-white p-5 shadow-card md:p-7" aria-live="polite" aria-label="Výsledek">
            <p className="text-eyebrow text-green uppercase">Denní dávka</p>
            <div className="mt-2 flex flex-wrap items-end gap-x-7.5 gap-y-3">
              <p className="text-display-lg text-green">{r.dailyGrams} g</p>
              <p className="pb-2">
                {r.mealsPerDay} {r.mealsPerDay === 1 ? "porce" : r.mealsPerDay < 5 ? "porce" : "porcí"} po {round5(r.dailyGrams / r.mealsPerDay)} g · rozmezí {r.rangeGrams[0]} až {r.rangeGrams[1]} g · {kgText(r.dailyGrams * 7)} týdně
                {r.kibbleKcal > 0 ? ` · plus granule ${r.kibbleGrams ? `${r.kibbleGrams} g` : `${r.kibbleKcal} kcal`}` : ""}
              </p>
            </div>
            {warnings.map((n) => (
              <p key={n.text} className="mt-3.5 rounded-control border border-brick-text bg-white p-3 text-small font-semibold text-brick-text">
                {n.text}
              </p>
            ))}
            <p className="mt-3.5 text-small">
              Výchozí hodnota pro zdravé zvíře podle doporučení FEDIAF. Po dvou až čtyřech týdnech zvíře zvažte: žebra mají být hmatatelná, pas vidět shora. Při zdravotních potížích se poraďte s veterinářem.
            </p>
          </section>

          <section className="rounded-panel border border-line bg-white shadow-card" aria-label="Nákup">
            <div className="flex flex-wrap items-center justify-between gap-3.5 border-b border-line px-5 py-4 md:px-7">
              <div>
                <h3 className="text-heading-lg text-green">Co nakoupit na {days} dní</h3>
                <p className="text-small">Celá balení, jedno po druhém. Základ jsou mixy, doplňky si přidáte níže.</p>
              </div>
              <div className="flex gap-1.25" role="group" aria-label="Období">
                {DAYS.map((d) => (
                  <button key={d} type="button" onClick={() => setDays(d)} aria-pressed={days === d} className={chipClass(days === d)}>
                    {d} dní
                  </button>
                ))}
              </div>
            </div>
            {plan.items.length === 0 ? (
              <p className="px-5 py-5 md:px-7">Pro tuto kombinaci zrovna nemáme skladem vhodný mix. Stavte se v prodejně, poskládáme set spolu.</p>
            ) : (
              <ul className="divide-y divide-line">
                {plan.items.map((it) => (
                  <li key={it.product.slug} className="grid grid-cols-[1fr_auto] items-center gap-x-5 gap-y-1 px-5 py-3.5 md:grid-cols-[1fr_auto_auto] md:px-7">
                    <div className="min-w-0">
                      <Link href={`/produkt/${it.product.slug}`} className="font-semibold text-green hover:underline">
                        {productName(it.product)}
                      </Link>
                      {EXTRA_LABEL[it.role] && <span className="ml-2 text-eyebrow text-muted uppercase">{EXTRA_LABEL[it.role]}</span>}
                      <p className="text-small">
                        {it.portionText}
                        {leftoverText(it) && <> · {leftoverText(it)}</>}
                        {addonForRole(it.role) && (
                          <>
                            {" · "}
                            <button type="button" onClick={() => setAddon(it.role, false)} className="font-semibold text-green underline-offset-2 hover:underline">
                              Odebrat
                            </button>
                          </>
                        )}
                      </p>
                    </div>
                    <p className="text-right text-small tabular-nums">
                      {it.qty} × {formatWeight(it.product.weightGrams)}
                      {it.periods > 1 && <span className="block text-muted">vydrží ~{it.periods} nákupy</span>}
                    </p>
                    <p className="col-start-2 text-right font-semibold text-green tabular-nums md:col-start-3">{formatPrice(it.qty * it.product.priceCzk)}</p>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-center justify-between gap-5 border-t border-line px-5 py-5 md:px-7">
              <p>
                <span className="text-price-lg text-green">{formatPrice(plan.totalCzk)}</span>
                <span className="block text-small">
                  {formatPrice(plan.perDayCzk)} za den{plan.items.some((it) => it.periods > 1) ? " (balení na víc nákupů rozpočítaná)" : ""}
                </span>
              </p>
              <div className="flex flex-wrap gap-3.5">
                {added ? (
                  <ButtonLink href="/kosik" variant="secondary" size="md">
                    <Check className="size-5" strokeWidth={1.75} aria-hidden /> V košíku, přejít do košíku
                  </ButtonLink>
                ) : (
                  <Button
                    type="button"
                    variant="action"
                    size="md"
                    disabled={plan.items.length === 0}
                    onClick={() => {
                      plan.items.forEach((it) => cart.add(it.product.slug, it.qty));
                      setAdded(true);
                    }}
                  >
                    <ShoppingBasket className="size-5" strokeWidth={1.75} aria-hidden /> Přidat vše do košíku
                  </Button>
                )}
                <Button type="button" variant="secondary" size="md" onClick={() => router.push("/krmeni-na-miru")}>
                  <PawPrint className="size-5" strokeWidth={1.75} aria-hidden /> Chci plán a pravidelné dodávky
                </Button>
              </div>
            </div>
          </section>

          {extras.length > 0 && (
            <section className="rounded-panel border border-line bg-paper" aria-label="Doporučujeme navíc">
              <div className="border-b border-line px-5 py-4 md:px-7">
                <h3 className="text-heading-lg text-green">Doporučujeme navíc</h3>
                <p className="text-small">Vybráno tak, aby se balení za {days} dní spotřebovalo celé nebo z co největší části. Co přidáte, zapadne do dávky místo části mixu.</p>
              </div>
              <ul className="divide-y divide-line">
                {extras.map((it) => (
                  <li key={it.product.slug} className="grid grid-cols-[1fr_auto] items-center gap-x-5 gap-y-2 px-5 py-3.5 md:grid-cols-[auto_1fr_auto_auto] md:px-7">
                    <p className="hidden w-28 text-eyebrow text-muted uppercase md:block">{EXTRA_LABEL[it.role]}</p>
                    <div className="min-w-0">
                      <Link href={`/produkt/${it.product.slug}`} className="font-semibold text-green hover:underline">
                        {productName(it.product)}
                      </Link>
                      <p className="text-small">
                        {it.portionText}
                        {it.why ? `, ${it.why}` : ""}
                      </p>
                      <p className="text-small tabular-nums text-muted">
                        {it.qty} × {formatWeight(it.product.weightGrams)}
                        {it.periods > 1 ? ` · vydrží ~${it.periods} nákupy` : ""}
                      </p>
                    </div>
                    <p className="hidden text-right font-semibold text-green tabular-nums md:block">{formatPrice(it.qty * it.product.priceCzk)}</p>
                    <Button type="button" variant="secondary" onClick={() => setAddon(it.role, true)} aria-label={`Přidat ${productName(it.product)} do nákupu`}>
                      <Plus className="size-4" strokeWidth={2} aria-hidden /> Přidat
                      <span className="md:hidden"> · {formatPrice(it.qty * it.product.priceCzk)}</span>
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <details className="rounded-panel border border-line bg-white p-5 shadow-card md:px-7">
            <summary className="cursor-pointer text-button text-green">Rozpis po dnech a poznámky k výpočtu</summary>
            <div className="mt-5 space-y-5">
              <FeedingSchedule plan={plan} />
              {infos.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-small">
                  {infos.map((n) => (
                    <li key={n.text}>{n.text}</li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        </>
      ) : (
        <p className="px-1 text-small">Doplňte váhu{young ? " a věk v měsících" : ""}, výsledek se objeví sám.</p>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-label text-green">{label}</p>
      <div className="flex flex-wrap items-center gap-1.25">{children}</div>
    </div>
  );
}
