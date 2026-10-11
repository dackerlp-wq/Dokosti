"use client";

import { useActionState } from "react";
import { type AuthState, updateProfile } from "@/app/(shop)/ucet/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { CustomerRow } from "@/lib/admin";

/** Kontakt, adresa a souhlasy v účtu. */
export function ProfileForm({ c }: { c: CustomerRow }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(updateProfile, null);
  return (
    <form action={action} className="rounded-card border border-line bg-white p-5 shadow-card">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Jméno a příjmení" name="name" defaultValue={c.name} required autoComplete="name" />
        <Field label="Telefon" name="phone" type="tel" defaultValue={c.phone} autoComplete="tel" />
        <Field label="Ulice a číslo" name="street" defaultValue={c.street} autoComplete="street-address" className="sm:col-span-2" />
        <Field label="Město" name="city" defaultValue={c.city} autoComplete="address-level2" />
        <Field label="PSČ" name="zip" defaultValue={c.zip} autoComplete="postal-code" />
      </div>
      <div className="mt-5 space-y-2 text-small">
        <label className="flex items-start gap-2">
          <input type="checkbox" name="marketing_email" defaultChecked={Boolean(c.consent_marketing_email_at)} className="mt-0.5 h-4 min-h-0 w-4 accent-green" />
          Novinky, tipy ke krmení a akce e-mailem
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="marketing_sms" defaultChecked={Boolean(c.consent_marketing_sms_at)} className="mt-0.5 h-4 min-h-0 w-4 accent-green" />
          SMS k rozvozu a výdeji
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Ukládám…" : "Uložit"}
        </Button>
        {state?.info && <span className="text-sm text-green">{state.info}</span>}
        {state?.error && (
          <span role="alert" className="text-sm text-brick-text">
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}


