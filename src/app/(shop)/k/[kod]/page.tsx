import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForms } from "@/components/account/auth-forms";
import { ClaimCardButton } from "@/components/account/claim-card";
import { RegisterForm } from "@/components/account/register-form";
import { type CardState, normalizeCardCode } from "@/lib/cards";
import { getCustomerUser, signedInWithoutClub } from "@/lib/customer";
import { getSettings } from "@/lib/settings";
import { getAuthSupabase } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Věrnostní karta DoKosti", robots: { index: false } };

type Props = { params: Promise<{ kod: string }>; searchParams: Promise<{ kiosk?: string }> };

/**
 * QR na kartě vede sem. Podle stavu karty se ukáže jen to, co dává smysl: aktivace (registrace s kartou),
 * doplnění e-mailu ke kartě z kasy, přihlášení, připojení karty k účtu, nebo vysvětlení. Viz docs/KARTY.md.
 */
export default async function CardPage({ params, searchParams }: Props) {
  const [{ kod }, { kiosk }, settings] = await Promise.all([params, searchParams, getSettings()]);
  const code = normalizeCardCode(kod);
  const isKiosk = kiosk === "1";
  const db = await getAuthSupabase();
  const [{ data }, user] = await Promise.all([db.rpc("card_state", { p_code: code }), isKiosk ? null : getCustomerUser()]);
  const card = ((data as CardState | null) ?? { state: "neplatna" }) as CardState;

  // Iniciály končí tečkou („Jana N.“), věta pak nesmí přidat druhou.
  const who = card.state === "prirazena" ? card.initials : "";
  const dot = who.endsWith(".") ? "" : ".";
  const head = (title: string, text?: string) => (
    <div className="max-w-2xl">
      <p className="label text-brick-text">
        Věrnostní karta <span className="font-mono">{code}</span>
      </p>
      <h1 className="mt-1">{title}</h1>
      {text && <p className="mt-2 text-muted">{text}</p>}
    </div>
  );
  const wrap = (children: React.ReactNode) => <div className="container-dk py-6 md:py-10">{children}</div>;

  if (card.state === "neplatna" || card.state === "blokovana") {
    return wrap(
      <>
        {head(card.state === "blokovana" ? "Karta je zablokovaná" : "Kartu neznáme", card.state === "blokovana" ? "Tuto kartu jsme na žádost majitele zablokovali. Novou vám dáme v prodejně." : "Kód na kartě nesedí. Zkuste ho zadat ručně, nebo se registrujte bez karty a kartu vám přiřadíme v prodejně.")}
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={isKiosk ? "/registrace?kiosk=1" : "/registrace"} className="label inline-flex min-h-10 items-center rounded-[var(--radius-control)] bg-green px-4 text-cream">
            Registrace bez karty
          </Link>
          <Link href="/kontakt" className="label inline-flex min-h-10 items-center rounded-[var(--radius-control)] border-2 border-green px-4 text-green">
            Kontakt
          </Link>
        </div>
      </>,
    );
  }

  if (card.state === "prirazena" && card.mine) redirect("/ucet");

  if (user) {
    // Přihlášený: volnou kartu (nebo kartu z kasy na stejný e-mail) připojí jedním tlačítkem.
    if (card.state === "prirazena" && card.account) {
      return wrap(
        <>
          {head("Karta patří jinému účtu", `Karta je připojená k účtu ${card.initials || "jiného zákazníka"}. Pokud je vaše, ozvěte se nám a spojíme to ručně.`)}
          <div className="mt-5">
            <Link href="/ucet" className="label inline-flex min-h-10 items-center rounded-[var(--radius-control)] bg-green px-4 text-cream">
              Můj účet
            </Link>
          </div>
        </>,
      );
    }
    const account = await signedInWithoutClub();
    if (account) {
      return wrap(
        <>
          {head("Dokončete registraci s kartou", "Účet máte, ještě ho zapíšeme do klubu a připojíme kartu.")}
          <div className="mt-6">
            <RegisterForm cardCode={code} kiosk={false} club={settings.club} account={account} ownerInitials={card.state === "prirazena" ? card.initials : undefined} />
          </div>
        </>,
      );
    }
    return wrap(
      <>
        {head("Připojit kartu k účtu", card.state === "prirazena" ? `Karta je vedená na jméno ${who}${dot} Po připojení se Kostičky z prodejny spojí s vaším účtem.` : "Karta je volná. Po připojení sbíráte Kostičky u pultu i na webu na jeden účet.")}
        <div className="mt-5">
          <ClaimCardButton code={code} />
        </div>
      </>,
    );
  }

  if (card.state === "prirazena" && card.account) {
    return wrap(
      <>
        {head("Přihlaste se", `Karta je připojená k účtu ${card.initials || ""}. Po přihlášení jste rovnou v účtu.`)}
        <div className="mt-6">
          <AuthForms next="/ucet" />
        </div>
      </>,
    );
  }

  const assigned = card.state === "prirazena";
  return wrap(
    <>
      {head(
        assigned ? "Dokončete registraci ke kartě" : "Aktivujte kartu",
        assigned
          ? `Kartu jsme u pultu vydali na jméno ${who}${dot} Zadejte e-mail, pošleme kód a účet bude hotový${settings.club.registrationPoints > 0 ? ` i s ${settings.club.registrationPoints} Kostičkami` : ""}.`
          : `Karta je připravená. Jméno, e-mail, kód z e-mailu, a máte účet s kartou${settings.club.registrationPoints > 0 ? ` a ${settings.club.registrationPoints} Kostičkami` : ""}.`,
      )}
      <div className="mt-6">
        <RegisterForm cardCode={code} kiosk={isKiosk} club={settings.club} ownerInitials={assigned ? card.initials : undefined} />
      </div>
    </>,
  );
}
