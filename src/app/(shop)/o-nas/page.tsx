import type { Metadata } from "next";
import { Handshake, MessageCircle, Smile } from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";
import { LinkArrow } from "@/components/ui/link-arrow";
import { Logo } from "@/components/ui/logo";
import { PageIntro } from "@/components/ui/page-intro";
import { Section } from "@/components/ui/section";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "O nás" };

export default async function AboutPage() {
  const { shop, pages } = await getSettings();
  return (
    <>
      <PageIntro eyebrow="O nás" title="Prodejna, ne sklad.">
        <p className="whitespace-pre-line">{pages.about}</p>
      </PageIntro>

      <Section tone="paper">
        <div className="grid gap-x-5 gap-y-7.5 md:grid-cols-3">
          <IconTile icon={Handshake} title="Poctivě" text="Víme, co je v každém balíčku, a řekneme to na rovinu. Žádné zázračné sliby." />
          <IconTile icon={MessageCircle} title="Srozumitelně" text="BARF umíme vysvětlit i úplnému začátečníkovi. Bez odborné hantýrky a bez poučování." />
          <IconTile icon={Smile} title="S nadsázkou" text="Máme rádi zvířata i slovní hříčky. Humor ano, ale nikdy na úkor zákazníka nebo zvířete." />
        </div>
      </Section>

      <Section>
        <div className="mx-auto flex max-w-narrow flex-col items-center gap-10 text-center md:flex-row md:text-left">
          <div className="flex-1">
            <SectionHeaderLeft />
            <address className="not-italic">
              {shop.address}, {shop.city}
              <br />
              {shop.phone}
              <br />
              {shop.email}
            </address>
            <dl className="mt-5 max-w-xs">
              {shop.openingHours.map((o) => (
                <div key={o.days} className="flex justify-between gap-5 border-b border-line py-2">
                  <dt>{o.days}</dt>
                  <dd className="font-semibold text-ink">{o.hours}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 mb-5">Nevíte, kolik masa dát? Stavte se, spočítáme to. Vezměte psa, miska s vodou je u dveří.</p>
            <LinkArrow href="/kontakt">Kontakt a mapa</LinkArrow>
          </div>
          {/* Místo pro kulatou fotku prodejny. */}
          <div className="flex size-64 shrink-0 items-center justify-center rounded-full bg-cream md:size-[350px]" role="img" aria-label="Logo DoKosti BARF">
            <Logo variant="barevne" width={220} className="w-3/5" />
          </div>
        </div>
      </Section>
    </>
  );
}

function SectionHeaderLeft() {
  return (
    <>
      <p className="text-eyebrow text-muted uppercase">Prodejna</p>
      <h2 className="mb-5 font-display text-display-md text-green md:text-display-lg">Kde nás najdete</h2>
    </>
  );
}
