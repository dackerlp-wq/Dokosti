import { Font } from "@react-pdf/renderer";
import path from "node:path";

/**
 * Společný základ PDF dokumentů (plán krmení, výplatní páska): písma a barvy podle BRAND.md.
 * Soubory písem jsou v public/fonts (statické řezy z Google Fonts), logo v public/brand.
 */
const fontsDir = path.join(process.cwd(), "public", "fonts");
let registered = false;

export function registerPdfFonts() {
  if (registered) return;
  Font.register({ family: "Fraunces", src: path.join(fontsDir, "fraunces-600.ttf"), fontWeight: 600 });
  Font.register({
    family: "Archivo",
    fonts: [
      { src: path.join(fontsDir, "archivo-400.ttf"), fontWeight: 400 },
      { src: path.join(fontsDir, "archivo-600.ttf"), fontWeight: 600 },
    ],
  });
  Font.register({ family: "Archivo Narrow", src: path.join(fontsDir, "archivo-narrow-500.ttf"), fontWeight: 500 });
  Font.registerHyphenationCallback((w) => [w]);
  registered = true;
}

export const PDF_COLORS = { green: "#1f3a2d", cream: "#f3ecdd", paper: "#fbf7ee", brick: "#b5532f", brickText: "#9c4424", ink: "#24221f", muted: "#55645a", line: "#d9cfb8" };

export const PDF_LOGO = path.join(process.cwd(), "public", "brand", "dokosti-logo-barevne-na-kremove.png");
