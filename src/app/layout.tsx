import type { Metadata } from "next";
import { Amatic_SC, Montserrat } from "next/font/google";
import { CookieConsent } from "@/components/layout/cookie-consent";
import { SITE_URL } from "@/lib/seo";
import { SITE } from "@/lib/site";
import "./globals.css";

// Amatic SC: jen titulky (H1, titulek sekce). Montserrat: všechno ostatní. Viz design/fonts.ts.
const amatic = Amatic_SC({
  weight: "700",
  subsets: ["latin", "latin-ext"],
  variable: "--font-amatic",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin", "latin-ext"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE.name} · Syrové krmivo pro psy a kočky`,
    template: `%s · ${SITE.name}`,
  },
  description:
    "Kamenná prodejna a e-shop se syrovým krmivem (BARF) pro psy a kočky. Osobní odběr, rozvoz po Kladensku a chlazená doprava po celé ČR.",
  icons: { icon: "/brand/dokosti-profilovka.png" },
  openGraph: {
    title: SITE.name,
    description: "Poctivé do kosti.",
    images: ["/brand/dokosti-profilovka.png"],
    locale: "cs_CZ",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="cs"
      className={`${amatic.variable} ${montserrat.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
