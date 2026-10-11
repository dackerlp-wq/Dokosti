import { Amatic_SC, Montserrat } from "next/font/google";

// Amatic SC: jen titulky (H1, titulek sekce). Montserrat: všechno ostatní.
export const amatic = Amatic_SC({
  weight: "700",
  subsets: ["latin", "latin-ext"],
  variable: "--font-amatic",
  display: "swap",
});

export const montserrat = Montserrat({
  subsets: ["latin", "latin-ext"],
  variable: "--font-montserrat",
  display: "swap",
});

// app/layout.tsx:
// <html lang="cs" className={`${amatic.variable} ${montserrat.variable}`}>
