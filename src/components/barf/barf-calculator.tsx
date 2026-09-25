"use client";

import { FileDown, Mail, Plus, Printer, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { emailPlan } from "@/app/(shop)/kalkulacka/actions";
import { savePet } from "@/app/(shop)/ucet/actions";
import { useCart } from "@/components/cart/cart-context";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  ACTIVITY_LABEL,
  ADDON_LABEL,
  BREEDS,
  MEAT_LABEL,
  type AddonKey,
  type MeatKey,
  buildPlan,
  CONDITION_LABEL,
  estimateAdultWeight,
  mergeItems,
  newAnimal,
  STAGE_LABEL,
  type Activity,
  type AnimalInput,
  type Condition,
  type Plan,
  type Species,
  type Stage,
} from "@/lib/barf";
import { productName, type Product } from "@/lib/catalog";
import { formatPrice, formatWeight } from "@/lib/format";

/**
 * Kalkulačka dávky: více zvířat, výpočet podle energie (FEDIAF), doporučení z aktuální
 * nabídky na zvolené období, společný nákupní seznam, uložení profilu k účtu nebo do prohlížeče.
 */
export type SavedPet = { id: string; name: string; data: Partial<AnimalInput> };

const STORAGE_KEY = "dokosti-kalkulacka";
const DEFAULT: AnimalInput[] = [{ ...newAnimal("pes"), id: "prvni" }];

/* Uložený stav v prohlížeči; useSyncExternalStore drží server a klient v souladu bez setState v efektu. */
let cached: AnimalInput[] | null | undefined;
function readStored(): AnimalInput[] | null {
  if (cached !== undefined) return cached;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as AnimalInput[]) : null;
    cached = Array.isArray(parsed) && parsed.length ? parsed.map(withDefaults) : null;
  } catch {
    cached = null;
  }
  return cached;
}
function writeStored(list: AnimalInput[]) {
  cached = list;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* bez localStorage se stav nepamatuje */
  }
}
const noop = () => () => {};

/** Doplní nová pole do profilů uložených dřív. */
function withDefaults(a: Partial<AnimalInput>): AnimalInput {
  const base = newAnimal(a.species);
  return { ...base, ...a, addons: { ...base.addons, ...(a.addons ?? {}) }, exclude: a.exclude ?? [], removed: a.removed ?? [] } as AnimalInput;
}

/** Zakóduje vstup do URL parametru pro PDF a e-mail (base64url, stejně jako lib/pdf/request na serveru). */
function encodeRequest(animals: AnimalInput[], days: number) {
  const json = JSON.stringify({ animals, days });
  return btoa(Array.from(new TextEncoder().encode(json), (b) => String.fromCharCode(b)).join(""))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function BarfCalculator({
  products,
  user,
  savedPets = [],
  compact = false,
  initial,
}: {
  products: Product[];
  user: { email: string } | null;
  savedPets?: SavedPet[];
  compact?: boolean;
  /** Předvyplnění z odkazu v e-mailu s plánem. */
  initial?: { animals: AnimalInput[]; days: number } | null;
}) {
  const cart = useCart();
  const router = useRouter();
  const stored = useSyncExternalStore(noop, readStored, () => null);
  const [edited, setEdited] = useState<AnimalInput[] | null>(null);
  const animals = edited ?? initial?.animals ?? stored ?? DEFAULT;
  const [days, setDays] = useState<7 | 14 | 28>((initial?.days as 7 | 14 | 28) ?? 14);
  const [submitted, setSubmitted] = useState(!!initial);
  const [added, setAdded] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update(list: AnimalInput[]) {
    setEdited(list);
    writeStored(list);
    setAdded(false);
  }
  const patch = (id: string, p: Partial<AnimalInput>) => update(animals.map((a) => (a.id === id ? { ...a, ...p } : a)));

  const valid = animals.every((a) => a.weightKg > 0 && (a.stage !== "mlade" || (a.ageMonths ?? 0) > 0));
  const plans = useMemo<Plan[]>(() => (submitted && valid ? animals.map((a) => buildPlan(products, a, days)) : []), [submitted, valid, animals, products, days]);
  const merged = useMemo(() => mergeItems(plans), [plans]);
  const total = merged.reduce((s, r) => s + r.qty * r.product.priceCzk, 0);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setAdded(false);
  }

  function save(a: AnimalInput) {
    startTransition(async () => {
      const name = a.name || (a.species === "pes" ? "Pes" : "Kočka");
      const res = await savePet(name, a as unknown as Record<string, unknown>);
      setSaveMsg(res.ok ? `Profil „${name}“ je uložený u vašeho účtu.` : res.error);
    });
  }

  return (
    <div id="kalkulacka" className="scroll-mt-4 rounded-[var(--radius-card)] border border-line bg-paper p-5 md:p-6">
      {!compact && (
        <>
          <h2 className="text-[24px]">Spočítejte si denní dávku</h2>
          <p className="mt-1 text-sm text-muted">Vyplňte údaje o zvířeti. Můžete přidat i další, nákupní seznam se sečte.</p>
        </>
      )}

      {savedPets.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="label text-[11px] text-muted">Uložené profily:</span>
          {savedPets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => update([withDefaults({ ...p.data, id: p.id, name: p.name })])}
              className="rounded-[var(--radius-control)] border border-line bg-cream px-3 py-1 hover:border-green"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        {animals.map((a, idx) => (
          <AnimalForm key={a.id} a={a} index={idx} canRemove={animals.length > 1} onChange={(p) => patch(a.id, p)} onRemove={() => update(animals.filter((x) => x.id !== a.id))} />
        ))}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={!valid}>
            Spočítat
          </Button>
          <button type="button" onClick={() => update([...animals, newAnimal(animals[0]?.species ?? "pes")])} className="inline-flex min-h-10 items-center gap-1 text-sm text-green hover:underline">
            <Plus strokeWidth={1.75} className="h-4 w-4" /> Přidat další zvíře
          </button>
          <label className="ml-auto flex items-center gap-2 text-sm">
            <span className="label text-[11px] text-muted">Nákup na</span>
            <select value={days} onChange={(e) => setDays(Number(e.target.value) as 7 | 14 | 28)} className="min-h-9 w-auto py-1">
              <option value={7}>7 dní</option>
              <option value={14}>14 dní</option>
              <option value={28}>28 dní</option>
            </select>
          </label>
        </div>
      </form>

      {submitted && !valid && (
        <p role="alert" className="mt-3 text-sm text-brick-text">
          Doplňte hmotnost a u mláďat věk.
        </p>
      )}

      {plans.length > 0 && (
        <div className="mt-6 space-y-6 border-t border-line pt-5">
          {plans.map((pl) => (
            <PlanView key={pl.input.id} plan={pl} user={user} onSave={() => save(pl.input)} pending={pending} onChange={(p) => patch(pl.input.id, p)} />
          ))}
          {saveMsg && (
            <p role="status" className="text-sm text-green">
              {saveMsg}
            </p>
          )}

          <PlanExport encoded={encodeRequest(animals, days)} defaultEmail={user?.email ?? ""} />

          {merged.length > 0 && (
            <div className="rounded-[var(--radius-card)] border border-line bg-cream p-4">
              <p className="label text-[11px] text-brick-text">Nákupní seznam na {days} dní{plans.length > 1 ? ` pro ${plans.length} zvířata` : ""}</p>
              <ul className="mt-2 divide-y divide-line text-sm">
                {merged.map((r) => (
                  <li key={r.product.slug} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <Link href={`/produkt/${r.product.slug}`} className="font-semibold hover:underline">
                      {productName(r.product)} <span className="font-normal text-muted">· {formatWeight(r.product.weightGrams)}</span>
                    </Link>
                    <span className="whitespace-nowrap">
                      {r.qty} × {formatPrice(r.product.priceCzk)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="action"
                  onClick={() => {
                    merged.forEach((r) => cart.add(r.product.slug, r.qty));
                    setAdded(true);
                  }}
                >
                  {added ? "Přidáno do košíku" : `Přidat vše do košíku · ${formatPrice(total)}`}
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
                    if (!added) merged.forEach((r) => cart.add(r.product.slug, r.qty));
                    setAdded(true);
                    router.push(`/pokladna?predplatne=${days}`);
                  }}
                >
                  Posílat pravidelně
                </Button>
                <span className="text-sm text-muted">
                  To je {formatPrice(Math.round(total / days))} za den
                  {plans.length > 1 ? " za všechna zvířata" : ""}.
                </span>
              </div>
            </div>
          )}

          <p className="text-xs text-muted">
            Výsledek je orientační výchozí hodnota pro zdravá zvířata podle doporučení FEDIAF. Skutečná potřeba je individuální. Dávku upravujte podle
            kondice: žebra mají být hmatatelná lehkým tlakem a pas viditelný shora. Po dvou až čtyřech týdnech zvíře zvažte a výpočet zopakujte. U štěňat
            velkých plemen, březích a kojících zvířat, seniorů s nadváhou a při jakémkoli onemocnění dávku konzultujte s veterinářem. Kalkulačka nenahrazuje
            veterinární vyšetření.
          </p>
        </div>
      )}
    </div>
  );
}

/** Stažení, tisk a odeslání plánu krmení v PDF. */
function PlanExport({ encoded, defaultEmail }: { encoded: string; defaultEmail: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const href = `/kalkulacka/plan.pdf?d=${encoded}`;
  const btn = "inline-flex min-h-10 items-center gap-1.5 rounded-[var(--radius-control)] border border-line bg-paper px-3 text-sm text-green hover:border-green";

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
      <p className="label text-[11px] text-brick-text">Plán krmení na lednici</p>
      <p className="mt-1 text-sm text-muted">Jedna stránka na zvíře: dávka, porce, týden v misce a u začátečníků postup přechodu.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a href={`${href}&download=1`} className={btn}>
          <FileDown strokeWidth={1.75} className="h-4 w-4" /> Stáhnout PDF
        </a>
        <a href={href} target="_blank" rel="noopener" className={btn}>
          <Printer strokeWidth={1.75} className="h-4 w-4" /> Vytisknout
        </a>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={btn}>
          <Mail strokeWidth={1.75} className="h-4 w-4" /> Poslat e-mailem
        </button>
      </div>
      {open && (
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
  );
}

function AnimalForm({ a, index, canRemove, onChange, onRemove }: { a: AnimalInput; index: number; canRemove: boolean; onChange: (p: Partial<AnimalInput>) => void; onRemove: () => void }) {
  const isDog = a.species === "pes";
  const young = a.stage === "mlade";
  const estimate = isDog && young && a.weightKg > 0 && (a.ageMonths ?? 0) > 0 ? estimateAdultWeight(a.weightKg, a.ageMonths as number) : null;
  const numberValue = (v: number | undefined) => (v && v > 0 ? String(v) : "");
  const num = (s: string) => {
    const n = Number(s.replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  return (
    <fieldset className="rounded-[var(--radius-card)] border border-line bg-cream p-4">
      <legend className="label px-1 text-[11px] text-muted">Zvíře {index + 1}</legend>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Jméno" hint="nepovinné">
          <input value={a.name} onChange={(e) => onChange({ name: e.target.value })} placeholder={isDog ? "např. Rex" : "např. Micka"} />
        </Field>
        <Field label="Kdo bude jíst?">
          <select value={a.species} onChange={(e) => onChange({ species: e.target.value as Species, ration: "pmr", rawShare: 100 })}>
            <option value="pes">Pes</option>
            <option value="kocka">Kočka</option>
          </select>
        </Field>
        <Field label="Životní fáze">
          <select value={a.stage} onChange={(e) => onChange({ stage: e.target.value as Stage, rawShare: e.target.value === "mlade" ? a.rawShare : 100 })}>
            {(Object.keys(STAGE_LABEL[a.species]) as Stage[]).map((s) => (
              <option key={s} value={s}>
                {STAGE_LABEL[a.species][s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Aktuální hmotnost (kg)">
          <input type="number" inputMode="decimal" min={0.3} max={120} step={0.1} value={numberValue(a.weightKg)} onChange={(e) => onChange({ weightKg: num(e.target.value) })} placeholder="např. 20" required />
        </Field>

        {young && (
          <Field label="Věk (měsíce)">
            <input type="number" inputMode="numeric" min={1} max={24} step={1} value={numberValue(a.ageMonths)} onChange={(e) => onChange({ ageMonths: num(e.target.value) })} placeholder="např. 4" required />
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
          <Field label="Týden březosti">
            <input type="number" inputMode="numeric" min={1} max={9} value={a.pregnancyWeek ?? ""} onChange={(e) => onChange({ pregnancyWeek: num(e.target.value) || undefined })} placeholder="1–9" />
          </Field>
        )}
        {a.stage === "kojici" && (
          <>
            <Field label="Počet mláďat">
              <input type="number" inputMode="numeric" min={1} max={14} value={a.litterSize ?? ""} onChange={(e) => onChange({ litterSize: num(e.target.value) || undefined })} placeholder="např. 6" />
            </Field>
            <Field label="Týden kojení">
              <input type="number" inputMode="numeric" min={1} max={4} value={a.lactationWeek ?? ""} onChange={(e) => onChange({ lactationWeek: num(e.target.value) || undefined })} placeholder="1–4" />
            </Field>
          </>
        )}

        {!young && a.stage !== "brezi" && a.stage !== "kojici" && (
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
            <Field label="Kondice">
              <select value={a.condition} onChange={(e) => onChange({ condition: e.target.value as Condition })}>
                {(Object.keys(CONDITION_LABEL) as Condition[]).map((k) => (
                  <option key={k} value={k}>
                    {CONDITION_LABEL[k]}
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

        {isDog && (
          <Field label="Složení dávky">
            <select value={a.ration} onChange={(e) => onChange({ ration: e.target.value as AnimalInput["ration"] })}>
              <option value="pmr">Jen maso, kost a vnitřnosti</option>
              <option value="zelenina">S 20 % zeleniny</option>
            </select>
          </Field>
        )}
        <Field label="Začínáme s BARFem?">
          <select value={a.beginner ? "ano" : "ne"} onChange={(e) => onChange({ beginner: e.target.value === "ano", rawShare: e.target.value === "ano" ? a.rawShare : young ? a.rawShare : 100 })}>
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
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="label text-[11px] text-muted">Nesmí:</span>
        {(Object.keys(MEAT_LABEL) as MeatKey[]).map((k) => (
          <label key={k} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={a.exclude.includes(k)}
              onChange={(e) => onChange({ exclude: e.target.checked ? [...a.exclude, k] : a.exclude.filter((x) => x !== k), removed: [] })}
              className="h-4 w-4 min-h-0 w-auto accent-brick"
            />
            {MEAT_LABEL[k]}
          </label>
        ))}
      </div>
      {canRemove && (
        <button type="button" onClick={onRemove} className="mt-3 inline-flex items-center gap-1 text-xs text-brick-text hover:underline">
          <Trash2 strokeWidth={1.75} className="h-3.5 w-3.5" /> Odebrat
        </button>
      )}
    </fieldset>
  );
}

function PlanView({ plan, user, onSave, pending, onChange }: { plan: Plan; user: { email: string } | null; onSave: () => void; pending: boolean; onChange: (p: Partial<AnimalInput>) => void }) {
  const { input: a, result: r, items, days } = plan;
  // Které doplňky dávají u tohoto zvířete smysl.
  const addonKeys = (Object.keys(ADDON_LABEL) as AddonKey[]).filter((k) => {
    if (k === "zelenina") return a.species === "pes" && a.ration === "zelenina";
    if (k === "rekreacni") return a.species === "pes" && a.stage !== "mlade" && r.idealKg >= 10;
    if (k === "granule") return a.rawShare < 100;
    return true;
  });
  const who = a.name || (a.species === "pes" ? "Váš pes" : "Vaše kočka");
  const perMeal = Math.round(r.dailyGrams / r.mealsPerDay / 5) * 5;
  const weeklyKg = Math.round((r.dailyGrams * 7) / 100) / 10;
  const mainMix = items.find((i) => i.role === "zaklad");
  const lasts = mainMix ? Math.max(1, Math.floor(mainMix.product.weightGrams / Math.max(1, mainMix.gramsPerDay))) : null;
  const comp = r.composition;
  const parts = [
    { label: "svalovina", v: comp.muscle, cls: "bg-green" },
    { label: "kost", v: comp.bone, cls: "bg-brick" },
    { label: "játra", v: comp.liver, cls: "bg-brick-text" },
    { label: "vnitřnosti", v: comp.organs, cls: "bg-green-hover" },
    { label: "zelenina", v: comp.plant, cls: "bg-line" },
  ].filter((p) => p.v > 0);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[20px]">{who}</h3>
        <span className="text-xs text-muted">
          {STAGE_LABEL[a.species][a.stage]} · {a.weightKg} kg{a.condition !== "idealni" ? ` · cíl ${r.idealKg} kg` : ""}
        </span>
      </div>
      <p className="mt-1 text-lg">
        Denně přibližně <strong>{r.dailyGrams} g</strong> syrové stravy
        <span className="text-muted"> ({r.rangeGrams[0]}–{r.rangeGrams[1]} g)</span>, tedy {r.mealsPerDay} × {perMeal} g a asi{" "}
        <strong>{weeklyKg.toLocaleString("cs-CZ")} kg</strong> týdně.
      </p>
      <p className="mt-1 text-xs text-muted">
        {r.pct} % aktuální hmotnosti
        {r.energyMode ? ` · ${r.kcalPerDay} kcal denně, přepočet podle energie mixu ${r.kcalPer100g} kcal/100 g` : ""}
        {r.kibbleKcal > 0 ? ` · plus granule ${r.kibbleGrams ? `${r.kibbleGrams} g` : `${r.kibbleKcal} kcal`} denně` : ""}
      </p>

      <div className="mt-3">
        <div className="flex h-3 overflow-hidden rounded-[var(--radius-control)] border border-line">
          {parts.map((p) => (
            <div key={p.label} className={p.cls} style={{ width: `${p.v}%` }} title={`${p.label} ${p.v} %`} />
          ))}
        </div>
        <p className="mt-1 text-xs text-muted">
          Cílové složení: {parts.map((p) => `${p.label} ${p.v} %`).join(" · ")}
          {plan.bone.fromMix != null ? ` · kost z mixu ${plan.bone.fromMix} %, z Kostí ${plan.bone.fromBones} %` : ""}
        </p>
      </div>

      {plan.notes.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {plan.notes.map((n, i) => (
            <li key={i} className={n.kind === "warn" ? "text-brick-text" : "text-muted"}>
              {n.text}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="label text-[11px] text-muted">Do nákupu přidat:</span>
        {addonKeys.map((k) => (
          <label key={k} className="flex items-center gap-1">
            <input type="checkbox" checked={a.addons[k]} onChange={(e) => onChange({ addons: { ...a.addons, [k]: e.target.checked } })} className="h-4 w-4 min-h-0 w-auto accent-green" />
            {ADDON_LABEL[k]}
          </label>
        ))}
        {a.removed.length > 0 && (
          <button type="button" onClick={() => onChange({ removed: [] })} className="text-xs text-green underline">
            vrátit vyřazené produkty ({a.removed.length})
          </button>
        )}
      </div>

      {items.length > 0 && (
        <div className="mt-4">
          <p className="label text-[11px] text-brick-text">Doporučení z naší nabídky na {days} dní</p>
          <ul className="mt-2 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-cream">
            {items.map((it) => (
              <li key={it.product.slug} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <div>
                  <Link href={`/produkt/${it.product.slug}`} className="font-semibold hover:underline">
                    {productName(it.product)}
                  </Link>
                  <span className="text-muted">
                    {" "}
                    · {formatWeight(it.product.weightGrams)}
                    {it.gramsPerDay > 0 && it.role !== "olej" ? ` · ${Math.round(it.gramsPerDay / 5) * 5} g denně` : ""} · {it.why}
                  </span>
                </div>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  {it.qty} × {formatPrice(it.product.priceCzk)}
                  <button type="button" onClick={() => onChange({ removed: [...a.removed, it.product.slug] })} aria-label={`Vyřadit ${productName(it.product)}`} title="Vyřadit z doporučení" className="inline-flex h-6 w-6 items-center justify-center rounded-[var(--radius-control)] text-muted hover:bg-paper hover:text-brick-text">
                    <X strokeWidth={1.75} className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">
            Celkem {formatPrice(plan.totalCzk)}, tedy {formatPrice(plan.perDayCzk)} za den.
            {lasts && mainMix ? ` Balení ${productName(mainMix.product)} vydrží asi ${lasts} ${lasts === 1 ? "den" : lasts < 5 ? "dny" : "dní"}.` : ""}
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        {user ? (
          <button type="button" onClick={onSave} disabled={pending} className="text-green underline disabled:opacity-50">
            {pending ? "Ukládám…" : "Uložit profil k účtu"}
          </button>
        ) : (
          <span className="text-muted">
            Údaje si pamatuje tento prohlížeč.{" "}
            <Link href="/ucet/prihlaseni?next=/kalkulacka" className="text-green underline">
              Po přihlášení
            </Link>{" "}
            je uložíme k účtu.
          </span>
        )}
      </div>
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
