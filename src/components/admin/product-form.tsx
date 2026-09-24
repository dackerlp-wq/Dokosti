"use client";

import Link from "next/link";
import { useActionState } from "react";
import { deleteProduct, saveProduct } from "@/app/admin/(app)/produkty/actions";
import { ImageUpload } from "@/components/admin/image-upload";
import { Button } from "@/components/ui/button";
import type { ProductRow } from "@/lib/admin";
import { ANIMAL_LABEL, LINES, LINE_INFO, STORAGE_LABEL } from "@/lib/catalog";

export function ProductForm({ product }: { product?: ProductRow }) {
  const [state, action, pending] = useActionState(saveProduct, null);
  const p = product;

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_300px]">
      {p && <input type="hidden" name="id" value={p.id} />}

      <div className="space-y-6">
        <Fieldset title="Název">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Řada">
              <select name="line" defaultValue={p?.line ?? "zaklad"}>
                {LINES.map((l) => (
                  <option key={l} value={l}>
                    {LINE_INFO[l].name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Druh masa / suroviny" hint="např. hovězí mix">
              <input name="variant" defaultValue={p?.variant} required />
            </Field>
            <Field label="Adresa (slug)" hint="prázdné = vytvoří se z názvu">
              <input name="slug" defaultValue={p?.slug} pattern="[a-z0-9\-]*" />
            </Field>
            <Field label="Výrobce">
              <input name="producer" defaultValue={p?.producer} />
            </Field>
          </div>
        </Fieldset>

        <Fieldset title="Balení a cena">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Hmotnost (g)">
              <input name="weight_grams" type="number" min={1} defaultValue={p?.weight_grams} required />
            </Field>
            <Field label="Cena (Kč)">
              <input name="price_czk" type="number" min={0} defaultValue={p?.price_czk} required />
            </Field>
            <Field label="Původní cena (Kč)" hint="jen při slevě">
              <input name="original_price_czk" type="number" min={0} defaultValue={p?.original_price_czk ?? ""} />
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
          </div>
        </Fieldset>

        <Fieldset title="Popis">
          <div className="space-y-3">
            <Field label="Úvodní věta" hint="co to je a pro koho">
              <textarea name="intro" rows={2} defaultValue={p?.intro} />
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
      </div>

      <div className="space-y-4">
        <Fieldset title="Fotka">
          <ImageUpload name="image_url" initialUrl={p?.image_url ?? null} slug={p?.slug ?? "novy"} />
        </Fieldset>

        <Fieldset title="Sklad">
          <div className="grid gap-3 grid-cols-2">
            <Field label="Kusů skladem" hint="prázdné = neevidovat">
              <input name="stock_qty" type="number" min={0} defaultValue={p?.stock_qty ?? ""} />
            </Field>
            <Field label="Hlásit od" hint="kusů">
              <input name="low_stock_threshold" type="number" min={0} defaultValue={p?.low_stock_threshold ?? 3} />
            </Field>
          </div>
          <p className="mt-2 text-xs text-muted">Když se množství eviduje, při nule se produkt sám označí „Momentálně není“ a objednávka nad stav se nepřijme.</p>
        </Fieldset>

        <Fieldset title="Zobrazení">
          <div className="space-y-2 text-sm">
            <Check name="is_published" label="Zveřejnit na webu" defaultChecked={p?.is_published ?? false} />
            <Check name="in_stock" label="Skladem" defaultChecked={p?.in_stock ?? true} />
            <Check name="is_new" label="Štítek Novinka" defaultChecked={p?.is_new ?? false} />
          </div>
        </Fieldset>

        {state?.error && (
          <p role="alert" className="rounded-[var(--radius-control)] bg-paper p-3 text-sm text-brick-text">
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
            className="label text-[11px] text-brick-text hover:underline"
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
    <fieldset className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
      <legend className="label px-1 text-[11px] text-muted">{title}</legend>
      {children}
    </fieldset>
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

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 min-h-0 w-auto accent-green" />
      {label}
    </label>
  );
}
