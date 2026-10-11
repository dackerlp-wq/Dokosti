import type { Metadata } from "next";
import { CreditCard, Landmark, Snowflake, Store, Truck, Wallet, type LucideIcon } from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";
import { PageIntro } from "@/components/ui/page-intro";
import { Section, SectionHeader } from "@/components/ui/section";
import { StepDisc } from "@/components/ui/field";
import { formatPrice } from "@/lib/format";
import { DAY_NAMES, getSettings } from "@/lib/settings";
import { paymentMethods, type PaymentId, type ShippingId, shippingMethods } from "@/lib/shipping";

export const metadata: Metadata = {
  title: "Doprava a platba",
  description: "Osobní odběr v Kladně, rozvoz po okolí a chlazený přepravce po celé ČR.",
};

const SHIPPING_ICON: Record<ShippingId, LucideIcon> = { odber: Store, rozvoz: Truck, prepravce: Snowflake };
const PAYMENT_ICON: Record<PaymentId, LucideIcon> = { karta: CreditCard, prevod: Landmark, hotove: Wallet };

const AFTER = [
  "Balík rozbalte hned a krmivo dejte do mrazáku. Suchý led nechte odpařit venku, neberte ho do ruky.",
  "Lehce namrzlé okraje jsou v pořádku. Rozmražené a teplé krmivo ne, v tom případě nám zavolejte.",
  "Krmivo, které chcete použít, rozmrazujte v lednici, ne na lince.",
];

export default async function ShippingPage() {
  const settings = await getSettings();
  const SHIPPING = shippingMethods(settings);
  const PAYMENT = paymentMethods(settings);
  const rozvozDny = settings.shipping.rozvoz.days.map((d) => DAY_NAMES[d]).join(" a ");
  return (
    <>
      <PageIntro eyebrow="Doručení" title="Mražené dovezeme mražené">
        <p>Syrové krmivo nesmí cestou rozmrznout. Proto nejde poslat běžným balíkem ani na výdejní místo. Máme tři cesty, jak ho dostat k vám.</p>
      </PageIntro>

      <Section tone="paper">
        <div className="grid gap-x-5 gap-y-7.5 md:grid-cols-3">
          {SHIPPING.map((s) => (
            <IconTile
              key={s.id}
              icon={SHIPPING_ICON[s.id]}
              title={s.name}
              text={`${s.description}${s.id === "rozvoz" ? ` Jezdíme ${rozvozDny}, ${settings.shipping.rozvoz.window}.` : ""}`}
              action={
                <p className="text-small">
                  <span className="text-price text-green">{s.priceCzk === 0 ? "zdarma" : formatPrice(s.priceCzk)}</span>
                  {s.minOrderCzk > 0 && <span className="block">Minimální objednávka {formatPrice(s.minOrderCzk)}.</span>}
                  {s.freeFromCzk && <span className="block">Zdarma od {formatPrice(s.freeFromCzk)}.</span>}
                </p>
              }
            />
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeader eyebrow="Platba" title="Jak zaplatit" />
        <div className="grid gap-x-5 gap-y-7.5 md:grid-cols-3">
          {PAYMENT.map((p) => (
            <IconTile key={p.id} icon={PAYMENT_ICON[p.id]} title={p.name} text={p.description} />
          ))}
        </div>
      </Section>

      <Section tone="paper">
        <SectionHeader eyebrow="Po doručení" title="Co s balíkem" />
        <ol className="mx-auto grid max-w-text gap-5">
          {AFTER.map((text, i) => (
            <li key={text} className="flex items-start gap-5">
              <StepDisc n={i + 1} />
              <p className="pt-1.5">{text}</p>
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
}
