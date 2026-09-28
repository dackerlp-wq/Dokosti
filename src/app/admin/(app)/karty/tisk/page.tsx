import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { cardUrl } from "@/lib/cards";
import { SITE_URL } from "@/lib/seo";
import { getAuthSupabase } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Karty: náhled pro tisk" };

/** Náhled dávky s QR kódy: kontrola před tiskem, nebo nouzový tisk na štítky z prohlížeče (Ctrl+P). */
export default async function CardsPrintPage({ searchParams }: { searchParams: Promise<{ davka?: string }> }) {
  const { davka } = await searchParams;
  const batch = Number(davka);
  if (!Number.isInteger(batch) || batch < 1) notFound();
  const db = await getAuthSupabase();
  const { data } = await db.from("cards").select("code").eq("batch", batch).order("code");
  const codes = ((data ?? []) as { code: string }[]).map((c) => c.code);
  if (codes.length === 0) notFound();
  const qrs = await Promise.all(codes.map((code) => QRCode.toDataURL(cardUrl(SITE_URL, code), { margin: 1, width: 240, color: { dark: "#1f3a2d", light: "#ffffff" } })));

  return (
    <div className="bg-white p-6 text-ink print:p-0">
      <p className="mb-4 text-sm text-muted print:hidden">
        Dávka {batch}, {codes.length} karet. Každá dlaždice je jedna karta: QR vede na {cardUrl(SITE_URL, "KÓD")}. Tisk: Ctrl+P.
      </p>
      <div className="grid grid-cols-3 gap-4 md:grid-cols-4 print:grid-cols-4 print:gap-2">
        {codes.map((code, i) => (
          <div key={code} className="flex break-inside-avoid flex-col items-center rounded-[var(--radius-card)] border border-line p-3 print:rounded-none">
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL, bez optimalizace */}
            <img src={qrs[i]} alt={`QR karty ${code}`} width={120} height={120} />
            <span className="mt-1 font-mono text-sm tracking-wider">{code}</span>
            <span className="label text-[9px] text-muted">DoKosti klub</span>
          </div>
        ))}
      </div>
    </div>
  );
}
