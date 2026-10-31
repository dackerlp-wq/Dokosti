import { Fraunces, Inter } from "next/font/google";

// Fraunces: titulky (H1, titulky sekcí, ceny na kartách). Inter: všechno ostatní.
export const serif = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-serif",
  display: "swap",
});

export const sans = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

// app/layout.tsx:
// <html lang="cs" className={`${serif.variable} ${sans.variable}`}>
