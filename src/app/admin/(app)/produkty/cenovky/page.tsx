import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "@/components/admin/print-button";
import type { ProductRow } from "@/lib/admin";
import { LINE_INFO, LINES, productName } from "@/lib/catalog";
import { formatPrice, formatWeight, pricePerKg } from "@/lib/format";
import { storePrice } from "@/lib/pos";
import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Cenovky" };

/** Regálové cenovky: název, balení, cena pro prodejnu (během akce akční), cena za kg. Tisk na A4, osm na stránku. */
export default async function PriceTagsPage({ searchParams }: { searchParams: Promise<{ rada?: string; produkt?: string }> }) {
  await requireAdmin();
  const { rada, produkt } = await searchParams;
  const db = await getAuthSupabase();
  let q = db.from("products").select("*").eq("is_published", true).order("line").order("sort_order").order("variant");
  if (rada) q = q.eq("line", rada);
  if (produkt) q = q.eq("id", produkt);
  const { data } = await q;
  const list = (data ?? []) as ProductRow[];
  const chip = (href: string, label: string, on: boolean) => (
    <Link key={href} href={href} className={`text-button inline-flex min-h-8 items-center rounded-full border px-3 ${on ? "border-green bg-green text-cream" : "border-line bg-paper text-green hover:border-green"}`}>
      {label}
    </Link>
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="text-eyebrow uppercase text-muted">
            <Link href="/admin/produkty" className="hover:underline">
              Produkty
            </Link>{" "}
            · Cenovky
          </p>
          <h1>Cenovky</h1>
          <p className="text-sm text-muted">{list.length} cenovek. Tisk na A4, osm na stránku, nastříhat. Po změně ceny nebo příjmu nového zboží vytiskněte jen danou řadu.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {chip("/admin/produkty/cenovky", "Vše", !rada)}
            {LINES.map((l) => chip(`/admin/produkty/cenovky?rada=${l}`, LINE_INFO[l].name, rada === l))}
          </div>
        </div>
        <PrintButton />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-2 print:gap-0">
        {list.map((p) => {
          const price = storePrice(p);
          return (
          <div key={p.id} className="break-inside-avoid flex h-[150px] flex-col rounded-card border border-line bg-white p-3 print:h-[70mm] print:rounded-none print:border-dashed print:border-ink">
            <p className="text-eyebrow uppercase text-muted">{LINE_INFO[p.line].name}</p>
            <p className="text-[20px] font-semibold leading-tight">{productName(p)}</p>
            <p className="text-small text-muted">{p.unit === "kg" ? "na váhu" : formatWeight(p.weight_grams)}{p.producer ? ` · ${p.producer}` : ""}</p>
            <div className="mt-auto flex items-end justify-between gap-2">
              <div>
                <p className="text-[28px] font-bold leading-none text-green">
                  {formatPrice(price)}
                  {p.unit === "kg" && <span className="text-[14px]">/kg</span>}
                </p>
                {p.original_price_czk && <p className="text-small text-muted line-through">{formatPrice(p.original_price_czk)}</p>}
              </div>
              {p.unit === "ks" && p.weight_grams >= 50 && <p className="text-small text-muted">{formatPrice(pricePerKg(price, p.weight_grams))}/kg</p>}
            </div>
            {p.ean && <p className="mt-1 font-mono text-[9px] text-muted">{p.ean}</p>}
          </div>
          );
        })}
      </div>
    </>
  );
}
