import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { CookieConsent } from "@/components/layout/cookie-consent";
import { SITE_URL } from "@/lib/seo";
import { SITE } from "@/lib/site";
import "./globals.css";

// Fraunces: titulky (H1, titulky sekcí, ceny na kartách). Inter: všechno ostatní. Viz design/fonts.ts.
const serif = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-serif",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
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
      className={`${serif.variable} ${sans.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
