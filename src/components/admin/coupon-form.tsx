"use client";

import Link from "next/link";
import { useActionState } from "react";
import { deleteCoupon, saveCoupon, type CouponState } from "@/app/admin/(app)/slevy/actions";
import { Button } from "@/components/ui/button";
import type { CouponRow } from "@/lib/admin";

export function CouponForm({ coupon: c }: { coupon?: CouponRow }) {
  const [state, action, pending] = useActionState<CouponState, FormData>(saveCoupon, null);
  return (
    <form action={action} className="max-w-2xl space-y-4">
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Kód" hint="zákazník ho zadá v pokladně">
            <input name="code" defaultValue={c?.code} placeholder="VITEJTE" required className="uppercase" />
          </Field>
          <Field label="Poznámka" hint="jen pro vás">
            <input name="note" defaultValue={c?.note} placeholder="Leták v prodejně" />
          </Field>
          <Field label="Typ slevy">
            <select name="type" defaultValue={c?.type ?? "percent"}>
              <option value="percent">Procenta z ceny zboží</option>
              <option value="amount">Částka v Kč</option>
            </select>
          </Field>
          <Field label="Hodnota" hint="% nebo Kč">
            <input name="value" type="number" min={1} defaultValue={c?.value} required />
          </Field>
          <Field label="Minimální objednávka (Kč)">
            <input name="min_order_czk" type="number" min={0} defaultValue={c?.min_order_czk ?? 0} />
          </Field>
          <Field label="Maximální počet použití" hint="prázdné = neomezeně">
            <input name="max_uses" type="number" min={1} defaultValue={c?.max_uses ?? ""} />
          </Field>
          <Field label="Platí od" hint="prázdné = hned">
            <input name="valid_from" type="date" defaultValue={c?.valid_from ?? ""} />
          </Field>
          <Field label="Platí do" hint="prázdné = bez omezení">
            <input name="valid_to" type="date" defaultValue={c?.valid_to ?? ""} />
          </Field>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={c?.active ?? true} className="h-4 w-4 min-h-0 w-auto accent-green" />
          Kód je aktivní
        </label>
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-brick-text">
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Ukládám…" : "Uložit"}
        </Button>
        <Link href="/admin/slevy" className="text-sm text-muted hover:underline">
          Zpět
        </Link>
        {c && (
          <button
            type="submit"
            formAction={deleteCoupon}
            formNoValidate
            className="label ml-auto text-[11px] text-brick-text hover:underline"
            onClick={(e) => {
              if (!confirm("Smazat kód? Nejde to vrátit.")) e.preventDefault();
            }}
          >
            Smazat
          </button>
        )}
      </div>
    </form>
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
