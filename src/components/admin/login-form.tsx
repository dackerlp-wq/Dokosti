"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/login/actions";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="email" className="label mb-1 block text-[11px] text-muted">
          E-mail
        </label>
        {/* React po odeslání formulář vyprázdní, e-mail proto vracíme ze stavu. */}
        <input id="email" name="email" type="email" autoComplete="username" defaultValue={state?.email} required />
      </div>
      <div>
        <label htmlFor="password" className="label mb-1 block text-[11px] text-muted">
          Heslo
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-brick-text">
          {state.error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Přihlašuji…" : "Přihlásit"}
      </Button>
    </form>
  );
}
