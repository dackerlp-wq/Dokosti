import type { Metadata } from "next";
import { Archivo, Archivo_Narrow, Fraunces } from "next/font/google";
import { CartProvider } from "@/components/cart/cart-context";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { getProducts } from "@/lib/products";
import { SITE } from "@/lib/site";
import "./globals.css";

/** Katalog se přegeneruje nejpozději za minutu po změně v Supabase. */
export const revalidate = 60;

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const products = await getProducts();
  return (
    <html
      lang="cs"
      className={`${fraunces.variable} ${archivoNarrow.variable} ${archivo.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <CartProvider products={products}>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
