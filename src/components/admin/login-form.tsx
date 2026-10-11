"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/login/actions";
import { Button } from "@/components/ui/button";
import { fieldInput } from "@/components/ui/field";

export function LoginForm({ next = "" }: { next?: string }) {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="mb-1 block text-label text-green">
          E-mail
        </label>
        {/* React po odeslání formulář vyprázdní, e-mail proto vracíme ze stavu. */}
        <input id="email" name="email" type="email" autoComplete="username" defaultValue={state?.email} required className={fieldInput} />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-label text-green">
          Heslo
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={fieldInput} />
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-brick-text">
          {state.error}
        </p>
      )}
      <Button type="submit" variant="action" size="md" className="w-full" disabled={pending}>
        {pending ? "Přihlašuji…" : "Přihlásit"}
      </Button>
    </form>
  );
}
