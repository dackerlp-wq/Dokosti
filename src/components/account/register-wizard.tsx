"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { clubRegister, type RegisterInput } from "@/app/(shop)/registrace/actions";
import { GoogleButton, OrDivider } from "@/components/account/google-button";
import { PetFields, petComplete } from "@/components/account/pet-form";
import { Button, ButtonLink } from "@/components/ui/button";
import { emptyPet, HEARD_FROM, type PetProfile } from "@/lib/club";
import { formatPrice } from "@/lib/format";
import type { Settings } from "@/lib/settings";

type Props = {
  cardCode: string;
  kiosk: boolean;
  club: Settings["club"];
  loyalty: Settings["loyalty"];
  /** Už přihlášený účet (Google nebo e-mail) bez propojeného zákazníka: bez hesla, e-mail pevný. */
  account?: { email: string; name: string } | null;
};
type Step = 1 | 2 | 3;
const STEPS = ["Vy", "Vaše zvířata", "Souhlasy"];

/** Registrace ve třech krocích. V režimu kiosk se po dokončení vrátí na začátek pro dalšího zákazníka. */
export function RegisterWizard({ cardCode, kiosk, club, loyalty, account = null }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [you, setYou] = useState({ name: account?.name ?? "", email: account?.email ?? "", phone: "", password: "", cardCode });
  const [pets, setPets] = useState<PetProfile[]>([]);
  const [consent, setConsent] = useState({ terms: false, marketingEmail: false, marketingSms: false, heardFrom: "" });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | { state: "signedIn"; awarded: number } | { state: "confirmEmail" }>(null);
  const [pending, startTransition] = useTransition();

  // Kiosk: po dokončení se za chvíli vrátit na začátek pro dalšího zákazníka.
  function reset() {
    setStep(1);
    setYou({ name: "", email: "", phone: "", password: "", cardCode: "" });
    setPets([]);
    setConsent({ terms: false, marketingEmail: false, marketingSms: false, heardFrom: "" });
    setError(null);
    setDone(null);
    router.replace("/registrace?kiosk=1");
  }
  useEffect(() => {
    if (!kiosk || !done) return;
    const t = setTimeout(reset, 45000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset se nemění
  }, [kiosk, done]);

  function submit() {
    setError(null);
    const input: RegisterInput = { ...you, pets, ...consent, kiosk };
    startTransition(async () => {
      const res = await clubRegister(input);
      if (!res.ok) return setError(res.error);
      if (res.state === "signedIn" && !kiosk) {
        router.push("/ucet?vitejte=1");
        return;
      }
      setDone(res.state === "signedIn" ? { state: "signedIn", awarded: res.awarded } : { state: "confirmEmail" });
    });
  }

  if (done) {
    return (
      <div className="max-w-xl rounded-[var(--radius-card)] border border-line bg-paper p-6">
        <p className="label text-brick-text">Hotovo</p>
        <h2 className="mt-1">{done.state === "confirmEmail" ? "Ještě potvrďte e-mail" : `Vítejte v klubu${you.name ? `, ${you.name.split(" ")[0]}` : ""}`}</h2>
        <p className="mt-3 text-muted">
          {done.state === "confirmEmail"
            ? `Na ${you.email} jsme poslali odkaz. Po kliknutí bude účet hotový${club.registrationPoints > 0 ? ` a připíšeme vám ${club.registrationPoints} Kostiček` : ""}${pets.length ? ` a odměnu za ${pets.length === 1 ? "profil zvířete" : "profily zvířat"}` : ""}.`
            : `Účet je hotový${done.awarded > 0 ? `, připsali jsme ${done.awarded} Kostiček` : ""}. Potvrzení jsme poslali na ${you.email}.`}
        </p>
        {kiosk ? (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button type="button" onClick={reset}>
              Další zákazník
            </Button>
            <span className="text-xs text-muted">Tablet se sám vrátí na začátek.</span>
          </div>
        ) : (
          <div className="mt-5">
            <ButtonLink href="/ucet">Do účtu</ButtonLink>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <ol className="mb-4 flex gap-2" aria-label="Kroky registrace">
        {STEPS.map((label, i) => {
          const n = (i + 1) as Step;
          return (
            <li key={label} className={`label flex min-h-8 items-center gap-1 rounded-full border px-3 text-[11px] ${step === n ? "border-green bg-green text-cream" : step > n ? "border-green text-green" : "border-line text-muted"}`}>
              {step > n && <Check strokeWidth={1.75} className="h-3.5 w-3.5" />}
              {n}. {label}
            </li>
          );
        })}
      </ol>

      {step === 1 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setStep(2);
          }}
          className="space-y-3 rounded-[var(--radius-card)] border border-line bg-paper p-5"
        >
          {!kiosk && !account && (
            <>
              <GoogleButton next="/registrace" label="Rychleji přes Google" />
              <OrDivider />
            </>
          )}
          {account && <p className="text-sm text-muted">Účet už máte přihlášený, jen doplňte údaje pro klub.</p>}
          <Field label="Jméno a příjmení" value={you.name} onChange={(v) => setYou({ ...you, name: v })} required autoComplete="name" />
          <Field label="E-mail" value={you.email} onChange={(v) => setYou({ ...you, email: v })} type="email" required autoComplete="email" hint="přihlašovací" readOnly={Boolean(account)} className={account ? "bg-cream text-muted" : ""} />
          <Field label="Telefon" value={you.phone} onChange={(v) => setYou({ ...you, phone: v })} type="tel" required autoComplete="tel" hint="kvůli rozvozu a výdeji" />
          {!account && <Field label="Heslo" value={you.password} onChange={(v) => setYou({ ...you, password: v })} type="password" required minLength={8} autoComplete="new-password" hint="aspoň 8 znaků" />}
          <Field label="Kód věrnostní karty" value={you.cardCode} onChange={(v) => setYou({ ...you, cardCode: v.toUpperCase() })} hint="máte-li kartu z prodejny, jinak nechte prázdné" className="uppercase" />
          {kiosk && <p className="text-xs text-muted">Heslo si zvolte sami. Obsluha ho nevidí a do účtu se dostanete z domova.</p>}
          <div className="flex items-center justify-between gap-3 pt-2">
            {!kiosk && !account && (
              <Link href="/ucet/prihlaseni" className="text-sm text-muted hover:underline">
                Už mám účet
              </Link>
            )}
            <Button type="submit" className="ml-auto">
              Pokračovat
            </Button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setStep(3);
          }}
          className="space-y-4"
        >
          <div className="rounded-[var(--radius-card)] border border-line bg-paper p-5">
            <h2 className="text-[20px]">Váš pes nebo kočka</h2>
            <p className="mt-1 text-sm text-muted">
              Z profilu spočítáme denní dávku a doporučíme krmivo. Jde přeskočit a doplnit později v účtu.
              {club.petPoints > 0 && ` Za každý úplný profil ${club.petPoints} Kostiček (= ${formatPrice((club.petPoints / loyalty.redeemStep) * loyalty.redeemValueCzk)}), nejvýš ${club.petPointsMax}.`}
            </p>
          </div>
          {pets.map((p, i) => (
            <div key={i} className="rounded-[var(--radius-card)] border border-line bg-paper p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[16px]">{p.name || `Zvíře ${i + 1}`}</h3>
                <button type="button" onClick={() => setPets(pets.filter((_, j) => j !== i))} aria-label="Odebrat zvíře" className="inline-flex items-center gap-1 text-sm text-brick-text hover:underline">
                  <Trash2 strokeWidth={1.75} className="h-4 w-4" /> odebrat
                </button>
              </div>
              <PetFields pet={p} idPrefix={`pet${i}`} onChange={(next) => setPets(pets.map((x, j) => (j === i ? next : x)))} />
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button type="button" variant="secondary" onClick={() => setPets([...pets, emptyPet()])}>
              <Plus strokeWidth={1.75} className="h-4 w-4" /> {pets.length ? "Přidat další zvíře" : "Přidat zvíře"}
            </Button>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setStep(1)} className="text-sm text-muted hover:underline">
                Zpět
              </button>
              <Button type="submit">{pets.length ? "Pokračovat" : "Přeskočit"}</Button>
            </div>
          </div>
          {pets.some((p) => !petComplete(p)) && <p className="text-xs text-muted">Odměna je za profil se jménem, váhou a datem narození.</p>}
        </form>
      )}

      {step === 3 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-4 rounded-[var(--radius-card)] border border-line bg-paper p-5"
        >
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={consent.terms} onChange={(e) => setConsent({ ...consent, terms: e.target.checked })} required className="mt-0.5 h-4 min-h-0 w-4 accent-green" />
            <span>
              Souhlasím s{" "}
              <Link href="/obchodni-podminky" target="_blank" className="text-green underline">
                obchodními podmínkami
              </Link>{" "}
              a beru na vědomí{" "}
              <Link href="/ochrana-udaju" target="_blank" className="text-green underline">
                zpracování osobních údajů
              </Link>
              . (povinné)
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={consent.marketingEmail} onChange={(e) => setConsent({ ...consent, marketingEmail: e.target.checked })} className="mt-0.5 h-4 min-h-0 w-4 accent-green" />
            <span>Posílejte mi novinky, tipy ke krmení a akce e-mailem. Odhlásit se dá kdykoli jedním kliknutím.</span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={consent.marketingSms} onChange={(e) => setConsent({ ...consent, marketingSms: e.target.checked })} className="mt-0.5 h-4 min-h-0 w-4 accent-green" />
            <span>Můžete mi psát SMS k rozvozu a výdeji.</span>
          </label>
          <label className="block">
            <span className="label mb-1 block text-[11px] text-muted">Odkud o nás víte?</span>
            <select value={consent.heardFrom} onChange={(e) => setConsent({ ...consent, heardFrom: e.target.value })}>
              <option value="">Nechci uvádět</option>
              {HEARD_FROM.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>
          {error && (
            <p role="alert" className="text-sm text-brick-text">
              {error}
            </p>
          )}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button type="button" onClick={() => setStep(2)} className="text-sm text-muted hover:underline">
              Zpět
            </button>
            <Button type="submit" variant="action" disabled={pending || !consent.terms}>
              {pending ? "Zakládám účet…" : "Dokončit registraci"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({ label, value, onChange, hint, className = "", ...rest }: { label: string; value: string; onChange: (v: string) => void; hint?: string; className?: string } & Omit<React.ComponentProps<"input">, "value" | "onChange"> ) {
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
