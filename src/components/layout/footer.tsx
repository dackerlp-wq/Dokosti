import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { getSettings } from "@/lib/settings";
import { CATEGORY_NAV, SITE } from "@/lib/site";

const SERVICE_NAV = [
  { href: "/jak-zacit-s-barfem", label: "Jak začít s BARFem" },
  { href: "/kalkulacka", label: "Kalkulačka dávky" },
  { href: "/doprava", label: "Doprava a platba" },
  { href: "/o-nas", label: "O nás" },
  { href: "/kontakt", label: "Kontakt" },
  { href: "/ucet", label: "Můj účet" },
  { href: "/obchodni-podminky", label: "Obchodní podmínky" },
  { href: "/ochrana-udaju", label: "Ochrana údajů" },
];

/** Nízká zelená patička bez sloupců: řádek řad, řádek servisních odkazů, spodní pruh s logem, telefonem a copyrightem. */
export async function Footer() {
  const { shop } = await getSettings();
  const phone = shop.phone.startsWith("[") ? null : shop.phone;
  const address = shop.address.startsWith("[") ? shop.city : `${shop.address}, ${shop.city}`;
  return (
    <footer className="mt-auto bg-green px-5 pt-6.5 pb-5 text-center text-cream">
      <div className="mx-auto max-w-site">
        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-[16px] font-semibold">
          {CATEGORY_NAV.map((i) => (
            <li key={i.href}>
              <Link href={i.href} className="hover:underline">
                {i.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/krmeni-na-miru" className="hover:underline">
              Krmení na míru
            </Link>
          </li>
        </ul>
        <ul className="mt-2.5 flex flex-wrap justify-center gap-x-4 gap-y-1 text-small font-semibold text-cream/90">
          {SERVICE_NAV.map((i) => (
            <li key={i.href}>
              <Link href={i.href} className="hover:underline">
                {i.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-col items-center justify-center gap-3 border-t border-green-hover pt-5 text-small md:flex-row md:gap-5">
          <Logo variant="napis-negativ" width={96} />
          {phone && (
            <a href={`tel:${phone.replace(/\s+/g, "")}`} className="rounded-control bg-cream px-2.5 py-1.25 font-semibold text-green hover:bg-paper">
              {phone}
            </a>
          )}
          <span>
            © {new Date().getFullYear()} {SITE.name} · {address} · IČO {shop.ico}
          </span>
        </div>
      </div>
    </footer>
  );
}
