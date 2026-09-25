"use client";

import { useActionState, useState } from "react";
import { customerLogin, customerRegister, requestPasswordReset, setNewPassword, type AuthState } from "@/app/(shop)/ucet/actions";
import { Button } from "@/components/ui/button";

type Mode = "login" | "register" | "reset";

export function AuthForms({ next }: { next?: string }) {
  const [mode, setMode] = useState<Mode>("login");
  return (
    <div className="max-w-md rounded-[var(--radius-card)] border border-line bg-paper p-5">
      <div className="mb-4 flex gap-2">
        <Tab active={mode === "login"} onClick={() => setMode("login")}>
          Přihlášení
        </Tab>
        <Tab active={mode === "register"} onClick={() => setMode("register")}>
          Nový účet
        </Tab>
      </div>
      {mode === "login" && <LoginForm next={next} onReset={() => setMode("reset")} />}
      {mode === "register" && <RegisterForm />}
      {mode === "reset" && <ResetForm onBack={() => setMode("login")} />}
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`label inline-flex min-h-8 items-center rounded-full border px-3 text-[11px] ${active ? "border-green bg-green text-cream" : "border-line bg-cream text-green hover:border-green"}`}
    >
      {children}
    </button>
  );
}

function Msg({ state }: { state: AuthState }) {
  if (!state) return null;
  if (state.error)
    return (
      <p role="alert" className="text-sm text-brick-text">
        {state.error}
      </p>
    );
  if (state.info) return <p className="text-sm text-green">{state.info}</p>;
  return null;
}

function LoginForm({ next, onReset }: { next?: string; onReset: () => void }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(customerLogin, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="E-mail" name="email" type="email" autoComplete="email" required defaultValue={state?.error ? undefined : ""} />
      <Field label="Heslo" name="password" type="password" autoComplete="current-password" required />
      <Msg state={state} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Přihlašuji…" : "Přihlásit se"}
      </Button>
      <button type="button" onClick={onReset} className="text-sm text-muted hover:underline">
        Zapomenuté heslo
      </button>
    </form>
  );
}

function RegisterForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(customerRegister, null);
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-muted">S účtem vidíte historii objednávek a stav Kostiček. Objednávky spojíme podle e-mailu, i ty starší.</p>
      <Field label="E-mail" name="email" type="email" autoComplete="email" required />
      <Field label="Heslo" name="password" type="password" autoComplete="new-password" required minLength={8} hint="aspoň 8 znaků" />
      <Msg state={state} />
      <Button type="submit" className="w-full" disabled={pending || Boolean(state?.info)}>
        {pending ? "Zakládám…" : "Založit účet"}
      </Button>
    </form>
  );
}

function ResetForm({ onBack }: { onBack: () => void }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(requestPasswordReset, null);
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-muted">Pošleme vám odkaz, přes který si nastavíte nové heslo.</p>
      <Field label="E-mail" name="email" type="email" autoComplete="email" required />
      <Msg state={state} />
      <Button type="submit" className="w-full" disabled={pending || Boolean(state?.info)}>
        {pending ? "Odesílám…" : "Poslat odkaz"}
      </Button>
      <button type="button" onClick={onBack} className="text-sm text-muted hover:underline">
        Zpět na přihlášení
      </button>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(setNewPassword, null);
  return (
    <form action={action} className="max-w-md space-y-3 rounded-[var(--radius-card)] border border-line bg-paper p-5">
      <Field label="Nové heslo" name="password" type="password" autoComplete="new-password" required minLength={8} hint="aspoň 8 znaků" />
      <Msg state={state} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Ukládám…" : "Nastavit heslo"}
      </Button>
    </form>
  );
}

function Field({ label, name, hint, ...rest }: { label: string; name: string; hint?: string } & React.ComponentProps<"input">) {
  return (
    <label className="block">
      <span className="label mb-1 block text-[11px] text-muted">
        {label}
        {hint && <span className="ml-1 normal-case tracking-normal">({hint})</span>}
      </span>
      <input name={name} {...rest} />
    </label>
  );
}
