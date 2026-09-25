import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/admin";
import { getAuthSupabase } from "@/lib/supabase/auth";
import { setInquiryAnswered } from "./actions";

export const metadata: Metadata = { title: "Poradna" };

type Row = { id: string; name: string; email: string; animal: string; age_weight: string; question: string; answered: boolean; created_at: string };

export default async function InquiriesPage() {
  const db = await getAuthSupabase();
  const { data } = await db.from("inquiries").select("*").order("answered").order("created_at", { ascending: false }).limit(200);
  const rows = (data ?? []) as Row[];

  return (
    <>
      <h1>Poradna</h1>
      <p className="mt-1 text-sm text-muted">Dotazy z formuláře na stránce Jak začít. Odpovídejte e-mailem, tady si je jen odškrtněte.</p>
      <div className="mt-4 space-y-3">
        {rows.length === 0 && <p className="text-muted">Zatím žádné dotazy.</p>}
        {rows.map((r) => (
          <article key={r.id} className={`rounded-[var(--radius-card)] border bg-paper p-4 ${r.answered ? "border-line opacity-70" : "border-brick"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm">
                <strong>{r.name}</strong> ·{" "}
                <a href={`mailto:${r.email}?subject=${encodeURIComponent("Odpověď z poradny DoKosti")}`} className="text-green hover:underline">
                  {r.email}
                </a>
                <span className="text-muted">
                  {" "}
                  · {r.animal}
                  {r.age_weight && ` · ${r.age_weight}`} · {formatDate(r.created_at)}
                </span>
              </p>
              <form action={setInquiryAnswered} className="flex items-center gap-2">
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="answered" value={r.answered ? "0" : "1"} />
                {r.answered ? <Badge kind="skladem">Zodpovězeno</Badge> : <Badge kind="novinka">Čeká</Badge>}
                <button type="submit" className="label text-[11px] text-green hover:underline">
                  {r.answered ? "Vrátit" : "Označit jako zodpovězené"}
                </button>
              </form>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm">{r.question}</p>
          </article>
        ))}
      </div>
    </>
  );
}
