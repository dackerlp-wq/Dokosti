"use client";

import { useActionState } from "react";
import { changePassword, type PasswordState } from "@/app/admin/(app)/ucet/actions";
import { Button } from "@/components/ui/button";

export function PasswordForm() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(changePassword, null);
  return (
    <form action={action} className="space-y-3">
      <Field label="Současné heslo" name="current" autoComplete="current-password" />
      <Field label="Nové heslo" name="next" autoComplete="new-password" hint="aspoň 10 znaků" />
      <Field label="Nové heslo znovu" name="again" autoComplete="new-password" />
      {state?.error && (
        <p role="alert" className="text-sm text-brick-text">
          {state.error}
        </p>
      )}
      {state?.ok && <p className="text-sm text-green">Heslo je změněné.</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Ukládám…" : "Změnit heslo"}
      </Button>
    </form>
  );
}

function Field({ label, name, hint, autoComplete }: { label: string; name: string; hint?: string; autoComplete: string }) {
  return (
    <label className="block">
      <span className="label mb-1 block text-[11px] text-muted">
        {label}
        {hint && <span className="ml-1 normal-case tracking-normal">({hint})</span>}
      </span>
      <input type="password" name={name} autoComplete={autoComplete} required minLength={name === "current" ? 1 : 10} />
    </label>
  );
}
