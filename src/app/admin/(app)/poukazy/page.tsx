import type { Metadata } from "next";
import Link from "next/link";
import { issueVoucher } from "@/app/admin/(app)/poukazy/actions";
import { PageHeader } from "@/components/admin/page-header";
import { Pills, Stat } from "@/components/admin/stat";
import { Table, Td } from "@/components/admin/table";
import { Button } from "@/components/ui/button";
import { formatDay, type CouponRow } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import { getAuthSupabase, requireManager } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Dárkové poukazy" };

/** Dárkové poukazy: kód na částku, jedno použití, uplatní se v kase i na webu jako slevový kód. */
export default async function VouchersPage({ searchParams }: { searchParams: Promise<{ pohled?: string }> }) {
  await requireManager();
  const { pohled } = await searchParams;
  const db = await getAuthSupabase();
  const { data } = await db.from("coupons").select("*").eq("kind", "poukaz").order("created_at", { ascending: false }).limit(300);
  const all = (data ?? []) as CouponRow[];
  const today = new Date().toISOString().slice(0, 10);
  const state = (c: CouponRow) => (c.used_count > 0 ? "uplatnen" : !c.active ? "zneplatnen" : c.valid_to && c.valid_to < today ? "prosly" : "platny");
  const rows = all.filter((c) => (pohled ? state(c) === pohled : true));
  const openValue = all.filter((c) => state(c) === "platny").reduce((n, c) => n + c.value, 0);
  const label: Record<string, string> = { platny: "Platný", uplatnen: "Uplatněný", prosly: "Prošlý", zneplatnen: "Zneplatněný" };
  const nextYear = new Date(new Date().getTime() + 365 * 86_400_000).toISOString().slice(0, 10);

  return (
    <>
      <PageHeader title="Dárkové poukazy" subtitle="Poukaz je kód na částku, platí rok a uplatní se jednou, v kase i na webu jako slevový kód. Prodaný poukaz je příjem teď, zboží odejde až při uplatnění." />
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Platných v oběhu" value={formatPrice(openValue)} sub={`${all.filter((c) => state(c) === "platny").length} poukazů (závazek)`} small />
        <Stat label="Uplatněno" value={all.filter((c) => state(c) === "uplatnen").length} small />
        <Stat label="Prodáno celkem" value={formatPrice(all.reduce((n, c) => n + (c.sold_czk ?? 0), 0))} small />
        <Stat label="Darováno (bez prodeje)" value={all.filter((c) => c.sold_czk === null).length} small />
      </div>
      <form action={issueVoucher} className="mt-4 rounded-card border border-line bg-white p-4">
        <p className="mb-2 text-label text-green">Vystavit poukaz</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block">
            <span className="mb-1 block text-label text-green">Hodnota (Kč)</span>
            <input name="value" type="number" min={100} max={20000} step={50} defaultValue={500} required className="min-h-9 py-1" />
          </label>
          <label className="block lg:col-span-2">
            <span className="mb-1 block text-label text-green">Pro koho (na kartičku)</span>
            <input name="recipient" placeholder="např. Pro Alíka a jeho paničku" className="min-h-9 py-1" />
          </label>
          <label className="block">
            <span className="mb-1 block text-label text-green">Platí do</span>
            <input name="valid_to" type="date" defaultValue={nextYear} className="min-h-9 py-1" />
          </label>
          <label className="block">
            <span className="mb-1 block text-label text-green">Poznámka (interní)</span>
            <input name="note" placeholder="kdo koupil, jak zaplatil" className="min-h-9 py-1" />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="sold" value="1" defaultChecked className="h-4 w-4" /> Prodaný (zákazník zaplatil)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted">za</span>
            <input name="sold_czk" type="number" min={0} step={1} placeholder="= hodnota" className="min-h-9 w-28 py-1" />
            <span className="text-muted">Kč</span>
          </label>
          <Button type="submit" className="min-h-9">
            Vystavit a tisknout
          </Button>
          <span className="text-small text-muted">Platbu za poukaz namarkujte v kase jako prodej bez zboží (sleva/poznámka), nebo zapište do Financí jako příjem. Nezaškrtnutý = dar či náhrada za reklamaci.</span>
        </div>
      </form>
      <div className="mt-4">
        <Pills
          items={[
            { href: "/admin/poukazy", label: `Vše · ${all.length}`, on: !pohled },
            ...(["platny", "uplatnen", "prosly", "zneplatnen"] as const).map((k) => ({ href: `/admin/poukazy?pohled=${k}`, label: `${label[k]} · ${all.filter((c) => state(c) === k).length}`, on: pohled === k })),
          ]}
        />
      </div>
      <div className="mt-4">
        {rows.length === 0 ? (
          <p className="text-muted">Zatím žádný poukaz.</p>
        ) : (
          <Table head={["Kód", "Hodnota", "Pro koho", "Platí do", "Prodán", "Stav", ""]}>
            {rows.map((c) => (
              <tr key={c.id}>
                <Td>
                  <Link href={`/admin/poukazy/${c.id}`} className="font-mono font-semibold text-brick-text hover:underline">
                    {c.code}
                  </Link>
                  {c.note && <div className="text-small text-muted">{c.note}</div>}
                </Td>
                <Td className="font-semibold">{formatPrice(c.value)}</Td>
                <Td>{c.recipient || "—"}</Td>
                <Td className="whitespace-nowrap">{c.valid_to ? formatDay(c.valid_to) : "bez omezení"}</Td>
                <Td className="text-muted">{c.sold_czk === null ? "dar" : formatPrice(c.sold_czk)}</Td>
                <Td>
                  <span className={`text-button rounded-full px-2 py-0.5 ${state(c) === "platny" ? "bg-green text-cream" : state(c) === "uplatnen" ? "border border-line bg-white text-muted" : "bg-brick text-white"}`}>{label[state(c)]}</span>
                </Td>
                <Td className="text-right">
                  <Link href={`/admin/poukazy/${c.id}`} className="text-sm text-brick-text hover:underline">
                    tisk
                  </Link>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </>
  );
}
