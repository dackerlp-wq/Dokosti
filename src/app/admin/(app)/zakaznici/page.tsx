import type { Metadata } from "next";
import Link from "next/link";
import { Table, Td } from "@/components/admin/table";
import { PageHeader } from "@/components/admin/page-header";
import { StockFilters } from "@/components/admin/stock-filters";
import { createTask } from "@/app/admin/(app)/ukoly/actions";
import { formatDate, formatDay, type CustomerRow } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Zákazníci" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; filtr?: string }> }) {
  await requireAdmin();
  const { q, filtr } = await searchParams;
  const db = await getAuthSupabase();
  let query = db.from("customers").select("*").order("updated_at", { ascending: false }).limit(200);
  if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  if (filtr === "newsletter") query = query.not("consent_marketing_email_at", "is", null);
  if (filtr === "ucet") query = query.not("user_id", "is", null);
  if (filtr === "karta") query = query.not("card_code", "is", null);
  // Péče o zákazníky: koho ztrácíme (nakupovali, ale 60+ dní nic), noví za 30 dní, nejlepší podle útraty.
  const ago = (d: number) => new Date(new Date().getTime() - d * 86_400_000).toISOString();
  if (filtr === "ztracime") query = query.gte("orders_count", 2).lt("last_order_at", ago(60)).order("last_order_at", { ascending: false });
  if (filtr === "novi") query = query.gte("created_at", ago(30));
  if (filtr === "nejlepsi") query = query.gt("total_spent_czk", 0).order("total_spent_czk", { ascending: false }).limit(50);
  const { data } = await query;
  const customers = (data ?? []) as CustomerRow[];

  return (
    <>
      <PageHeader title="Zákazníci" subtitle="Najděte zákazníka podle kontaktu a otevřete jeho objednávky, historii nákupů i věrnostní kartu." />
      <div className="mt-4">
        <StockFilters
          action="/admin/zakaznici"
          search={{ name: "q", value: q, placeholder: "Jméno, e-mail nebo telefon" }}
          selects={[{ name: "filtr", value: filtr, label: "Zobrazit zákazníky", options: [
            { value: "", label: "Všichni zákazníci" },
            { value: "ucet", label: "Mají účet" },
            { value: "karta", label: "Mají věrnostní kartu" },
            { value: "newsletter", label: "Souhlasili s novinkami" },
            { value: "novi", label: "Noví za 30 dní" },
            { value: "nejlepsi", label: "Nejvyšší útrata" },
            { value: "ztracime", label: "Dlouho nenakoupili" },
          ] }]}
        />
      </div>
      {filtr === "ztracime" && <p className="mt-3 text-sm text-muted">Nakoupili aspoň dvakrát a přes 60 dní nic. Zavolat, napsat, nabídnout předplatné. Tlačítko „ozvat se“ založí úkol s odkazem na zákazníka.</p>}
      <div className="mt-4">
        {customers.length === 0 ? (
          <p className="text-muted">{filtr === "ztracime" ? "Nikoho neztrácíme. Dobrá zpráva." : "Žádní zákazníci."}</p>
        ) : (
          <Table head={["Zákazník", "Kontakt", "Účet a klub", "Nákupy", "Poslední nákup", ""]}>
            {customers.map((c) => (
              <tr key={c.id}>
                <Td>
                  <Link href={`/admin/zakaznici/${c.id}`} className="font-semibold text-brick-text hover:underline">
                    {c.name || "(bez jména)"}
                  </Link>
                  <div className="text-small text-muted">Zákazník od {formatDate(c.created_at)}</div>
                </Td>
                <Td>
                  {c.email && <div><a href={`mailto:${c.email}`} className="hover:underline">{c.email}</a></div>}
                  {c.phone && <div><a href={`tel:${c.phone}`} className="text-small text-muted hover:underline">{c.phone}</a></div>}
                  {!c.email && !c.phone && <span className="text-muted">Bez kontaktu</span>}
                </Td>
                <Td className="text-small text-muted">{[c.user_id ? "účet" : "", c.card_code ? "karta" : "", c.consent_marketing_email_at ? "newsletter" : ""].filter(Boolean).join(", ")}</Td>
                <Td className="whitespace-nowrap"><span className="font-semibold">{c.orders_count} objednávek</span><div className="text-small text-muted">útrata {formatPrice(c.total_spent_czk)}</div></Td>
                <Td className="whitespace-nowrap text-muted">{c.last_order_at ? formatDay(c.last_order_at.slice(0, 10)) : "Zatím bez nákupu"}</Td>
                <Td className="text-right">
                  {filtr === "ztracime" && (
                    <form action={createTask}>
                      <input type="hidden" name="title" value={`Ozvat se: ${c.name || c.email}`} />
                      <input type="hidden" name="detail" value={`Naposledy nakoupil ${c.last_order_at ? formatDay(c.last_order_at.slice(0, 10)) : "—"}, celkem ${c.orders_count}× za ${formatPrice(c.total_spent_czk)}. ${c.phone || c.email || ""} · /admin/zakaznici/${c.id}`} />
                      <button type="submit" className="text-button min-h-8 rounded-control border border-line px-2 text-green hover:border-green">
                        ozvat se
                      </button>
                    </form>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </>
  );
}
