"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { clubStart, clubVerify } from "@/app/(shop)/registrace/actions";
import { GoogleButton, OrDivider } from "@/components/account/google-button";
import { Button, ButtonLink } from "@/components/ui/button";
import type { Settings } from "@/lib/settings";

type Props = {
  cardCode: string;
  kiosk: boolean;
  club: Settings["club"];
  /** Už přihlášený účet bez klubu (Google nebo e-mail): bez kódu, e-mail pevný. */
  account?: { email: string; name: string } | null;
  /** Aktivace karty zákazníka založeného u kasy: jméno známe, stačí e-mail. */
  ownerInitials?: string;
};

type Stage = { kind: "form" } | { kind: "code"; email: string } | { kind: "done"; awarded: number; name: string; email: string };

/**
 * Registrace do klubu na jeden krok: jméno, e-mail, souhlas. Potvrzení šestimístným kódem z e-mailu na téže
 * stránce (žádný odkaz, funguje i na tabletu). Heslo se nezadává, zvířata se přidávají až v účtu za odměnu.
 */
export function RegisterForm({ cardCode, kiosk, club, account = null, ownerInitials }: Props) {
  const router = useRouter();
  const [name, setName] = useState(account?.name ?? "");
  const [email, setEmail] = useState(account?.email ?? "");
  const [card, setCard] = useState(cardCode);
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<Stage>({ kind: "form" });
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [pending, startTransition] = useTransition();

  // Znovu poslat kód nejdřív po minutě (limit Supabase).
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Kiosk: po dokončení se za chvíli vrátit na začátek pro dalšího zákazníka.
  useEffect(() => {
    if (!kiosk || stage.kind !== "done") return;
    const t = setTimeout(() => router.replace("/registrace?kiosk=1"), 45000);
    return () => clearTimeout(t);
  }, [kiosk, stage.kind, router]);

  const input = () => ({ name, email, cardCode: card, terms, marketingEmail: marketing, kiosk });

  function start() {
    setError(null);
    startTransition(async () => {
      const res = await clubStart(input());
      if (!res.ok) return setError(res.error);
      if (res.state === "done") return finish(res.awarded, name, email);
      setCooldown(60);
      setStage({ kind: "code", email: email.trim().toLowerCase() });
    });
  }

  function verify(mail: string) {
    setError(null);
    startTransition(async () => {
      const res = await clubVerify(mail, code, kiosk);
      if (!res.ok) return setError(res.error);
      finish(res.awarded, res.name || name, mail);
    });
  }

  function finish(awarded: number, who: string, mail: string) {
    if (!kiosk) {
      router.push("/ucet?vitejte=1");
      return;
    }
    setStage({ kind: "done", awarded, name: who, email: mail });
  }

  const box = "max-w-md rounded-[var(--radius-card)] border border-line bg-paper p-5";

  if (stage.kind === "done") {
    return (
      <div className={box}>
        <p className="label text-brick-text">Hotovo</p>
        <h2 className="mt-1">Vítejte v klubu{stage.name ? `, ${stage.name.split(" ")[0]}` : ""}</h2>
        <p className="mt-3 text-muted">
          Účet je hotový{stage.awarded > 0 ? `, připsali jsme ${stage.awarded} Kostiček` : ""}. Potvrzení jsme poslali na {stage.email}. Do účtu se dostanete z domova přihlášením odkazem na e-mail.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <ButtonLink href="/registrace?kiosk=1">Další zákazník</ButtonLink>
          <span className="text-xs text-muted">Tablet se sám vrátí na začátek.</span>
        </div>
      </div>
    );
  }

  if (stage.kind === "code") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          verify(stage.email);
        }}
        className={`${box} space-y-3`}
      >
        <div className="flex items-start gap-3">
          <MailCheck strokeWidth={1.75} className="mt-0.5 h-6 w-6 shrink-0 text-green" />
          <div>
            <p className="font-display text-lg font-semibold">Opište kód z e-mailu</p>
            <p className="mt-1 text-sm">
              Na <strong>{stage.email}</strong> jsme poslali šestimístný kód. Platí několik minut.
            </p>
          </div>
        </div>
        <label className="block">
          <span className="label mb-1 block text-[11px] text-muted">Kód z e-mailu</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            required
            autoFocus
            aria-label="Kód z e-mailu"
            className="text-center font-display text-2xl tracking-[0.4em]"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-brick-text">
            {error}
          </p>
        )}
        <Button type="submit" variant="action" className="w-full" disabled={pending || code.length !== 6}>
          {pending ? "Ověřuji…" : "Dokončit registraci"}
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <button type="button" onClick={start} disabled={pending || cooldown > 0} className="text-green underline disabled:no-underline disabled:opacity-60">
            {cooldown > 0 ? `Poslat znovu (${cooldown} s)` : "Poslat kód znovu"}
          </button>
          <button type="button" onClick={() => setStage({ kind: "form" })} className="text-muted hover:underline">
            Opravit e-mail
          </button>
        </div>
        <p className="text-xs text-muted">Nic nepřišlo? Zkontrolujte složku spam nebo hromadné.</p>
      </form>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start();
      }}
      className={`${box} space-y-3`}
    >
      {!kiosk && !account && (
        <>
          <GoogleButton next={card ? `/k/${card}` : "/registrace"} label="Rychleji přes Google" />
          <OrDivider />
        </>
      )}
      {account && <p className="text-sm text-muted">Účet už máte přihlášený, jen ho zapíšeme do klubu.</p>}
      {ownerInitials && !account && (
        <p className="text-sm text-muted">
          Karta je vedená na jméno {ownerInitials}
          {ownerInitials.endsWith(".") ? "" : "."} Zadejte svůj e-mail a pošleme vám kód.
        </p>
      )}
      <Field label="Jméno a příjmení" value={name} onChange={setName} required={!ownerInitials} autoComplete="name" placeholder={ownerInitials ? `${ownerInitials} (doplňte celé)` : undefined} />
      <Field label="E-mail" value={email} onChange={setEmail} type="email" required autoComplete="email" hint="přihlašovací" readOnly={Boolean(account)} className={account ? "bg-cream text-muted" : ""} />
      {!cardCode && <Field label="Kód věrnostní karty" value={card} onChange={(v) => setCard(v.toUpperCase())} hint="máte-li kartu z prodejny, jinak nechte prázdné" className="uppercase" />}
      {cardCode && (
        <p className="text-sm">
          Karta <strong className="font-mono">{cardCode}</strong> se připojí k účtu.
        </p>
      )}
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} required className="mt-0.5 h-4 min-h-0 w-4 accent-green" />
        <span>
          Souhlasím s{" "}
          <Link href="/obchodni-podminky" target="_blank" className="text-green underline">
            obchodními podmínkami
          </Link>{" "}
          a beru na vědomí{" "}
          <Link href="/ochrana-udaju" target="_blank" className="text-green underline">
            zpracování osobních údajů
          </Link>
          .
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-0.5 h-4 min-h-0 w-4 accent-green" />
        <span>Posílejte mi novinky, tipy ke krmení a akce e-mailem. Odhlásit se dá kdykoli.</span>
      </label>
      {error && (
        <p role="alert" className="text-sm text-brick-text">
          {error}
        </p>
      )}
      <Button type="submit" variant="action" className="w-full" disabled={pending || !terms}>
        {pending ? "Odesílám…" : account ? "Vstoupit do klubu" : "Poslat kód a dokončit"}
      </Button>
      <p className="text-xs text-muted">
        Bez hesla: pošleme vám kód na e-mail, opíšete ho sem a je hotovo.
        {club.registrationPoints > 0 && ` Za registraci ${club.registrationPoints} Kostiček`}
        {club.petPoints > 0 && `, za profil psa nebo kočky v účtu dalších ${club.petPoints}`}.
      </p>
      {!kiosk && !account && (
        <p className="text-sm text-muted">
          Už máte účet?{" "}
          <Link href={card ? `/ucet/prihlaseni?next=${encodeURIComponent(`/k/${card}`)}` : "/ucet/prihlaseni"} className="text-green underline">
            Přihlásit se
          </Link>
        </p>
      )}
    </form>
  );
}

function Field({ label, value, onChange, hint, className = "", ...rest }: { label: string; value: string; onChange: (v: string) => void; hint?: string; className?: string } & Omit<React.ComponentProps<"input">, "value" | "onChange">) {
  return (
    <label className="block">
      <span className="label mb-1 block text-[11px] text-muted">
        {label}
        {hint && <span className="ml-1 normal-case tracking-normal">({hint})</span>}
      </span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={className} {...rest} />
    </label>
  );
}
