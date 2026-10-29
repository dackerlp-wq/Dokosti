import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  outputFileTracingIncludes: {
    "/kalkulacka/plan.pdf": ["./public/fonts/**", "./public/brand/dokosti-logo-barevne-na-kremove.png"],
    "/kalkulacka": ["./public/fonts/**", "./public/brand/dokosti-logo-barevne-na-kremove.png"],
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
  // Řada „Základ“ se přejmenovala na „BARF mixy“ (slug barf); staré adresy vedou dál.
  async redirects() {
    return [
      { source: "/rada/zaklad", destination: "/rada/barf", permanent: true },
      { source: "/produkt/zaklad-:rest", destination: "/produkt/barf-:rest", permanent: true },
      // Nové kategorie (2026-10): konzervy jsou podkategorie granulí, maso a vnitřnosti mají vlastní řadu.
      { source: "/rada/konzervy", destination: "/rada/granule/konzervy", permanent: true },
      { source: "/rada/konzervy/:maso", destination: "/rada/granule/konzervy", permanent: true },
      { source: "/rada/barf/ryby", destination: "/rada/maso/ryby", permanent: true },
      // Pamlsky a granule se dřív dělily podle masa, teď podle druhu.
      { source: "/rada/:rada(mlsky|granule)/:maso(kureci|kruti|kachni|hovezi|veprove|jehneci|kralici|kone|zverina|ryby)", destination: "/rada/:rada", permanent: true },
    ];
  },
};

export default nextConfig;
