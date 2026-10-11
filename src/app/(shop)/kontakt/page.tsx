import type { Metadata } from "next";
import { Clock, MapPin, Phone } from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";
import { PageIntro } from "@/components/ui/page-intro";
import { Section } from "@/components/ui/section";
import { getSettings } from "@/lib/settings";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Kontakt" };

export default async function ContactPage() {
  const { shop } = await getSettings();
  const phone = shop.phone.startsWith("[") ? null : shop.phone;
  return (
    <>
      <PageIntro eyebrow="Kontakt" title="Ozvěte se">
        <p>
          Zavolejte, napište, nebo se stavte v prodejně. Na dotazy ke krmení
          odpovídáme zpravidla do jednoho pracovního dne.
        </p>
      </PageIntro>
      <Section tone="paper">
        <div className="grid gap-x-5 gap-y-7.5 md:grid-cols-3">
          <IconTile icon={MapPin} title="Prodejna">
            <address className="px-6 not-italic">
              {SITE.name}
              <br />
              {shop.address}, {shop.city}
              <br />
              <span className="text-small">IČO {shop.ico}</span>
            </address>
          </IconTile>
          <IconTile icon={Phone} title="Telefon a e-mail">
            <p className="px-6">
              {phone ? (
                <a
                  href={`tel:${phone.replace(/\s+/g, "")}`}
                  className="font-semibold text-green hover:underline"
                >
                  {phone}
                </a>
              ) : (
                shop.phone
              )}
              <br />
              {shop.email.includes("@") ? (
                <a
                  href={`mailto:${shop.email}`}
                  className="text-brick-text hover:underline"
                >
                  {shop.email}
                </a>
              ) : (
                shop.email
              )}
            </p>
          </IconTile>
          <IconTile icon={Clock} title="Otevírací doba">
            <dl className="w-full max-w-xs px-6 text-left">
              {shop.openingHours.map((o) => (
                <div
                  key={o.days}
                  className="flex justify-between gap-5 border-b border-line py-2 last:border-0"
                >
                  <dt>{o.days}</dt>
                  <dd className="font-semibold text-ink">{o.hours}</dd>
                </div>
              ))}
            </dl>
          </IconTile>
        </div>
      </Section>
    </>
  );
}
