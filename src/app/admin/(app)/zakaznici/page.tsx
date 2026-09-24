import type { Metadata } from "next";
import Link from "next/link";
import { Table, Td } from "@/components/admin/table";
import { formatDate, type CustomerRow } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import { getAuthSupabase } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Zákazníci" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const db = await getAuthSupabase();
  let query = db.from("customers").select("*").order("updated_at", { ascending: false }).limit(200);
  if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  const { data } = await query;
  const customers = (data ?? []) as CustomerRow[];

  return (
    <>
      <h1>Zákazníci</h1>
      <form className="mt-4 flex max-w-md gap-2">
        <input name="q" defaultValue={q} placeholder="Jméno, e-mail nebo telefon" aria-label="Hledat zákazníka" />
        <button type="submit" className="label shrink-0 rounded-[var(--radius-control)] border border-green px-3 text-green">
          Hledat
        </button>
      </form>
      <div className="mt-4">
        {customers.length === 0 ? (
          <p className="text-muted">Žádní zákazníci.</p>
        ) : (
          <Table head={["Jméno", "E-mail", "Telefon", "Objednávek", "Utraceno", "Poslední aktivita"]}>
            {customers.map((c) => (
              <tr key={c.id}>
                <Td>
                  <Link href={`/admin/zakaznici/${c.id}`} className="font-semibold text-green hover:underline">
                    {c.name || "(bez jména)"}
                  </Link>
                </Td>
                <Td>{c.email}</Td>
                <Td>{c.phone}</Td>
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
