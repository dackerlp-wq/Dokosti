"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { deleteProduct, saveProduct } from "@/app/admin/(app)/produkty/actions";
import { ImageUpload } from "@/components/admin/image-upload";
import { Button } from "@/components/ui/button";
import type { ProductRow } from "@/lib/admin";
import { ANIMAL_LABEL, BONE_CLASS_LABEL, LINES, LINE_INFO, MEAT_LABEL, MEATS, STORAGE_LABEL, UNIT_LABEL } from "@/lib/catalog";

const STEPS = ["Co to je", "Cena a balení", "Sklad a dodavatel", "Etiketa a web"] as const;

/**
 * Produkt ve čtyřech krocích s náhledem, jak ho uvidí zákazník. Všechna pole zůstávají ve formuláři
 * (skryté kroky se jen nezobrazují), takže se uloží najednou a při chybě se nic neztratí.
 */
export function ProductForm({ product, others = [], manager = true, suppliers = [] }: { product?: ProductRow; others?: { slug: string; name: string }[]; manager?: boolean; suppliers?: { id: string; name: string; lead_days: number }[] }) {
  const [state, action, pending] = useActionState(saveProduct, null);
  const p = product;
  const [step, setStep] = useState(1);
  const [unit, setUnit] = useState<"ks" | "kg">(p?.unit ?? "ks");
  const [preview, setPreview] = useState({ variant: p?.variant ?? "", line: p?.line ?? "barf", price: p?.price_czk ?? 0, weight: p?.weight_grams ?? 1000, intro: p?.intro ?? "", producer: p?.producer ?? "", published: p?.is_published ?? false, isNew: p?.is_new ?? false, stock: p?.stock_qty ?? null, purchase: p?.purchase_price_czk ?? null });
  const margin = preview.purchase && preview.price > 0 ? Math.round(((preview.price - preview.purchase) / preview.price) * 1000) / 10 : null;
  const name = preview.variant.trim() ? preview.variant.trim().charAt(0).toUpperCase() + preview.variant.trim().slice(1) : "Název produktu";
  const missing = [!preview.variant.trim() && "název", !(preview.price > 0) && "cena", !p?.image_url && "fotka", !p?.ean && "EAN pro kasu"].filter(Boolean) as string[];

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_300px]">
      {p && <input type="hidden" name="id" value={p.id} />}

      <div className="space-y-5">
        <ol className="flex overflow-hidden rounded-card border border-line bg-white">
          {STEPS.map((label, i) => {
            const n = i + 1;
            return (
              <li key={label} className="flex-1">
                <button type="button" onClick={() => setStep(n)} className={`flex w-full items-center gap-2 border-r border-line px-3 py-2 text-left text-small last:border-r-0 ${n === step ? "bg-paper text-ink" : "text-muted hover:text-ink"}`}>
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${n === step ? "bg-green text-cream" : "border border-line"}`}>{n}</span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <div hidden={step !== 1} className="space-y-5">
        <Fieldset title="Název">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Řada">
              <select name="line" defaultValue={p?.line ?? "barf"} onChange={(e) => setPreview((v) => ({ ...v, line: e.target.value as ProductRow["line"] }))}>
                {LINES.map((l) => (
                  <option key={l} value={l}>
                    {LINE_INFO[l].name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Druh masa / suroviny" hint="např. hovězí mix">
              <input name="variant" defaultValue={p?.variant} required onChange={(e) => setPreview((v) => ({ ...v, variant: e.target.value }))} />
            </Field>
            <Field label="Adresa (slug)" hint="prázdné = vytvoří se z názvu">
              <input name="slug" defaultValue={p?.slug} pattern="[a-z0-9\-]*" />
            </Field>
            <Field label="Výrobce">
              <input name="producer" defaultValue={p?.producer} list="vyrobci" onChange={(e) => setPreview((v) => ({ ...v, producer: e.target.value }))} />
              <datalist id="vyrobci">
                {suppliers.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </Field>
          </div>
        </Fieldset>
        <Fieldset title="Fotka">
          <ImageUpload name="image_url" initialUrl={p?.image_url ?? null} slug={p?.slug ?? "novy"} />
        </Fieldset>
        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={() => setStep(2)}>
            Pokračovat: cena a balení
          </Button>
        </div>
        </div>

        <div hidden={step !== 2} className="space-y-5">
        <Fieldset title="Balení a cena">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Prodejní jednotka">
              <select name="unit" value={unit} onChange={(e) => setUnit(e.target.value as "ks" | "kg")}>
                {(Object.keys(UNIT_LABEL) as ("ks" | "kg")[]).map((u) => (
                  <option key={u} value={u}>
                    {UNIT_LABEL[u]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={unit === "kg" ? "Orientační porce (g)" : "Hmotnost (g)"} hint={unit === "kg" ? "jen pro zobrazení" : undefined}>
              <input name="weight_grams" type="number" min={1} defaultValue={p?.weight_grams ?? (unit === "kg" ? 1000 : undefined)} required onChange={(e) => setPreview((v) => ({ ...v, weight: Number(e.target.value) || 0 }))} />
            </Field>
            <Field label={unit === "kg" ? "Cena za kg (Kč)" : "Cena (Kč)"}>
              <input name="price_czk" type="number" min={0} defaultValue={p?.price_czk} required onChange={(e) => setPreview((v) => ({ ...v, price: Number(e.target.value) || 0 }))} />
            </Field>
            <Field label={unit === "kg" ? "Cena za kg v prodejně (Kč)" : "Cena v prodejně (Kč)"} hint="pro kasu a cenovky; prázdné = jako na e-shopu">
              <input name="store_price_czk" type="number" min={1} defaultValue={p?.store_price_czk ?? ""} />
            </Field>
            <Field label="Původní cena (Kč)" hint="přeškrtnutá; akce s platností: Akce a slevy">
              <input name="original_price_czk" type="number" min={0} defaultValue={p?.original_price_czk ?? ""} />
            </Field>
            <Field label="Sazba DPH" hint="na doklady a účtenky, potvrdit s účetní">
              <select name="vat_rate" defaultValue={p?.vat_rate ?? 12}>
                <option value={12}>12 %</option>
                <option value={21}>21 %</option>
                <option value={0}>0 %</option>
              </select>
            </Field>
            <Field label="Skladování">
              <select name="storage" defaultValue={p?.storage ?? "mrazene"}>
                {(Object.keys(STORAGE_LABEL) as (keyof typeof STORAGE_LABEL)[]).map((s) => (
                  <option key={s} value={s}>
                    {STORAGE_LABEL[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Druhy masa" hint="podkategorie a filtr, může být víc">
              <div className="flex min-h-10 flex-wrap items-center gap-x-4 gap-y-1">
                {MEATS.map((m) => (
                  <label key={m} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="meats" value={m} defaultChecked={p?.meats?.includes(m) ?? false} className="h-4 w-4 min-h-0 w-auto accent-green" />
                    {MEAT_LABEL[m]}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Pro koho">
              <div className="flex min-h-10 items-center gap-4">
                {(Object.keys(ANIMAL_LABEL) as (keyof typeof ANIMAL_LABEL)[]).map((a) => (
                  <label key={a} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="animals" value={a} defaultChecked={p ? p.animals.includes(a) : a === "pes"} className="h-4 w-4 min-h-0 w-auto accent-green" />
                    {ANIMAL_LABEL[a]}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Pořadí" hint="menší číslo = výš">
              <input name="sort_order" type="number" defaultValue={p?.sort_order ?? 0} />
            </Field>
            <Field label="EAN" hint="čárový kód pro kasu">
              <input name="ean" inputMode="numeric" defaultValue={p?.ean ?? ""} placeholder="8590…" />
            </Field>
            {manager && (
              <Field label="Nákupní cena (Kč)" hint={margin !== null ? `marže ${margin} %` : "z poslední příjemky"}>
                <input name="purchase_price_czk" type="number" min={0} step="0.01" defaultValue={p?.purchase_price_czk ?? ""} onChange={(e) => setPreview((v) => ({ ...v, purchase: e.target.value === "" ? null : Number(e.target.value) }))} />
              </Field>
            )}
          </div>
          {unit === "kg" && <p className="mt-2 text-small text-muted">Zboží na váhu se prodává jen v prodejně. Na webu se zobrazí s cenou za kg a bez košíku.</p>}
        </Fieldset>
        <div className="flex justify-between">
          <Button type="button" variant="secondary" onClick={() => setStep(1)}>
            Zpět
          </Button>
          <Button type="button" variant="secondary" onClick={() => setStep(3)}>
            Pokračovat: sklad a dodavatel
          </Button>
        </div>
        </div>

        <div hidden={step !== 3} className="space-y-5">
        <Fieldset title="Sklad">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={unit === "kg" ? "Skladem (kg)" : "Kusů skladem"} hint="prázdné = neevidovat">
              <input name="stock_qty" type="number" min={0} step={unit === "kg" ? "0.001" : "1"} defaultValue={p?.stock_qty ?? ""} onChange={(e) => setPreview((v) => ({ ...v, stock: e.target.value === "" ? null : Number(e.target.value) }))} />
            </Field>
            <Field label="Hlásit docházení od" hint={unit}>
              <input name="low_stock_threshold" type="number" min={0} defaultValue={p?.low_stock_threshold ?? 3} />
            </Field>
            <Field label="Obvyklé balení od dodavatele" hint={`${unit} v kartonu, pro objednávky`}>
              <input name="pack_size" type="number" min={0} step={unit === "kg" ? "0.5" : "1"} defaultValue={p?.pack_size ?? ""} />
            </Field>
          </div>
          <p className="mt-2 text-small text-muted">Počáteční množství u nového produktu raději nezadávejte sem: naskladněte ho příjemkou, aby vznikla šarže s expirací a nákupní cena. Ruční číslo tady se zapíše do pohybů jako oprava.</p>
        </Fieldset>
        <Fieldset title="Dodavatel">
          <Field label="Od koho zboží bereme" hint="předvyplní příjemku a objednávku">
            <select name="supplier_id" defaultValue={p?.supplier_id ?? ""}>
              <option value="">bez dodavatele</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · dodání {s.lead_days} dní
                </option>
              ))}
            </select>
          </Field>
          {suppliers.length === 0 && <p className="mt-2 text-small text-muted">Zatím žádný dodavatel. Založte ho v Zboží → Dodavatelé.</p>}
        </Fieldset>
        <div className="flex justify-between">
          <Button type="button" variant="secondary" onClick={() => setStep(2)}>
            Zpět
          </Button>
          <Button type="button" variant="secondary" onClick={() => setStep(4)}>
            Pokračovat: etiketa a web
          </Button>
        </div>
        </div>

        <div hidden={step !== 4} className="space-y-5">
        <Fieldset title="Popis">
          <div className="space-y-3">
            <Field label="Úvodní věta" hint="co to je a pro koho">
              <textarea name="intro" rows={2} defaultValue={p?.intro} onChange={(e) => setPreview((v) => ({ ...v, intro: e.target.value }))} />
            </Field>
            <Field label="Složení" hint="v procentech, od výrobce">
              <textarea name="composition" rows={2} defaultValue={p?.composition} />
            </Field>
            <Field label="Skladování">
              <textarea name="storage_note" rows={2} defaultValue={p?.storage_note} />
            </Field>
            <Field label="Dávkování">
              <textarea name="dosage" rows={2} defaultValue={p?.dosage} />
            </Field>
          </div>
        </Fieldset>

        <Fieldset title="Údaje z etikety pro kalkulačku">
          <p className="mb-3 text-small text-muted">
            Opište z etikety výrobce, nic nedopočítávejte. Dokud energie u BARF mixů chybí, kalkulačka počítá orientačně procentem
            hmotnosti; s energií počítá přesněji a zobrazí i kcal. Podíl kosti se používá pro bilanci kostí v dávce.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Podíl masa (%)" hint="maso a vnitřnosti ze složení, ukáže se na kartě">
              <input name="meat_pct" type="number" min={0} max={100} step="0.1" defaultValue={p?.meat_pct ?? ""} />
            </Field>
            <Field label="Energie (kcal/100 g)" hint="ME z etikety">
              <input name="kcal_per_100g" type="number" min={0} step="0.1" defaultValue={p?.kcal_per_100g ?? ""} />
            </Field>
            <Field label="Kost (%)" hint="jedlá kost">
              <input name="bone_pct" type="number" min={0} max={100} step="0.1" defaultValue={p?.bone_pct ?? ""} />
            </Field>
            <Field label="Vnitřnosti (%)" hint="celkem">
              <input name="organ_pct" type="number" min={0} max={100} step="0.1" defaultValue={p?.organ_pct ?? ""} />
            </Field>
            <Field label="Játra (%)">
              <input name="liver_pct" type="number" min={0} max={100} step="0.1" defaultValue={p?.liver_pct ?? ""} />
            </Field>
            <Field label="Taurin (mg/kg)" hint="kočičí mixy">
              <input name="taurine_mg_per_kg" type="number" min={0} step="1" defaultValue={p?.taurine_mg_per_kg ?? ""} />
            </Field>
            <Field label="Druh kosti" hint="řada Kosti">
              <select name="bone_class" defaultValue={p?.bone_class ?? ""}>
                <option value="">neurčeno</option>
                {(Object.keys(BONE_CLASS_LABEL) as (keyof typeof BONE_CLASS_LABEL)[]).map((k) => (
                  <option key={k} value={k}>
                    {BONE_CLASS_LABEL[k]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-3 text-sm">
            <Check name="is_complete" label="Kompletní krmivo podle etikety (jinak doplňkové)" defaultChecked={p?.is_complete ?? false} />
          </div>
        </Fieldset>
        <Fieldset title="Doporučení">
          <p className="mb-2 text-small text-muted">Zobrazí se na detailu produktu. Upsell jako „Lepší volba“, cross-sell jako „Hodí se k tomu“ (i v košíku).</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Picker name="upsell" label="Upsell (větší balení, vyšší řada)" options={others} selected={p?.upsell_slugs ?? []} />
            <Picker name="crosssell" label="Cross-sell (doplňky, pamlsky, olej)" options={others} selected={p?.crosssell_slugs ?? []} />
          </div>
        </Fieldset>
        <Fieldset title="Zobrazení">
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_published" defaultChecked={p?.is_published ?? false} onChange={(e) => setPreview((v) => ({ ...v, published: e.target.checked }))} className="h-4 w-4 min-h-0 w-auto accent-green" />
              Zveřejnit na webu
            </label>
            <Check name="in_stock" label="Skladem" defaultChecked={p?.in_stock ?? true} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_new" defaultChecked={p?.is_new ?? false} onChange={(e) => setPreview((v) => ({ ...v, isNew: e.target.checked }))} className="h-4 w-4 min-h-0 w-auto accent-green" />
              Štítek Novinka
            </label>
          </div>
          <label className="mt-3 block max-w-sm">
            <span className="mb-1 block text-label text-green">Doporučení v kalkulačce</span>
            <select name="reco_boost" defaultValue={String(p?.reco_boost ?? 0)}>
              <option value="-2">Nedoporučovat (jen když není jiná možnost)</option>
              <option value="-1">Spíš nedoporučovat</option>
              <option value="0">Běžně (podle marže a skladu)</option>
              <option value="1">Spíš doporučovat</option>
              <option value="2">Přednostně doporučovat</option>
            </select>
            <span className="mt-1 block text-small">Kalkulačka a průvodce vybírají mezi produkty stejné role podle marže, stavu skladu a této přednosti.</span>
          </label>
        </Fieldset>
        <div className="flex justify-start">
          <Button type="button" variant="secondary" onClick={() => setStep(3)}>
            Zpět
          </Button>
        </div>
        </div>
      </div>

      <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <div>
          <p className="mb-1 text-label text-green">Náhled na webu</p>
          <div className="overflow-hidden rounded-card border border-line bg-white">
            <div className="flex h-36 items-center justify-center bg-paper text-small text-muted">
              {/* eslint-disable-next-line @next/next/no-img-element -- náhled nahrané fotky z úložiště, bez optimalizace */}
              {p?.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-cover" /> : "fotka produktu"}
            </div>
            <div className="p-3">
              <div className="flex flex-wrap gap-1">
                <span className="text-small font-semibold rounded-control border border-line px-2 py-0.5 text-muted">{LINE_INFO[preview.line].name}</span>
                {preview.isNew && <span className="text-small font-semibold rounded-control bg-ochre-badge px-2 py-0.5 text-ink">Novinka</span>}
                {!preview.published && <span className="text-small font-semibold rounded-control border border-line px-2 py-0.5 text-muted">skryté</span>}
              </div>
              <p className="mt-1 text-[20px] font-semibold leading-tight">{name}</p>
              <p className="text-small text-muted">
                {unit === "kg" ? "na váhu" : preview.weight >= 1000 ? `${preview.weight / 1000} kg` : `${preview.weight} g`}
                {preview.producer ? ` · ${preview.producer}` : ""}
              </p>
              <p className="mt-2 text-[22px]">
                {preview.price} Kč{unit === "kg" && <span className="text-sm">/kg</span>}
                {unit === "ks" && preview.weight > 0 && <span className="ml-2 font-body text-small text-muted">{Math.round((preview.price / preview.weight) * 1000)} Kč/kg</span>}
              </p>
              {preview.intro && <p className="mt-1 text-small">{preview.intro}</p>}
              <p className="mt-2 text-small text-muted">{preview.stock === null ? "sklad se neeviduje" : preview.stock > 0 ? `skladem ${preview.stock} ${unit}` : "Momentálně není"}</p>
              {manager && margin !== null && <p className={`mt-1 text-small ${margin < 20 ? "text-brick-text" : "text-muted"}`}>marže {margin} %</p>}
            </div>
          </div>
        </div>
        {missing.length > 0 && (
          <div className="rounded-card border border-line bg-white p-3 text-small">
            <p className="text-eyebrow uppercase text-muted">Co ještě chybí</p>
            <p className="mt-1">{missing.join(", ")}</p>
          </div>
        )}

        {state?.error && (
          <p role="alert" className="rounded-control bg-paper p-3 text-sm text-brick-text">
            {state.error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Ukládám…" : "Uložit"}
        </Button>
        <Link href="/admin/produkty" className="block text-center text-sm text-muted hover:underline">
          Zpět bez uložení
        </Link>
      </div>

      {p && (
        <div className="lg:col-span-2">
          <button
            type="submit"
            formAction={deleteProduct}
            formNoValidate
            className="text-small font-semibold text-brick-text hover:underline"
            onClick={(e) => {
              if (!confirm("Opravdu smazat produkt? Nejde to vrátit.")) e.preventDefault();
            }}
          >
            Smazat produkt
          </button>
        </div>
      )}
    </form>
  );
}

function Fieldset({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-card border border-line bg-white p-4">
      <legend className="px-1 text-label text-green">{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-label text-green">
        {label}
        {hint && <span className="ml-1 normal-case tracking-normal">({hint})</span>}
      </span>
      {children}
    </label>
  );
}

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 min-h-0 w-auto accent-green" />
      {label}
    </label>
  );
}

function Picker({ name, label, options, selected }: { name: string; label: string; options: { slug: string; name: string }[]; selected: string[] }) {
  return (
    <label className="mt-2 block">
      <span className="mb-1 block text-label text-green">{label}</span>
      <select name={name} multiple size={Math.min(6, Math.max(3, options.length))} defaultValue={selected} className="min-h-0 py-1 text-sm">
        {options.map((o) => (
          <option key={o.slug} value={o.slug}>
            {o.name}
          </option>
        ))}
      </select>
      <span className="mt-1 block text-[11px] text-muted">Více položek vyberete s Ctrl (Cmd).</span>
    </label>
  );
}
