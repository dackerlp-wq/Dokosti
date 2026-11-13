import type { Metadata } from "next";
import { CalendarClock, CalendarX, Mail, PauseCircle, Pencil, RefreshCw, SkipForward, Truck } from "lucide-react";
import Link from "next/link";
import { IconTile } from "@/components/ui/icon-tile";
import { StepDisc } from "@/components/ui/field";
import { PageIntro } from "@/components/ui/page-intro";
import { Section, SectionHeader } from "@/components/ui/section";
import { ButtonLink } from "@/components/ui/button";
import { getSettings } from "@/lib/settings";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Pravidelné dodávky: maso přivezeme včas",
  description: "Jak fungují pravidelné dodávky syrového krmiva: každé 2 nebo 4 týdny, e-mail před každou dodávkou, přeskočení, změna nebo zrušení kdykoli.",
  alternates: { canonical: `${SITE_URL}/pravidelne-dodavky` },
};

const dny = (n: number) => (n === 1 ? "den" : n >= 2 && n <= 4 ? "dny" : "dní");

/** Info stránka o pravidelných dodávkách (předplatné z Krmení na míru). Čísla bere z nastavení předplatného. */
export default async function RegularDeliveriesPage() {
  const { subscription: s, loyalty } = await getSettings();
  const cutoff = s.cutoffDaysBefore === 0 ? "v den dodání" : s.cutoffDaysBefore === 1 ? "den před dodáním" : `${s.cutoffDaysBefore} ${dny(s.cutoffDaysBefore)} před dodáním`;

  const steps = [
    <>
      Sestavte si dodávku: buď v kalkulačce{" "}
      <Link href="/krmeni-na-miru" className="text-brick-text underline">
        Krmení na míru
      </Link>
      , která spočítá denní dávku a navrhne balíček, nebo si do košíku dejte vlastní produkty.
    </>,
    <>V pokladně zvolíte Každé 2 týdny, nebo Každé 4 týdny. První dodávku zaplatíte jako běžný nákup a doručíme ji stejnou cestou jako cokoli jiného.</>,
    <>
      {s.reminderDaysBefore} {dny(s.reminderDaysBefore)} před každou další dodávkou vám napíšeme, co přijde. V e-mailu je odkaz, kde dodávku přeskočíte nebo upravíte.
    </>,
    <>Objednávka vznikne sama {cutoff}, do té doby jde všechno změnit. Za každou dodávku platíte zvlášť, stejně jako u první objednávky.</>,
  ];

  return (
    <>
      <PageIntro
        eyebrow="Krmení na míru"
        title={
          <>
            Pravidelné <em className="font-normal text-brick">dodávky</em>
          </>
        }
        actions={
          <>
            <ButtonLink href="/krmeni-na-miru" variant="action" size="lg">
              Spočítat Krmení na míru
            </ButtonLink>
            <ButtonLink href="/rada/barf" variant="secondary" size="lg">
              Vybrat vlastní produkty
            </ButtonLink>
          </>
        }
      >
        <p>Mrazák nezůstane prázdný: maso vám přivezeme včas, každé 2 nebo 4 týdny. Balíček vám spočítáme, nebo si vyberete vlastní produkty. Bez závazku, přeskočíte, změníte nebo zrušíte kdykoli.</p>
      </PageIntro>

      <Section tone="paper">
        <SectionHeader eyebrow="Jak to funguje" title="Čtyři kroky" />
        <ol className="mx-auto grid max-w-text gap-5">
          {steps.map((text, i) => (
            <li key={i} className="flex items-start gap-5">
              <StepDisc n={i + 1} />
              <p className="pt-1.5">{text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section>
        <SectionHeader eyebrow="V dodávce" title="Co chodí a kdy" />
        <div className="grid gap-x-5 gap-y-7.5 md:grid-cols-3">
          <IconTile icon={Truck} title="Stejný nákup pokaždé" text="Co si objednáte, přijde znovu v každé dodávce. Z kalkulačky v množství podle denní dávky na 2 nebo 4 týdny." />
          <IconTile icon={RefreshCw} title="Druhy masa se střídají" text="U plánu z kalkulačky může každá druhá dodávka přivézt jiné maso. Pes nedostává pořád totéž a v e-mailu vidíte, co přijde." />
          <IconTile icon={CalendarClock} title="Něco jen občas" text="Játra, olej nebo mořská řasa z plánu vydrží déle než jednu dodávku. Přijdou v první a pak samy znovu, až budou docházet." />
        </div>
      </Section>

      <Section tone="paper">
        <SectionHeader eyebrow="Kdykoli" title="Co můžete změnit" />
        <div className="grid gap-x-5 gap-y-7.5 sm:grid-cols-2 md:grid-cols-4">
          <IconTile icon={SkipForward} title="Přeskočit" text="Jednu dodávku vynecháte, další přijde v obvyklém termínu." />
          <IconTile icon={Pencil} title="Upravit" text="Množství, nebo jak často dodávky chodí (2 nebo 4 týdny)." />
          <IconTile icon={PauseCircle} title="Pozastavit" text="Na dovolenou nebo když máte mrazák plný. Pak zase zapnete." />
          <IconTile icon={CalendarX} title="Zrušit" text="Jedním kliknutím, bez poplatku a bez výpovědní lhůty." />
        </div>
        <p className="mx-auto mt-7.5 max-w-text text-center">
          Všechno uděláte přes odkaz v e-mailu nebo ve{" "}
          <Link href="/ucet" className="text-brick-text underline">
            svém účtu
          </Link>
          . Změny jdou udělat do chvíle, než objednávka vznikne ({cutoff}).
        </p>
      </Section>

      <Section>
        <SectionHeader eyebrow="Proč pravidelně" title="Co z toho máte" />
        <div className="grid gap-x-5 gap-y-7.5 md:grid-cols-3">
          <IconTile icon={Truck} title="Nemusíte hlídat zásobu" text="Dodávky chodí samy v termínu, který si zvolíte, maso přivezeme dřív, než dojde." />
          <IconTile icon={Mail} title="Víte, co přijde" text={`${s.reminderDaysBefore} ${dny(s.reminderDaysBefore)} předem e-mail s obsahem dodávky a rozpisem krmení.`} />
          {s.discountPct > 0 ? (
            <IconTile icon={RefreshCw} title={`Sleva ${s.discountPct} %`} text="Na zboží v každé pravidelné dodávce." />
          ) : loyalty.enabled && s.pointsBonusPct > 0 ? (
            <IconTile icon={RefreshCw} title="Kostičky navíc" text={`Za každou dodávku dostanete Kostičky navíc v hodnotě ${s.pointsBonusPct} % z ceny zboží.`} />
          ) : (
            <IconTile icon={RefreshCw} title="Stejná cena" text="Platíte stejně jako při běžném nákupu, nic navíc." />
          )}
        </div>
        <p className="mx-auto mt-7.5 max-w-text text-center text-small">
          Doprava a platba jsou stejné jako u běžné objednávky, podrobnosti na stránce{" "}
          <Link href="/doprava" className="text-brick-text underline">
            Doprava a platba
          </Link>
          .
        </p>
      </Section>
    </>
  );
}
