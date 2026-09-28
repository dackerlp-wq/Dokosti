/** Veřejná adresa webu (sitemap, canonical, odkazy v e-mailech). Přepíše se proměnnou NEXT_PUBLIC_SITE_URL. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dokosti.cz";
/** Adresa bez protokolu, pro tištěné materiály. */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
