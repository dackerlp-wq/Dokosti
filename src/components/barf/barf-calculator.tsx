"use client";

import { FileDown, Mail, Printer, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { emailPlan } from "@/app/(shop)/kalkulacka/actions";
import { loadProfiles, savePet } from "@/app/(shop)/ucet/actions";
import { useCart } from "@/components/cart/cart-context";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  ACTIVITY_LABEL,
  ADDON_LABEL,
  BREEDS,
  buildPlan,
  CONDITION_LABEL,
  estimateAdultWeight,
  MEAT_LABEL,
  newAnimal,
  STAGE_LABEL,
  weeklySchedule,
  type Activity,
  type AddonKey,
  type AnimalInput,
  type Condition,
  type MeatKey,
  type Plan,
  type Reco,
  type Species,
  type Stage,
} from "@/lib/barf";
import { productName, type Product } from "@/lib/catalog";
import { decodePlanRequest } from "@/lib/pdf/request";
import { formatPrice, formatWeight } from "@/lib/format";

/**
 * Kalkulačka dávky pro jedno zvíře: údaje, výsledek (denně, týdně, měsíčně, porce),
 * plán krmení v PDF a jeden nákup z nabídky s vyřazením a náhradou druhu.
 * Vše se přepočítává hned při změně. Stav si pamatuje prohlížeč, profil jde uložit k účtu.
 */
export type SavedPet = { id: string; name: string; data: Partial<AnimalInput> };

const STORAGE_KEY = "dokosti-kalkulacka-v2";
const DAYS = [7, 14, 30] as const;
type Days = (typeof DAYS)[number];

/** Doplní nová pole do profilů uložených dřív. */
function withDefaults(a: Partial<AnimalInput>): AnimalInput {
  const base = newAnimal(a.species);
  return { ...base, ...a, addons: { ...base.addons, ...(a.addons ?? {}) }, exclude: a.exclude ?? [], removed: a.removed ?? [], swaps: a.swaps ?? {} };
}

/* Uložený stav v prohlížeči; useSyncExternalStore drží server a klient v souladu bez setState v efektu. */
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
const DEFAULT: AnimalInput = { ...newAnimal("pes"), id: "prvni" };

/** Zakóduje vstup do URL parametru pro PDF a e-mail (base64url, stejně jako lib/pdf/request na serveru). */
function encodeRequest(animal: AnimalInput, days: number) {
  const json = JSON.stringify({ animals: [animal], days });
  return btoa(Array.from(new TextEncoder().encode(json), (b) => String.fromCharCode(b)).join(""))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const kgText = (g: number) => (g >= 1000 ? `${(g / 1000).toFixed(1).replace(".", ",")} kg` : `${g} g`);
const round5 = (g: number) => Math.max(5, Math.round(g / 5) * 5);

export function BarfCalculator({
  products,
  compact = false,
}: {
  products: Product[];
  compact?: boolean;
}) {
  // Přihlášení a uložené profily se načtou až v prohlížeči, stránka tak může jít z CDN.
  const [profiles, setProfiles] = useState<{ user: { email: string } | null; pets: SavedPet[] }>({ user: null, pets: [] });
  useEffect(() => {
    let live = true;
    loadProfiles().then((r) => live && setProfiles({ user: r.user, pets: r.pets as SavedPet[] }));
    return () => {
      live = false;
    };
  }, []);
  const user = profiles.user;
  const savedPets = profiles.pets;
  // Předvyplnění z odkazu v e-mailu s plánem (?d=…), čte se až v prohlížeči.
  const [initial, setInitial] = useState<{ animals: AnimalInput[]; days: number } | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setInitial(decodePlanRequest(new URLSearchParams(window.location.search).get("d"))), 0);
    return () => clearTimeout(t);
  }, []);
  const cart = useCart();
  const router = useRouter();
  const stored = useSyncExternalStore(noop, readStored, () => null);
  const [edited, setEdited] = useState<AnimalInput | null>(null);
  const a = edited ?? initial?.animals[0] ?? stored ?? DEFAULT;
  const [days, setDays] = useState<Days>((DAYS as readonly number[]).includes(initial?.days ?? 0) ? (initial!.days as Days) : 14);
  const [added, setAdded] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function patch(p: Partial<AnimalInput>) {
    const next = { ...a, ...p };
    setEdited(next);
    writeStored(next);
    setAdded(false);
  }

  const valid = a.weightKg > 0 && (a.stage !== "mlade" || (a.ageMonths ?? 0) > 0);
  const plan = useMemo<Plan | null>(() => (valid ? buildPlan(products, a, days) : null), [valid, a, products, days]);

  function saveProfile() {
    startTransition(async () => {
      const name = a.name || (a.species === "pes" ? "Pes" : "Kočka");
      const res = await savePet(name, a as unknown as Record<string, unknown>);
      setMsg(res.ok ? { ok: true, text: `Profil „${name}“ je uložený u vašeho účtu.` } : { ok: false, text: res.error });
    });
  }

  return (
    <div id="kalkulacka" className="scroll-mt-4 space-y-4">
      {/* 1. Údaje o zvířeti */}
      <section className="rounded-[var(--radius-card)] border border-line bg-paper p-5 md:p-6" aria-label="Údaje o zvířeti">
        {!compact && (
          <>
            <h2 className="text-[24px]">Spočítejte si denní dávku</h2>
            <p className="mt-1 text-sm text-muted">Vyplňte údaje, vše se přepočítá hned.</p>
          </>
        )}
        {(savedPets.length > 0 || !user) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
            {savedPets.length > 0 ? (
              <>
                <span className="label text-[11px]">Uložené profily</span>
                {savedPets.map((p) => (
                  <button key={p.id} type="button" onClick={() => patch(withDefaults({ ...p.data, id: p.id, name: p.name }))} className="rounded-[var(--radius-control)] border border-line bg-cream px-3 py-1 text-sm text-ink hover:border-green">
                    {p.name}
                  </button>
                ))}
              </>
            ) : (
              <span>
                Údaje si pamatuje tento prohlížeč.{" "}
                <Link href="/ucet/prihlaseni?next=/kalkulacka" className="text-green underline">
                  Po přihlášení
                </Link>{" "}
                uložíte profil k účtu.
              </span>
            )}
          </div>
        )}
        <AnimalForm a={a} onChange={patch} />
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="label text-[11px] text-muted">Nesmí</span>
          {(Object.keys(MEAT_LABEL) as MeatKey[]).map((k) => (
            <label key={k} className="flex items-center gap-1">
              <input type="checkbox" checked={a.exclude.includes(k)} onChange={(e) => patch({ exclude: e.target.checked ? [...a.exclude, k] : a.exclude.filter((x) => x !== k), removed: [], swaps: {} })} className="h-4 w-4 min-h-0 w-auto accent-brick" />
              {MEAT_LABEL[k]}
            </label>
          ))}
          {user && (
            <span className="ml-auto flex items-center gap-3">
              {msg && (
                <span role="status" className={`text-xs ${msg.ok ? "text-green" : "text-brick-text"}`}>
                  {msg.text}
                </span>
              )}
              <Button type="button" variant="secondary" onClick={saveProfile} disabled={pending || !valid} className="min-h-9 px-3 text-[11px]">
                {pending ? "Ukládám…" : "Uložit profil"}
              </Button>
            </span>
          )}
        </div>
      </section>

      {/* 2. Výsledek */}
      <section className="rounded-[var(--radius-card)] border border-line bg-paper p-5 md:p-6" aria-live="polite" aria-label="Výsledek">
        {plan ? <ResultView plan={plan} encoded={encodeRequest(a, days)} defaultEmail={user?.email ?? ""} /> : <p className="text-muted">Doplňte hmotnost{a.stage === "mlade" ? " a věk" : ""}, výsledek se objeví sám.</p>}
      </section>

      {/* 3. Nákup */}
      {plan && (
        <section className="rounded-[var(--radius-card)] border border-line bg-paper p-5 md:p-6" aria-label="Nákup">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[22px]">Nákup z naší nabídky</h2>
            <div className="flex gap-1.5" role="group" aria-label="Období">
              {DAYS.map((d) => (
                <button key={d} type="button" onClick={() => setDays(d)} aria-pressed={days === d} className={`rounded-[var(--radius-control)] border px-3 py-1.5 text-sm ${days === d ? "border-green bg-green text-cream" : "border-line bg-paper hover:border-green"}`}>
                  {d} dní
                </button>
              ))}
            </div>
          </div>
          <AddonRow a={a} plan={plan} onChange={patch} />
          <ShoppingTable plan={plan} a={a} onChange={patch} />
          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-xs text-muted">
              Na {days} dní · {formatPrice(plan.perDayCzk)} za den
              {a.removed.length + Object.keys(a.swaps).length > 0 && (
                <>
                  {" · "}
                  <button type="button" onClick={() => patch({ removed: [], swaps: {} })} className="text-green underline">
                    vrátit původní výběr ({a.removed.length + Object.keys(a.swaps).length})
                  </button>
                </>
              )}
            </span>
            <span>
              Celkem <strong className="font-display text-[22px] text-green">{formatPrice(plan.totalCzk)}</strong>
            </span>
          </div>
          {plan.items.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="action"
                onClick={() => {
                  plan.items.forEach((r) => cart.add(r.product.slug, r.qty));
                  setAdded(true);
                }}
              >
                {added ? "Přidáno do košíku" : "Přidat vše do košíku"}
              </Button>
              {added && (
                <ButtonLink href="/kosik" variant="secondary">
                  Do košíku
                </ButtonLink>
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (!added) plan.items.forEach((r) => cart.add(r.product.slug, r.qty));
                  setAdded(true);
                  router.push(`/pokladna?predplatne=${days === 30 ? 28 : days}`);
                }}
              >
                Posílat pravidelně
              </Button>
            </div>
          )}
          <p className="mt-4 text-xs text-muted">
            Výsledek je orientační výchozí hodnota pro zdravé zvíře podle doporučení FEDIAF. Dávku upravujte podle kondice: žebra mají být hmatatelná lehkým tlakem a
            pas viditelný shora. Po dvou až čtyřech týdnech zvíře zvažte a výpočet zopakujte. U štěňat velkých plemen, březích a kojících zvířat, seniorů s nadváhou a při
            jakémkoli onemocnění dávku konzultujte s veterinářem. Kalkulačka nenahrazuje veterinární vyšetření.
          </p>
        </section>
      )}
    </div>
  );
}

function AnimalForm({ a, onChange }: { a: AnimalInput; onChange: (p: Partial<AnimalInput>) => void }) {
  const isDog = a.species === "pes";
  const young = a.stage === "mlade";
  const special = a.stage === "brezi" || a.stage === "kojici";
  const estimate = isDog && young && a.weightKg > 0 && (a.ageMonths ?? 0) > 0 ? estimateAdultWeight(a.weightKg, a.ageMonths as number) : null;
  const numberValue = (v: number | undefined) => (v && v > 0 ? String(v) : "");
  const num = (s: string) => {
    const n = Number(s.replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Jméno" hint="nepovinné">
        <input value={a.name} onChange={(e) => onChange({ name: e.target.value })} placeholder={isDog ? "např. Rex" : "např. Micka"} />
      </Field>
      <Field label="Kdo bude jíst?">
        <select value={a.species} onChange={(e) => onChange({ species: e.target.value as Species, stage: "dospely", ration: "pmr", rawShare: 100, removed: [], swaps: {} })}>
          <option value="pes">Pes</option>
          <option value="kocka">Kočka</option>
        </select>
      </Field>
      <Field label="Životní fáze">
        <select value={a.stage} onChange={(e) => onChange({ stage: e.target.value as Stage, rawShare: e.target.value === "mlade" ? a.rawShare : 100, removed: [], swaps: {} })}>
          {(Object.keys(STAGE_LABEL[a.species]) as Stage[]).map((s) => (
            <option key={s} value={s}>
              {STAGE_LABEL[a.species][s]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Aktuální hmotnost (kg)">
        <input type="number" inputMode="decimal" min={0.3} max={120} step={0.1} value={numberValue(a.weightKg)} onChange={(e) => onChange({ weightKg: num(e.target.value) })} placeholder="např. 20" />
      </Field>

      {young && (
        <Field label="Věk (měsíce)">
          <input type="number" inputMode="numeric" min={1} max={24} step={1} value={numberValue(a.ageMonths)} onChange={(e) => onChange({ ageMonths: num(e.target.value) })} placeholder="např. 4" />
        </Field>
      )}
      {young && isDog && (
        <Field label="Dospělá hmotnost (kg)" hint={estimate ? `odhad ${estimate} kg` : "plemeno nebo rodiče"}>
          <div className="flex gap-2">
            <input type="number" inputMode="decimal" min={1} max={100} step={0.5} value={numberValue(a.adultWeightKg)} onChange={(e) => onChange({ adultWeightKg: num(e.target.value) || undefined })} placeholder={estimate ? String(estimate) : "např. 30"} className="min-w-0" />
            <select aria-label="Plemeno" value="" onChange={(e) => e.target.value && onChange({ adultWeightKg: Number(e.target.value) })} className="w-auto max-w-[45%]">
              <option value="">plemeno…</option>
              {BREEDS.map((b) => (
                <option key={b.name} value={b.kg}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </Field>
      )}
      {a.stage === "brezi" && (
        <Field label="Týden březosti" hint="1–9">
          <input type="number" inputMode="numeric" min={1} max={9} value={a.pregnancyWeek ?? ""} onChange={(e) => onChange({ pregnancyWeek: num(e.target.value) || undefined })} placeholder="např. 6" />
        </Field>
      )}
      {a.stage === "kojici" && (
        <>
          <Field label="Počet mláďat">
            <input type="number" inputMode="numeric" min={1} max={14} value={a.litterSize ?? ""} onChange={(e) => onChange({ litterSize: num(e.target.value) || undefined })} placeholder="např. 6" />
          </Field>
          <Field label="Týden kojení" hint="1–4">
            <input type="number" inputMode="numeric" min={1} max={4} value={a.lactationWeek ?? ""} onChange={(e) => onChange({ lactationWeek: num(e.target.value) || undefined })} placeholder="např. 3" />
          </Field>
        </>
      )}

      {!young && !special && (
        <>
          <Field label="Aktivita">
            <select value={a.activity} onChange={(e) => onChange({ activity: e.target.value as Activity })}>
              {(isDog ? (["nizka", "bezna", "vysoka", "pracovni"] as Activity[]) : (["nizka", "bezna", "vysoka"] as Activity[])).map((k) => (
                <option key={k} value={k}>
                  {ACTIVITY_LABEL[a.species][k]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Kastrace">
            <select value={a.neutered ? "ano" : "ne"} onChange={(e) => onChange({ neutered: e.target.value === "ano" })}>
              <option value="ano">Kastrovaný</option>
              <option value="ne">Nekastrovaný</option>
            </select>
          </Field>
        </>
      )}
      {!young && (
        <Field label="Kondice">
          <select value={a.condition} onChange={(e) => onChange({ condition: e.target.value as Condition })}>
            {(Object.keys(CONDITION_LABEL) as Condition[]).map((k) => (
              <option key={k} value={k}>
                {CONDITION_LABEL[k]}
              </option>
            ))}
          </select>
        </Field>
      )}
      {isDog && (
        <Field label="Složení dávky">
          <select value={a.ration} onChange={(e) => onChange({ ration: e.target.value as AnimalInput["ration"] })}>
            <option value="pmr">Jen maso, kost a vnitřnosti</option>
            <option value="zelenina">S 20 % zeleniny</option>
          </select>
        </Field>
      )}
      <Field label="Začínáme s BARFem?">
        <select value={a.beginner ? "ano" : "ne"} onChange={(e) => onChange({ beginner: e.target.value === "ano", rawShare: e.target.value === "ano" || young ? a.rawShare : 100 })}>
          <option value="ne">Už krmíme syrově</option>
          <option value="ano">Ano, přecházíme</option>
        </select>
      </Field>
      {(young || a.beginner) && (
        <Field label="Podíl syrové stravy" hint="zbytek granule">
          <select value={a.rawShare} onChange={(e) => onChange({ rawShare: Number(e.target.value) as AnimalInput["rawShare"] })}>
            <option value={100}>100 % syrová</option>
            <option value={75}>75 % syrová, 25 % granule</option>
            <option value={50}>50 % syrová, 50 % granule</option>
            <option value={25}>25 % syrová, 75 % granule</option>
          </select>
        </Field>
      )}
    </div>
  );
}

function ResultView({ plan, encoded, defaultEmail }: { plan: Plan; encoded: string; defaultEmail: string }) {
  const { input: a, result: r } = plan;
  const who = a.name || (a.species === "pes" ? "Váš pes" : "Vaše kočka");
  const perMeal = round5(r.dailyGrams / r.mealsPerDay);
  const comp = r.composition;
  const parts = [
    { label: "svalovina", v: comp.muscle, cls: "bg-green" },
    { label: "kost", v: comp.bone, cls: "bg-brick" },
    { label: "játra", v: comp.liver, cls: "bg-brick-text" },
    { label: "vnitřnosti", v: comp.organs, cls: "bg-green-hover" },
    { label: "zelenina", v: comp.plant, cls: "bg-line" },
  ].filter((p) => p.v > 0);

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[22px]">{who}</h2>
        <span className="text-xs text-muted">
          {STAGE_LABEL[a.species][a.stage]} · {a.weightKg} kg{a.condition !== "idealni" && a.stage !== "mlade" ? ` · cíl ${r.idealKg} kg` : ""} · {r.pct} % hmotnosti
          {r.energyMode ? ` · ${r.kcalPerDay} kcal` : ""}
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Denně" value={`${r.dailyGrams} g`} sub={`rozmezí ${r.rangeGrams[0]}–${r.rangeGrams[1]} g`} />
        <Tile label="Týdně" value={kgText(r.dailyGrams * 7)} sub="7 dní" />
        <Tile label="Měsíčně" value={kgText(r.dailyGrams * 30)} sub="30 dní" />
        <Tile label="Porce" value={`${r.mealsPerDay} × ${perMeal} g`} sub={`${r.mealsPerDay} ${r.mealsPerDay === 2 ? "jídla" : "jídel"} denně${r.kibbleKcal > 0 ? ` · plus granule ${r.kibbleGrams ? `${r.kibbleGrams} g` : `${r.kibbleKcal} kcal`}` : ""}`} />
      </div>
      <div className="mt-3 flex h-2.5 overflow-hidden rounded-[var(--radius-control)] border border-line">
        {parts.map((p) => (
          <div key={p.label} className={p.cls} style={{ width: `${p.v}%` }} title={`${p.label} ${p.v} %`} />
        ))}
      </div>
      <p className="mt-1 text-xs text-muted">
        {parts.map((p) => `${p.label} ${p.v} %`).join(" · ")}
        {plan.bone.fromMix != null ? ` · kost z mixu ${plan.bone.fromMix} %, z Kostí ${plan.bone.fromBones} %` : ""}
      </p>
      {plan.notes.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {plan.notes.map((n, i) => (
            <li key={i} className={n.kind === "warn" ? "text-brick-text" : "text-muted"}>
              {n.text}
            </li>
          ))}
        </ul>
      )}
      <PlanExport plan={plan} encoded={encoded} defaultEmail={defaultEmail} />
    </>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-cream px-4 py-3">
      <p className="label text-[11px] text-muted">{label}</p>
      <p className="font-display text-[28px] font-semibold leading-tight text-green">{value}</p>
      <p className="text-xs text-muted">{sub}</p>
    </div>
  );
}

/** Plán krmení: sbalený náhled týdne v misce, stažení, tisk a odeslání PDF. */
function PlanExport({ plan, encoded, defaultEmail }: { plan: Plan; encoded: string; defaultEmail: string }) {
  const [open, setOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const href = `/kalkulacka/plan.pdf?d=${encoded}`;
  const btn = "inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-control)] border border-line bg-paper px-3 text-sm text-green hover:border-green";
  const week = open ? weeklySchedule(plan) : [];

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={btn}>
          {open ? "Skrýt plán krmení" : "Plán krmení na lednici (PDF)"}
        </button>
        <span className="text-xs text-muted">Jedna stránka: dávka, porce, týden v misce{plan.input.beginner ? ", postup přechodu" : ""}.</span>
      </div>
      {open && (
        <div className="mt-3 rounded-[var(--radius-card)] border border-line bg-cream p-4">
          <p className="label text-[11px] text-brick-text">Týden v misce</p>
          <table className="mt-2 w-full text-sm">
            <tbody className="divide-y divide-line">
              {week.map((d) => (
                <tr key={d.day}>
                  <td className="label w-20 py-1.5 pr-2 align-top text-[10px] text-green">{d.label}</td>
                  <td className="py-1.5">
                    {d.items.length === 0 && <span className="text-muted">stavte se pro mix, zrovna nic není skladem</span>}
                    {d.items.map((it, j) => (
                      <div key={j} className="flex justify-between gap-2">
                        <span>
                          {productName(it.product)}
                          {it.note ? <span className="text-muted"> · {it.note}</span> : null}
                        </span>
                        <span className="whitespace-nowrap">{it.grams > 0 ? `${it.grams} g` : ""}</span>
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a href={`${href}&download=1`} className={btn}>
              <FileDown strokeWidth={1.75} className="h-4 w-4" /> Stáhnout PDF
            </a>
            <a href={href} target="_blank" rel="noopener" className={btn}>
              <Printer strokeWidth={1.75} className="h-4 w-4" /> Vytisknout
            </a>
            <button type="button" onClick={() => setEmailOpen((o) => !o)} aria-expanded={emailOpen} className={btn}>
              <Mail strokeWidth={1.75} className="h-4 w-4" /> Poslat e-mailem
            </button>
          </div>
          {emailOpen && (
            <form
              className="mt-3 flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  const res = await emailPlan(email, encoded);
                  setMsg(res.ok ? { ok: true, text: `Plán jsme poslali na ${email}.` } : { ok: false, text: res.error });
                });
              }}
            >
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vas@email.cz" required className="w-auto min-w-[220px]" aria-label="E-mail pro zaslání plánu" />
              <Button type="submit" variant="secondary" disabled={pending}>
                {pending ? "Odesílám…" : "Odeslat"}
              </Button>
            </form>
          )}
          {msg && (
            <p role="status" className={`mt-2 text-sm ${msg.ok ? "text-green" : "text-brick-text"}`}>
              {msg.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function AddonRow({ a, plan, onChange }: { a: AnimalInput; plan: Plan; onChange: (p: Partial<AnimalInput>) => void }) {
  const keys = (Object.keys(ADDON_LABEL) as AddonKey[]).filter((k) => {
    if (k === "zelenina") return a.species === "pes" && a.ration === "zelenina";
    if (k === "rekreacni") return a.species === "pes" && a.stage !== "mlade" && plan.result.idealKg >= 10;
    if (k === "granule") return a.rawShare < 100;
    return true;
  });
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="label text-[11px] text-muted">Přidat</span>
      {keys.map((k) => (
        <label key={k} className="flex items-center gap-1">
          <input type="checkbox" checked={a.addons[k]} onChange={(e) => onChange({ addons: { ...a.addons, [k]: e.target.checked } })} className="h-4 w-4 min-h-0 w-auto accent-green" />
          {ADDON_LABEL[k]}
        </label>
      ))}
    </div>
  );
}

function ShoppingTable({ plan, a, onChange }: { plan: Plan; a: AnimalInput; onChange: (p: Partial<AnimalInput>) => void }) {
  const used = new Set(plan.items.map((i) => i.product.slug));
  const alternatives = (it: Reco) =>
    it.role === "zaklad" || it.role === "kosti" ? plan.pool.filter((p) => p.line === it.product.line && !used.has(p.slug) && !(it.role === "zaklad" && /ryb/i.test(p.variant))) : [];
  /** Náhradu ukládáme pod původním slugem, aby šlo nahradit i už nahrazený produkt. */
  const originOf = (slug: string) => Object.keys(a.swaps).find((k) => a.swaps[k] === slug) ?? slug;

  if (plan.items.length === 0) return <p className="mt-3 text-sm text-muted">Pro tuto kombinaci zrovna nemáme skladem vhodný mix. Stavte se v prodejně, poskládáme set spolu.</p>;

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="label border-b border-line text-left text-[10px] text-muted">
            <th className="py-2 pr-2 font-semibold">Produkt</th>
            <th className="py-2 pr-2 text-right font-semibold">Denně</th>
            <th className="py-2 pr-2 text-right font-semibold">Balení</th>
            <th className="py-2 pr-2 text-right font-semibold">Cena</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {plan.items.map((it) => {
            const alts = alternatives(it);
            return (
              <tr key={it.product.slug}>
                <td className="py-2 pr-2">
                  <Link href={`/produkt/${it.product.slug}`} className="font-semibold hover:underline">
                    {productName(it.product)}
                  </Link>
                  <span className="block text-xs text-muted">
                    {it.why}
                    {alts.length > 0 && (
                      <>
                        {" · "}
                        <select value="" onChange={(e) => e.target.value && onChange({ swaps: { ...a.swaps, [originOf(it.product.slug)]: e.target.value } })} aria-label={`Nahradit ${productName(it.product)}`} className="inline-block w-auto min-h-0 border-0 border-b border-dashed border-line bg-transparent px-1 py-0 text-xs text-green">
                          <option value="">nahradit…</option>
                          {alts.map((p) => (
                            <option key={p.slug} value={p.slug}>
                              {p.variant}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </span>
                </td>
                <td className="whitespace-nowrap py-2 pr-2 text-right tabular-nums">{it.gramsPerDay > 0 && it.role !== "olej" ? `${round5(it.gramsPerDay)} g` : ""}</td>
                <td className="whitespace-nowrap py-2 pr-2 text-right tabular-nums">
                  {it.qty} × {formatWeight(it.product.weightGrams)}
                </td>
                <td className="whitespace-nowrap py-2 pr-2 text-right tabular-nums">{formatPrice(it.qty * it.product.priceCzk)}</td>
                <td className="py-2 text-right">
                  <button type="button" onClick={() => onChange({ removed: [...a.removed, it.product.slug] })} aria-label={`Vyřadit ${productName(it.product)}`} title="Vyřadit" className="inline-flex h-6 w-6 items-center justify-center rounded-[var(--radius-control)] text-muted hover:bg-cream hover:text-brick-text">
                    <X strokeWidth={1.75} className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label mb-1 block text-[11px] text-muted">
        {label}
        {hint && <span className="ml-1 normal-case tracking-normal">({hint})</span>}
      </span>
      {children}
    </label>
  );
}
