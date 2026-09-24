"use client";

import { useActionState, useState } from "react";
import { saveSettings, type SettingsState } from "@/app/admin/(app)/nastaveni/actions";
import { Button } from "@/components/ui/button";
import { DAY_NAMES_SHORT, type Settings } from "@/lib/settings";

const TABS = [
  { id: "shop", label: "Prodejna" },
  { id: "shipping", label: "Doprava" },
  { id: "payment", label: "Platba" },
  { id: "pages", label: "Texty stránek" },
] as const;

export function SettingsForms({ settings }: { settings: Settings }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("shop");
  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-line pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`label inline-flex min-h-8 items-center rounded-full border px-3 text-[11px] ${
              tab === t.id ? "border-green bg-green text-cream" : "border-line bg-paper text-green hover:border-green"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-5 max-w-3xl">
        {tab === "shop" && <ShopForm s={settings.shop} />}
        {tab === "shipping" && <ShippingForm s={settings.shipping} />}
        {tab === "payment" && <PaymentForm s={settings.payment} />}
        {tab === "pages" && <PagesForm s={settings.pages} />}
      </div>
    </div>
  );
}

function SectionForm({ section, children }: { section: string; children: React.ReactNode }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, null);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="section" value={section} />
      {children}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Ukládám…" : "Uložit"}
        </Button>
        {state?.ok && <span className="text-sm text-green">Uloženo.</span>}
        {state?.error && (
          <span role="alert" className="text-sm text-brick-text">
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}

function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
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
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 min-h-0 w-auto accent-green" />
      {label}
    </label>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
      <legend className="label px-1 text-[11px] text-muted">{title}</legend>
      {children}
    </fieldset>
  );
}

function ShopForm({ s }: { s: Settings["shop"] }) {
  const rows = [...s.openingHours, { days: "", hours: "" }];
  return (
    <SectionForm section="shop">
      <Card title="Prodejna">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Název">
            <input name="name" defaultValue={s.name} />
          </Field>
          <Field label="Slogan">
            <input name="slogan" defaultValue={s.slogan} />
          </Field>
          <Field label="Ulice a číslo">
            <input name="address" defaultValue={s.address} />
          </Field>
          <Field label="Město">
            <input name="city" defaultValue={s.city} />
          </Field>
          <Field label="Telefon">
            <input name="phone" defaultValue={s.phone} />
          </Field>
          <Field label="E-mail">
            <input name="email" type="text" inputMode="email" defaultValue={s.email} />
          </Field>
          <Field label="IČO">
            <input name="ico" defaultValue={s.ico} />
          </Field>
          <Field label="DIČ" hint="jen plátce DPH">
            <input name="dic" defaultValue={s.dic} />
          </Field>
        </div>
        <div className="mt-3">
          <Check name="vatPayer" label="Jsme plátce DPH (doklady s rozpisem DPH)" defaultChecked={s.vatPayer} />
        </div>
      </Card>
      <Card title="Otevírací doba">
        <p className="mb-2 text-xs text-muted">Prázdný řádek se neuloží. Pro přidání vyplňte poslední řádek.</p>
        <div className="space-y-2">
          {rows.map((o, i) => (
            <div key={i} className="grid grid-cols-[1fr_2fr] gap-2">
              <input name="oh_days" defaultValue={o.days} placeholder="Po–Pá" />
              <input name="oh_hours" defaultValue={o.hours} placeholder="9–17 h" />
            </div>
          ))}
        </div>
      </Card>
    </SectionForm>
  );
}

function DaysPicker({ name, selected }: { name: string; selected: number[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {[1, 2, 3, 4, 5, 6, 0].map((d) => (
        <label key={d} className="flex items-center gap-1 text-sm">
          <input type="checkbox" name={name} value={d} defaultChecked={selected.includes(d)} className="h-4 w-4 min-h-0 w-auto accent-green" />
          {DAY_NAMES_SHORT[d]}
        </label>
      ))}
    </div>
  );
}

function ShippingCard({ id, title, s, children }: { id: string; title: string; s: Settings["shipping"]["odber"]; children?: React.ReactNode }) {
  return (
    <Card title={title}>
      <Check name={`${id}_enabled`} label="Nabízet zákazníkům" defaultChecked={s.enabled} />
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Field label="Název" className="sm:col-span-3">
          <input name={`${id}_name`} defaultValue={s.name} />
        </Field>
        <Field label="Popis pro zákazníka" className="sm:col-span-3">
          <textarea name={`${id}_description`} rows={2} defaultValue={s.description} />
        </Field>
        <Field label="Cena (Kč)">
          <input name={`${id}_priceCzk`} type="number" min={0} defaultValue={s.priceCzk} />
        </Field>
        <Field label="Zdarma od (Kč)" hint="prázdné = nikdy">
          <input name={`${id}_freeFromCzk`} type="number" min={0} defaultValue={s.freeFromCzk ?? ""} />
        </Field>
        <Field label="Minimální objednávka (Kč)">
          <input name={`${id}_minOrderCzk`} type="number" min={0} defaultValue={s.minOrderCzk} />
        </Field>
      </div>
      {children}
    </Card>
  );
}

function ShippingForm({ s }: { s: Settings["shipping"] }) {
  return (
    <SectionForm section="shipping">
      <ShippingCard id="odber" title="Osobní odběr" s={s.odber} />
      <ShippingCard id="rozvoz" title="Rozvoz" s={s.rozvoz}>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Rozvozové dny">
            <DaysPicker name="rozvoz_days" selected={s.rozvoz.days} />
          </Field>
          <Field label="Čas rozvozu" hint="zobrazí se u výběru dne">
            <input name="rozvoz_window" defaultValue={s.rozvoz.window} placeholder="16–19 h" />
          </Field>
        </div>
      </ShippingCard>
      <ShippingCard id="prepravce" title="Přepravce" s={s.prepravce}>
        <div className="mt-3">
          <Field label="Dny, kdy odesíláme">
            <DaysPicker name="prepravce_shipDays" selected={s.prepravce.shipDays} />
          </Field>
        </div>
      </ShippingCard>
    </SectionForm>
  );
}

function PaymentForm({ s }: { s: Settings["payment"] }) {
  return (
    <SectionForm section="payment">
      <Card title="Kartou online">
        <Check name="karta_enabled" label="Nabízet" defaultChecked={s.karta.enabled} />
        <Field label="Popis" className="mt-3">
          <input name="karta_description" defaultValue={s.karta.description} />
        </Field>
        <p className="mt-2 text-xs text-muted">Zapněte až po napojení platební brány.</p>
      </Card>
      <Card title="Bankovním převodem">
        <Check name="prevod_enabled" label="Nabízet" defaultChecked={s.prevod.enabled} />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Číslo účtu" hint="pošle se v potvrzení">
            <input name="prevod_bankAccount" defaultValue={s.prevod.bankAccount} placeholder="123456789/0100" />
          </Field>
          <Field label="Popis">
            <input name="prevod_description" defaultValue={s.prevod.description} />
          </Field>
        </div>
      </Card>
      <Card title="Na místě">
        <Check name="hotove_enabled" label="Nabízet" defaultChecked={s.hotove.enabled} />
        <Field label="Popis" className="mt-3">
          <input name="hotove_description" defaultValue={s.hotove.description} />
        </Field>
      </Card>
    </SectionForm>
  );
}

function PagesForm({ s }: { s: Settings["pages"] }) {
  return (
    <SectionForm section="pages">
      <Card title="O nás">
        <Field label="Text pod nadpisem" hint="odstavce oddělte prázdným řádkem">
          <textarea name="about" rows={5} defaultValue={s.about} />
        </Field>
      </Card>
      <Card title="Obchodní podmínky">
        <textarea name="terms" rows={14} defaultValue={s.terms} placeholder="Dokud je prázdné, na webu je upozornění, že text doplní provozovatel." />
      </Card>
      <Card title="Ochrana osobních údajů">
        <textarea name="privacy" rows={10} defaultValue={s.privacy} />
      </Card>
    </SectionForm>
  );
}
