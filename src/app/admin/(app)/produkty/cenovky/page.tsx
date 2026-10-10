import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "@/components/admin/print-button";
import type { ProductRow } from "@/lib/admin";
import { LINE_INFO, LINES, productName } from "@/lib/catalog";
import { formatPrice, formatWeight, pricePerKg } from "@/lib/format";
import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Cenovky" };

/** Regálové cenovky: název, balení, cena, cena za kg a složení ve zkratce. Tisk na A4, osm na stránku. */
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
    <Link key={href} href={href} className={`label inline-flex min-h-8 items-center rounded-full border px-3 text-[11px] ${on ? "border-green bg-green text-cream" : "border-line bg-paper text-green hover:border-green"}`}>
      {label}
    </Link>
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="label text-[11px] text-muted">
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
        {list.map((p) => (
          <div key={p.id} className="break-inside-avoid flex h-[150px] flex-col rounded-[var(--radius-card)] border border-line bg-white p-3 print:h-[70mm] print:rounded-none print:border-dashed print:border-ink">
            <p className="label text-[10px] text-muted">{LINE_INFO[p.line].name}</p>
            <p className="font-display text-[20px] font-semibold leading-tight">{productName(p)}</p>
            <p className="text-xs text-muted">{p.unit === "kg" ? "na váhu" : formatWeight(p.weight_grams)}{p.producer ? ` · ${p.producer}` : ""}</p>
            <div className="mt-auto flex items-end justify-between gap-2">
              <div>
                <p className="font-display text-[28px] font-bold leading-none text-green">
                  {formatPrice(p.price_czk)}
                  {p.unit === "kg" && <span className="text-[14px]">/kg</span>}
                </p>
                {p.original_price_czk && <p className="text-xs text-muted line-through">{formatPrice(p.original_price_czk)}</p>}
              </div>
              {p.unit === "ks" && p.weight_grams > 0 && <p className="text-xs text-muted">{formatPrice(pricePerKg(p.price_czk, p.weight_grams))}/kg</p>}
            </div>
            {p.ean && <p className="mt-1 font-mono text-[9px] text-muted">{p.ean}</p>}
          </div>
        ))}
      </div>
    </>
  );
}
