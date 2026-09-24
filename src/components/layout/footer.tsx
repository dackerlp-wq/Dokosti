import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { getSettings } from "@/lib/settings";
import { NAV, SITE } from "@/lib/site";

export async function Footer() {
  const { shop } = await getSettings();
  return (
    <footer className="mt-12 bg-green text-cream">
      <div className="container-dk grid gap-8 py-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo variant="negativ" width={180} />
          <p className="mt-4 max-w-xs text-sm text-cream/80">
            Kamenná prodejna a e-shop se syrovým krmivem pro psy a kočky. Kladno.
          </p>
        </div>

        <FooterCol title="Nabídka">
          {NAV.slice(0, 5).map((i) => (
            <FooterLink key={i.href} href={i.href}>
              {i.label}
            </FooterLink>
          ))}
        </FooterCol>

        <FooterCol title="Prodejna">
          <address className="not-italic text-sm text-cream/80">
            {shop.address}, {shop.city}
            <br />
            {shop.phone}
            <br />
            {shop.email}
          </address>
          <ul className="mt-3 text-sm text-cream/80">
            {shop.openingHours.map((o) => (
              <li key={o.days}>
                {o.days} {o.hours}
              </li>
            ))}
          </ul>
        </FooterCol>

        <FooterCol title="Informace">
          <FooterLink href="/doprava">Doprava a platba</FooterLink>
          <FooterLink href="/o-nas">O nás</FooterLink>
          <FooterLink href="/kontakt">Kontakt</FooterLink>
          <FooterLink href="/obchodni-podminky">Obchodní podmínky</FooterLink>
          <FooterLink href="/ochrana-udaju">Ochrana údajů</FooterLink>
        </FooterCol>
      </div>
      <div className="border-t border-green-hover">
        <div className="container-dk flex flex-col gap-2 py-3 text-xs text-cream/70 md:flex-row md:justify-between">
          <span>
            © {new Date().getFullYear()} {SITE.name} · IČO {shop.ico}
          </span>
          <span className="font-display">{SITE.slogan}</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="label mb-3 font-label text-[14px] text-cream/90">{title}</h2>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm text-cream/80 hover:text-cream hover:underline">
      {children}
    </Link>
  );
}
