import type { Metadata } from "next";
import { CalendarClock, ClipboardList, CreditCard, Gift, PawPrint, Receipt, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { StepDisc } from "@/components/ui/field";
import { IconTile } from "@/components/ui/icon-tile";
import { PageIntro } from "@/components/ui/page-intro";
import { Section, SectionHeader } from "@/components/ui/section";
import { getCustomerUser } from "@/lib/customer";
import { formatPrice } from "@/lib/format";
import { SITE_URL } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Klub DoKosti: Kostičky a výhody registrace",
  description: "Jeden účet pro e-shop i prodejnu: Kostičky za každý nákup, věrnostní karta, profil vašeho psa nebo kočky a rychlejší objednávky. Registrace zdarma.",
  alternates: { canonical: `${SITE_URL}/klub` },
};

/** Proč být v klubu: výhody registrace. Čísla (Kostičky, bonusy) bere z nastavení. */
export default async function ClubPage() {
  const [{ loyalty, club, subscription }, user] = await Promise.all([getSettings(), getCustomerUser()]);
  const petTotal = club.petPoints * club.petPointsMax;
  const cta = user ? (
    <ButtonLink href="/ucet" variant="action" size="lg">
      Otevřít můj účet
    </ButtonLink>
  ) : (
    <>
      <ButtonLink href="/registrace" variant="action" size="lg">
        Zaregistrovat se zdarma
      </ButtonLink>
      <ButtonLink href="/ucet/prihlaseni" variant="secondary" size="lg">
        Už mám účet
      </ButtonLink>
    </>
  );

  return (
    <>
      <PageIntro
        eyebrow="Klub DoKosti"
        title={
          <>
            Nakupujte <em className="font-normal text-brick">a sbírejte</em>
          </>
        }
        actions={cta}
      >
        <div className="mb-4 flex justify-center" aria-hidden>
          <Image src="/maskot/vendy-pozdrav.webp" alt="" width={115} height={190} className="h-28 w-auto" priority />
        </div>
        <p>Jeden účet pro e-shop i prodejnu v Kladně. Za každý nákup dostanete Kostičky, které pak uplatníte jako slevu. Registrace je zdarma a nic vás nezavazuje.</p>
      </PageIntro>

      {loyalty.enabled && (
        <Section tone="paper">
          <SectionHeader eyebrow="Kostičky" title="Jak Kostičky fungují" />
          <div className="mx-auto grid max-w-narrow gap-4 sm:grid-cols-3">
            {[
              [`1 Kostička`, `za každých ${formatPrice(loyalty.czkPerPoint)} nákupu, na webu i v prodejně`],
              [`${loyalty.redeemStep} Kostiček`, `= sleva ${formatPrice(loyalty.redeemValueCzk)} na další nákup`],
              ["Kdykoli", "uplatníte v pokladně e-shopu nebo u kasy"],
            ].map(([big, text]) => (
              <div key={big} className="rounded-card border border-line bg-white p-5 text-center">
                <p className="font-display text-[34px] leading-tight font-black text-green">{big}</p>
                <p className="mt-1 text-small">{text}</p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-text text-center text-small">
            Zpátky tak dostanete zhruba {Math.round((loyalty.redeemValueCzk / (loyalty.redeemStep * loyalty.czkPerPoint)) * 100)} % z každého nákupu. Kostičky se připíší po předání objednávky.
          </p>
        </Section>
      )}

      <Section>
        <SectionHeader eyebrow="Výhody" title="Co v klubu máte" />
        <div className="grid gap-x-5 gap-y-7.5 sm:grid-cols-2 md:grid-cols-3">
          {club.registrationPoints > 0 && <IconTile icon={Gift} title={`${club.registrationPoints} Kostiček na uvítanou`} text="Hned po dokončení registrace, uplatníte je už u prvního nákupu." />}
          {club.petPoints > 0 && (
            <IconTile icon={PawPrint} title="Kostičky za profil zvířete" text={`${club.petPoints} Kostiček za vyplněný profil psa nebo kočky, za první ${club.petPointsMax} profily na účet (celkem ${petTotal}).`} />
          )}
          <IconTile icon={CreditCard} title="Jedna karta pro web i prodejnu" text="Věrnostní karta z prodejny a účet na webu jsou jedno. Kostičky se sčítají, ať nakupujete kdekoli." />
          <IconTile icon={ClipboardList} title="Krmení na míru pro vaše zvíře" text="Profil psa nebo kočky si uložíte a kalkulačka příště spočítá dávku a balíček jedním kliknutím." />
          <IconTile icon={Zap} title="Rychlejší objednávka" text="Jméno, telefon a adresu vyplníme v pokladně za vás." />
          <IconTile icon={Receipt} title="Přehled nákupů" text="Všechny objednávky z webu na jednom místě." />
          {subscription.enabled && (
            <IconTile
              icon={CalendarClock}
              title="Pravidelné dodávky pod kontrolou"
              text={`Přeskočíte, změníte nebo zrušíte je v účtu.${subscription.pointsBonusPct > 0 ? ` Za každou dodávku Kostičky navíc v hodnotě ${subscription.pointsBonusPct} % nákupu.` : ""}`}
            />
          )}
        </div>
      </Section>

      <Section tone="paper">
        <SectionHeader eyebrow="Jak se přidat" title="Za minutu jste v klubu" />
        <ol className="mx-auto grid max-w-text gap-5">
          <li className="flex items-start gap-5">
            <StepDisc n={1} />
            <p className="pt-1.5">
              <b className="text-ink">Na webu:</b>{" "}
              <Link href="/registrace" className="text-brick-text underline">
                zaregistrujte se
              </Link>{" "}
              e-mailem. Přihlásit se pak můžete heslem, nebo bez hesla kódem z e-mailu.
            </p>
          </li>
          <li className="flex items-start gap-5">
            <StepDisc n={2} />
            <p className="pt-1.5">
              <b className="text-ink">V prodejně:</b> řekněte si o věrnostní kartu. Kostičky se na ni sbírají hned a doma si k ní účet aktivujete přes QR kód.
            </p>
          </li>
          <li className="flex items-start gap-5">
            <StepDisc n={3} />
            <p className="pt-1.5">
              <b className="text-ink">Přidejte zvíře:</b> vyplňte profil svého psa nebo kočky{club.petPoints > 0 ? ` a připíšeme vám ${club.petPoints} Kostiček` : ""}.
            </p>
          </li>
        </ol>
      </Section>

      <Section>
        <div className="mx-auto flex max-w-text flex-col items-center gap-5 text-center">
          <Image src="/maskot/cerveny-taska.webp" alt="" width={90} height={96} className="h-24 w-auto" aria-hidden />
          <p className="font-display text-display-md text-green">Připojte se k nám</p>
          <div className="flex flex-wrap justify-center gap-4">{cta}</div>
          <p className="text-small">Registrace je zdarma.</p>
        </div>
      </Section>
    </>
  );
}
