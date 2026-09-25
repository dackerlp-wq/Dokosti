import type { Metadata } from "next";
import Link from "next/link";
import { Table, Td } from "@/components/admin/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/admin";
import { getAuthSupabase } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "E-maily" };

type Row = { id: string; to_email: string; subject: string; kind: string; status: "ceka" | "odeslano" | "chyba"; error: string | null; created_at: string; order_id: string | null };

const STATUS: Record<Row["status"], { label: string; kind: "novinka" | "skladem" | "sleva" }> = {
  ceka: { label: "Čeká", kind: "novinka" },
  odeslano: { label: "Odesláno", kind: "skladem" },
  chyba: { label: "Chyba", kind: "sleva" },
};

export default async function EmailsPage() {
  const db = await getAuthSupabase();
  const { data } = await db.from("email_log").select("id, to_email, subject, kind, status, error, created_at, order_id").order("created_at", { ascending: false }).limit(200);
  const rows = (data ?? []) as Row[];
  const configured = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

  return (
    <>
      <h1>E-maily</h1>
      {configured ? (
        <p className="mt-1 text-sm text-muted">Odesílá se přes Resend z adresy {process.env.EMAIL_FROM}.</p>
      ) : (
        <p className="mt-2 rounded-[var(--radius-card)] border border-brick bg-paper p-3 text-sm">
          Odesílání zatím není zapnuté (chybí doména). E-maily se ukládají sem se stavem „Čeká“, můžete si je prohlédnout.
          Po ověření domény v Resendu se doplní klíč a začnou odcházet.
        </p>
      )}
      <div className="mt-4">
        {rows.length === 0 ? (
          <p className="text-muted">Zatím žádné e-maily.</p>
        ) : (
          <Table head={["Kdy", "Komu", "Předmět", "Typ", "Stav"]}>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td>{formatDate(r.created_at)}</Td>
                <Td>{r.to_email}</Td>
                <Td>
                  <Link href={`/admin/emaily/${r.id}`} className="font-semibold text-green hover:underline">
                    {r.subject}
                  </Link>
                </Td>
                <Td className="text-muted">{r.kind}</Td>
                <Td>
                  <Badge kind={STATUS[r.status].kind}>{STATUS[r.status].label}</Badge>
                  {r.error && <span className="block text-xs text-brick-text">{r.error}</span>}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </>
  );
}
