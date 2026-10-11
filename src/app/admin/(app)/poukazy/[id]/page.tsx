import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelVoucher } from "@/app/admin/(app)/poukazy/actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { PrintButton } from "@/components/admin/print-button";
import { formatDay, type CouponRow } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { getAuthSupabase, requireManager } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Poukaz" };

/** Kartička poukazu k tisku (A6 na šířku, dvě na A4) a zneplatnění. */
export default async function VoucherPage({ params }: { params: Promise<{ id: string }> }) {
  await requireManager();
  const { id } = await params;
  const [db, settings] = await Promise.all([getAuthSupabase(), getSettings()]);
  const { data } = await db.from("coupons").select("*").eq("id", id).eq("kind", "poukaz").maybeSingle();
  if (!data) notFound();
  const c = data as CouponRow;
  const today = new Date().toISOString().slice(0, 10);
  const used = c.used_count > 0;
  const invalid = !c.active || (c.valid_to !== null && c.valid_to < today);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="label text-[11px] text-muted">
            <Link href="/admin/poukazy" className="hover:underline">
              Dárkové poukazy
            </Link>{" "}
            · {c.code}
          </p>
          <h1>Poukaz {formatPrice(c.value)}</h1>
          <p className="text-sm text-muted">
            {used ? "Uplatněný." : invalid ? "Neplatný." : `Platný${c.valid_to ? ` do ${formatDay(c.valid_to)}` : ""}.`} {c.sold_czk === null ? "Darovaný." : `Prodaný za ${formatPrice(c.sold_czk)}.`}
            {c.note ? ` ${c.note}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {!used && c.active && (
            <ConfirmButton action={cancelVoucher} fields={{ id: c.id }} title="Zneplatnit poukaz" text="Kód přestane platit v kase i na webu. Použijte při ztrátě nebo storno prodeje." confirmLabel="Zneplatnit" reasonName="reason" reasonRequired variant="ghost" className="min-h-9 text-[11px]">
              Zneplatnit
            </ConfirmButton>
          )}
          <PrintButton />
        </div>
      </div>
      <div className="mx-auto w-[148mm] rounded-[var(--radius-card)] border-2 border-green bg-paper p-6 print:border-dashed print:rounded-none" style={{ aspectRatio: "148 / 105" }}>
        <div className="flex h-full flex-col justify-between">
          <div>
            <p className="label text-[11px] text-brick-text">Dárkový poukaz</p>
            <p className="text-[44px] font-semibold leading-none text-green">{formatPrice(c.value)}</p>
            {c.recipient && <p className="mt-2 text-[15px]">{c.recipient}</p>}
          </div>
          <div>
            <p className="label text-[10px] text-muted">Kód poukazu</p>
            <p className="font-mono text-[26px] font-semibold tracking-[0.12em] text-ink">{c.code}</p>
          </div>
          <div className="flex items-end justify-between gap-4 text-[11px] text-muted">
            <p>
              Uplatníte v prodejně {settings.shop.name}
              {settings.shop.address ? `, ${settings.shop.address}` : ""} nebo na webu zadáním kódu v košíku. Jednorázově, nevrací se hotovost.
            </p>
            <p className="shrink-0 text-right">
              {c.valid_to ? `Platí do ${formatDay(c.valid_to)}` : "Bez omezení"}
              <br />
              <span className="text-[16px] font-semibold text-green">{settings.shop.name}</span>
            </p>
          </div>
        </div>
      </div>
      <p className="mx-auto mt-3 w-[148mm] text-xs text-muted print:hidden">Tisk na A4, kartička má formát A6 na šířku. Nastřihnout, případně přeložit.</p>
    </>
  );
}
