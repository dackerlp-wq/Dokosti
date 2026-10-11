"use client";

import { MailCheck } from "lucide-react";
import { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import { customerLogin, requestMagicLink, requestPasswordReset, setNewPassword, verifyLoginCode, type AuthState } from "@/app/(shop)/ucet/actions";
import { GoogleButton, OrDivider } from "@/components/account/google-button";
import { Button } from "@/components/ui/button";
import { chipClass, Field, panel } from "@/components/ui/field";

type Mode = "login" | "link" | "reset";

export function AuthForms({ next }: { next?: string }) {
  const [mode, setMode] = useState<Mode>("login");
  return (
    <div className={`max-w-[560px] ${panel}`}>
      <div className="mb-4 flex gap-2">
        <Tab active={mode === "login"} onClick={() => setMode("login")}>
          Přihlášení
        </Tab>
        <Tab active={mode === "link"} onClick={() => setMode("link")}>
          Odkazem e-mailem
        </Tab>
      </div>
      {mode === "login" && (
        <>
          <GoogleButton next={next && next.startsWith("/") ? next : "/ucet"} />
          <OrDivider />
          <LoginForm next={next} onReset={() => setMode("reset")} />
        </>
      )}
      {mode === "link" && <MagicLinkForm next={next} onBack={() => setMode("login")} />}
      {mode === "reset" && <ResetForm onBack={() => setMode("login")} />}
      <p className="mt-4 border-t border-line pt-3 text-sm text-muted">
        Nemáte účet?{" "}
        <Link href="/registrace" className="text-brick-text underline">
          Registrace do klubu DoKosti
        </Link>{" "}
        · Kostičky, věrnostní karta a doporučení pro vašeho psa nebo kočku.
      </p>
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={chipClass(active)}
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
      <Button type="submit" variant="action" size="md" className="w-full" disabled={pending}>
        {pending ? "Přihlašuji…" : "Přihlásit se"}
      </Button>
      <button type="button" onClick={onReset} className="text-sm text-muted hover:underline">
        Zapomenuté heslo
      </button>
    </form>
  );
}

/**
 * Obrazovka po odeslání odkazu: místo formuláře řekne, kam se podívat, a nabídne poslat znovu.
 */
function SentPanel({ email, what, pending, onResend, onBack, children }: { email: string; what: string; pending: boolean; onResend: () => void; onBack: () => void; children?: React.ReactNode }) {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <div className="flex items-start gap-3 rounded-control bg-paper p-4">
        <MailCheck strokeWidth={1.75} className="mt-0.5 h-6 w-6 shrink-0 text-green" />
        <div>
          <p className="text-heading-md text-green">Podívejte se do e-mailu</p>
          <p className="mt-1 text-sm">
            Pokud e-mail <strong>{email}</strong> známe, poslali jsme na něj {what}. Klikněte na tlačítko v něm, klidně i na telefonu.
          </p>
          <p className="mt-2 text-xs text-muted">Odkaz platí několik minut a jde použít jednou. Když nic nepřišlo, zkontrolujte složku spam nebo hromadné.</p>
        </div>
      </div>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" onClick={onResend} disabled={pending}>
          {pending ? "Odesílám…" : "Poslat znovu"}
        </Button>
        <button type="button" onClick={onBack} className="text-sm text-muted hover:underline">
          Zpět na přihlášení
        </button>
      </div>
    </div>
  );
}

function MagicLinkForm({ next, onBack }: { next?: string; onBack: () => void }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(requestMagicLink, null);
  const [email, setEmail] = useState("");
  if (state?.info) {
    const resend = () => {
      const fd = new FormData();
      fd.set("email", email);
      fd.set("next", next ?? "");
      startTransition(() => action(fd));
    };
    return (
      <SentPanel email={email} what="přihlašovací kód a odkaz" pending={pending} onResend={resend} onBack={onBack}>
        <CodeForm email={email} next={next} />
      </SentPanel>
    );
  }
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next ?? ""} />
      <p className="text-sm text-muted">Bez hesla: pošleme vám kód a odkaz, opíšete kód nebo kliknete a jste přihlášeni.</p>
      <Field label="E-mail" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Msg state={state} />
      <Button type="submit" variant="action" size="md" className="w-full" disabled={pending}>
        {pending ? "Odesílám…" : "Poslat kód na e-mail"}
      </Button>
    </form>
  );
}

/** Opsání šestimístného kódu z téhož e-mailu, pro toho, kdo nechce klikat na odkaz. */
function CodeForm({ email, next }: { email: string; next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(verifyLoginCode, null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={next ?? ""} />
      <label className="block">
        <span className="mb-1 block text-label text-green">Kód z e-mailu</span>
        <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required aria-label="Kód z e-mailu" className="min-h-13.75 w-40 text-center text-xl tracking-[0.3em]" />
      </label>
      <Button type="submit" variant="action" size="md" disabled={pending}>
        {pending ? "Ověřuji…" : "Přihlásit kódem"}
      </Button>
      <div className="w-full">
        <Msg state={state} />
      </div>
    </form>
  );
}

function ResetForm({ onBack }: { onBack: () => void }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(requestPasswordReset, null);
  const [email, setEmail] = useState("");
  if (state?.info) {
    const resend = () => {
      const fd = new FormData();
      fd.set("email", email);
      startTransition(() => action(fd));
    };
    return <SentPanel email={email} what="odkaz pro nastavení nového hesla" pending={pending} onResend={resend} onBack={onBack} />;
  }
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-muted">Pošleme vám odkaz, přes který si nastavíte nové heslo.</p>
      <Field label="E-mail" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Msg state={state} />
      <Button type="submit" variant="action" size="md" className="w-full" disabled={pending}>
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
    <form action={action} className={`max-w-[560px] space-y-3 ${panel}`}>
      <Field label="Nové heslo" name="password" type="password" autoComplete="new-password" required minLength={8} hint="aspoň 8 znaků" />
      <Msg state={state} />
      <Button type="submit" variant="action" size="md" className="w-full" disabled={pending}>
        {pending ? "Ukládám…" : "Nastavit heslo"}
      </Button>
    </form>
  );
}
