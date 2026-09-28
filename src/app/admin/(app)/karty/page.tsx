import type { Metadata } from "next";
import Link from "next/link";
import { Table, Td } from "@/components/admin/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/admin";
import { cardUrl } from "@/lib/cards";
import { SITE_URL } from "@/lib/seo";
import { getAdmin, getAuthSupabase } from "@/lib/supabase/auth";
import { generateCards, setCardBlocked } from "./actions";

export const metadata: Metadata = { title: "Věrnostní karty" };

type CardRow = { code: string; batch: number; status: "volna" | "prirazena" | "blokovana"; customer_id: string | null; assigned_at: string | null; created_at: string; customers: { name: string; email: string | null } | null };
const STATUS_LABEL = { volna: "volná", prirazena: "přiřazená", blokovana: "blokovaná" } as const;

/** Dávky předtištěných karet: vytvoření, export pro tiskárnu, stav a blokace. Viz docs/KARTY.md. */
export default async function CardsPage({ searchParams }: { searchParams: Promise<{ davka?: string; stav?: string; q?: string; chyba?: string }> }) {
  const [{ davka, stav, q, chyba }, admin] = await Promise.all([searchParams, getAdmin()]);
  const db = await getAuthSupabase();
  const { data: all } = await db.from("cards").select("batch, status");
  const rows = (all ?? []) as { batch: number; status: CardRow["status"] }[];
  const batches = [...new Set(rows.map((r) => r.batch))].sort((a, b) => b - a);
  const stat = (b: number) => ({
    total: rows.filter((r) => r.batch === b).length,
    free: rows.filter((r) => r.batch === b && r.status === "volna").length,
    assigned: rows.filter((r) => r.batch === b && r.status === "prirazena").length,
    blocked: rows.filter((r) => r.batch === b && r.status === "blokovana").length,
  });

  let query = db.from("cards").select("code, batch, status, customer_id, assigned_at, created_at, customers(name, email)").order("created_at", { ascending: false }).limit(300);
  if (davka) query = query.eq("batch", Number(davka));
  if (stav) query = query.eq("status", stav);
  if (q) query = query.ilike("code", `%${q.toUpperCase()}%`);
  const { data } = await query;
  const cards = (data ?? []) as unknown as CardRow[];
  const back = new URLSearchParams({ ...(davka ? { davka } : {}), ...(stav ? { stav } : {}), ...(q ? { q } : {}) }).toString();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1>Věrnostní karty</h1>
        {admin?.isManager && (
          <form action={generateCards} className="flex items-center gap-2">
            <input type="number" name="count" defaultValue={100} min={1} max={1000} className="w-24" aria-label="Počet karet" />
            <Button type="submit">Nová dávka</Button>
          </form>
        )}
      </div>
      {chyba && (
        <p role="alert" className="mt-3 text-sm text-brick-text">
          {chyba === "opravneni" ? "Dávku může vytvořit jen správce." : "Dávku se nepodařilo vytvořit."}
        </p>
      )}
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Kód karty vzniká tady, před tiskem. Na kartě je QR s adresou <span className="font-mono">{cardUrl(SITE_URL, "KÓD")}</span> a kód tiskacím písmem. Sken u kasy kartu přiřadí,
        sken telefonem zákazníka ji aktivuje (registrace na jeden krok). Ztracenou kartu zablokujte.
      </p>

      {batches.length > 0 && (
        <div className="mt-5">
          <Table head={["Dávka", "Karet", "Volné", "Přiřazené", "Blokované", "Tisk"]}>
            {batches.map((b) => {
              const s = stat(b);
              return (
                <tr key={b}>
                  <Td>
                    <Link href={`/admin/karty?davka=${b}`} className="text-green underline">
                      {b === 0 ? "ručně zadané" : `Dávka ${b}`}
                    </Link>
                  </Td>
                  <Td>{s.total}</Td>
                  <Td>{s.free}</Td>
                  <Td>{s.assigned}</Td>
                  <Td>{s.blocked}</Td>
                  <Td>
                    {b > 0 && (
                      <span className="flex flex-wrap gap-3">
                        <a href={`/admin/karty/export?davka=${b}`} className="text-green underline">
                          CSV pro tiskárnu
                        </a>
                        <a href={`/admin/karty/tisk?davka=${b}`} target="_blank" rel="noopener" className="text-green underline">
                          Náhled s QR
                        </a>
                      </span>
                    )}
                  </Td>
                </tr>
              );
            })}
          </Table>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(
          [
            ["", "Vše"],
            ["volna", "Volné"],
            ["prirazena", "Přiřazené"],
            ["blokovana", "Blokované"],
          ] as [string, string][]
        ).map(([id, label]) => {
          const p = new URLSearchParams({ ...(davka ? { davka } : {}), ...(id ? { stav: id } : {}) }).toString();
          return (
            <Link key={id} href={`/admin/karty${p ? `?${p}` : ""}`} className={`label inline-flex min-h-8 items-center rounded-full border px-3 text-[11px] ${(stav ?? "") === id ? "border-green bg-green text-cream" : "border-line bg-paper text-green hover:border-green"}`}>
              {label}
            </Link>
          );
        })}
        <form className="ml-auto flex gap-2">
          {davka && <input type="hidden" name="davka" value={davka} />}
          {stav && <input type="hidden" name="stav" value={stav} />}
          <input name="q" defaultValue={q} placeholder="Kód karty" aria-label="Hledat kartu" className="w-40 uppercase" />
          <Button type="submit" variant="secondary">
            Hledat
          </Button>
        </form>
      </div>

      <div className="mt-3">
        {cards.length === 0 ? (
          <p className="text-muted">{batches.length === 0 ? "Zatím žádné karty. Vytvořte první dávku." : "Nic nenalezeno."}</p>
        ) : (
          <Table head={["Kód", "Dávka", "Stav", "Zákazník", "Přiřazena", ""]}>
            {cards.map((c) => (
              <tr key={c.code}>
                <Td className="font-mono">{c.code}</Td>
                <Td>{c.batch === 0 ? "ručně" : c.batch}</Td>
                <Td>
                  <Badge kind={c.status === "prirazena" ? "novinka" : c.status === "blokovana" ? "sleva" : "neutral"}>{STATUS_LABEL[c.status]}</Badge>
                </Td>
                <Td>
                  {c.customer_id ? (
                    <Link href={`/admin/zakaznici/${c.customer_id}`} className="text-green underline">
                      {c.customers?.name || c.customers?.email || "zákazník"}
                    </Link>
                  ) : (
                    <span className="text-muted">–</span>
                  )}
                </Td>
                <Td className="text-muted">{c.assigned_at ? formatDate(c.assigned_at) : "–"}</Td>
                <Td>
                  <form action={setCardBlocked}>
                    <input type="hidden" name="code" value={c.code} />
                    <input type="hidden" name="blocked" value={c.status === "blokovana" ? "0" : "1"} />
                    <input type="hidden" name="back" value={back} />
                    <button type="submit" className="text-sm text-brick-text hover:underline">
                      {c.status === "blokovana" ? "Odblokovat" : "Zablokovat"}
                    </button>
                  </form>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </>
  );
}
