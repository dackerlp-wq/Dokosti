import type { Metadata } from "next";
import { Archivo, Archivo_Narrow, Fraunces } from "next/font/google";
import { SITE } from "@/lib/site";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "800"],
  variable: "--font-display",
});

const archivoNarrow = Archivo_Narrow({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
  variable: "--font-label",
});

const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600"],
  variable: "--font-body",
});

export const metadata: Metadata = {
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
      className={`${fraunces.variable} ${archivoNarrow.variable} ${archivo.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
