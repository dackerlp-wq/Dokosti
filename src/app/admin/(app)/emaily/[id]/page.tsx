import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/admin";
import { getAuthSupabase } from "@/lib/supabase/auth";

export default async function EmailPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getAuthSupabase();
  const { data } = await db.from("email_log").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const m = data as { to_email: string; subject: string; html: string; status: string; created_at: string; order_id: string | null };

  return (
    <>
      <p className="label mb-1 text-[11px] text-muted">
        <Link href="/admin/emaily" className="hover:underline">
          E-maily
        </Link>{" "}
        · {formatDate(m.created_at)} · {m.to_email}
        {m.order_id && (
          <>
            {" · "}
            <Link href={`/admin/objednavky/${m.order_id}`} className="hover:underline">
              objednávka
            </Link>
          </>
        )}
      </p>
      <h1 className="text-[24px]">{m.subject}</h1>
      {/* Náhled v iframe, aby styly e-mailu neovlivnily administraci. */}
      <iframe srcDoc={m.html} title="Náhled e-mailu" sandbox="" className="mt-4 h-[720px] w-full rounded-[var(--radius-card)] border border-line bg-white" />
    </>
  );
}
