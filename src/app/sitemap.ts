import type { MetadataRoute } from "next";
import { LINES } from "@/lib/catalog";
import { getProducts } from "@/lib/products";
import { SITE_URL } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts();
  const now = new Date();
  const statics = ["", "/doprava", "/o-nas", "/kontakt", "/jak-zacit-s-barfem", "/obchodni-podminky", "/ochrana-udaju"];
  return [
    ...statics.map((p) => ({ url: `${SITE_URL}${p}`, lastModified: now, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 })),
    ...LINES.map((l) => ({ url: `${SITE_URL}/rada/${l}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })),
    ...products.map((p) => ({ url: `${SITE_URL}/produkt/${p.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
