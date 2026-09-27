import type { Metadata } from "next";
import Link from "next/link";
import { Table, Td } from "@/components/admin/table";
import { formatDate, type CustomerRow } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import { getAuthSupabase } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Zákazníci" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; filtr?: string }> }) {
  const { q, filtr } = await searchParams;
  const db = await getAuthSupabase();
  let query = db.from("customers").select("*").order("updated_at", { ascending: false }).limit(200);
  if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  if (filtr === "newsletter") query = query.not("consent_marketing_email_at", "is", null);
  if (filtr === "ucet") query = query.not("user_id", "is", null);
  if (filtr === "karta") query = query.not("card_code", "is", null);
  const { data } = await query;
  const customers = (data ?? []) as CustomerRow[];

  return (
    <>
      <h1>Zákazníci</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [
            ["", "Vše"],
            ["ucet", "S účtem"],
            ["karta", "S kartou"],
            ["newsletter", "Newsletter"],
          ] as [string, string][]
        ).map(([id, label]) => (
          <Link key={id} href={id ? `/admin/zakaznici?filtr=${id}` : "/admin/zakaznici"} className={`label inline-flex min-h-8 items-center rounded-full border px-3 text-[11px] ${(filtr ?? "") === id ? "border-green bg-green text-cream" : "border-line bg-paper text-green hover:border-green"}`}>
            {label}
          </Link>
        ))}
      </div>
      <form className="mt-3 flex max-w-md gap-2">
        {filtr && <input type="hidden" name="filtr" value={filtr} />}
        <input name="q" defaultValue={q} placeholder="Jméno, e-mail nebo telefon" aria-label="Hledat zákazníka" />
        <button type="submit" className="label shrink-0 rounded-[var(--radius-control)] border border-green px-3 text-green">
          Hledat
        </button>
      </form>
      <div className="mt-4">
        {customers.length === 0 ? (
          <p className="text-muted">Žádní zákazníci.</p>
        ) : (
          <Table head={["Jméno", "E-mail", "Telefon", "Klub", "Objednávek", "Utraceno", "Poslední aktivita"]}>
            {customers.map((c) => (
              <tr key={c.id}>
                <Td>
                  <Link href={`/admin/zakaznici/${c.id}`} className="font-semibold text-green hover:underline">
                    {c.name || "(bez jména)"}
                  </Link>
                </Td>
                <Td>{c.email}</Td>
                <Td>{c.phone}</Td>
                <Td className="text-xs text-muted">{[c.user_id ? "účet" : "", c.card_code ? "karta" : "", c.consent_marketing_email_at ? "newsletter" : ""].filter(Boolean).join(", ")}</Td>
                <Td>{c.orders_count}</Td>
                <Td>{formatPrice(c.total_spent_czk)}</Td>
                <Td>{formatDate(c.created_at)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </>
  );
}
