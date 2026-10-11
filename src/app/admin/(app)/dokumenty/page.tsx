import type { Metadata } from "next";
import Link from "next/link";
import { DocumentUpload, type LinkOption } from "@/components/admin/document-upload";
import { PageHeader } from "@/components/admin/page-header";
import { Pills, Stat } from "@/components/admin/stat";
import { StockFilters } from "@/components/admin/stock-filters";
import { Table, Td } from "@/components/admin/table";
import { buttonClass } from "@/components/ui/button";
import { DOCUMENT_CATEGORY_LABEL, DOCUMENT_LINK_LABEL, formatDay, type DocumentCategory, type DocumentRow } from "@/lib/admin";
import { getAdmin, getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Dokumenty" };

const isCategory = (v: string): v is DocumentCategory => v in DOCUMENT_CATEGORY_LABEL;

/**
 * Smlouvy a dokumenty firmy: nájem, revize, HACCP, smlouvy se zaměstnanci. Soubory jsou v soukromém
 * úložišti s verzemi a podpisy. Správce vidí vše, zaměstnanec jen své (RLS).
 */
export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ novy?: string; vazba?: string; kategorie?: string; pohled?: string; q?: string }> }) {
  await requireAdmin("brigada");
  const admin = (await getAdmin())!;
  const { novy, vazba, kategorie, pohled, q } = await searchParams;
  const db = await getAuthSupabase();
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(new Date().getTime() + 60 * 86_400_000).toISOString().slice(0, 10);

  let query = db.from("documents").select("*").order("created_at", { ascending: false });
  if (pohled === "archiv") query = query.not("archived_at", "is", null);
  else query = query.is("archived_at", null);
  if (pohled === "konci") query = query.not("valid_to", "is", null).lte("valid_to", soon);
  if (kategorie && isCategory(kategorie)) query = query.eq("category", kategorie);
  if (q) query = query.ilike("title", `%${q}%`);
  const [{ data }, { data: employees }, { data: suppliers }, { data: devices }, { count: expiring }, { count: archived }] = await Promise.all([
    query.limit(500),
    admin.isManager ? db.from("employees").select("id, name").is("ended_on", null).order("name") : Promise.resolve({ data: [] }),
    admin.isManager ? db.from("suppliers").select("id, name").eq("active", true).order("name") : Promise.resolve({ data: [] }),
    admin.isManager ? db.from("devices").select("id, name").eq("active", true).order("sort_order") : Promise.resolve({ data: [] }),
    db.from("documents").select("id", { count: "exact", head: true }).is("archived_at", null).not("valid_to", "is", null).lte("valid_to", soon),
    db.from("documents").select("id", { count: "exact", head: true }).not("archived_at", "is", null),
  ]);
  const rows = (data ?? []) as DocumentRow[];
  const links: LinkOption[] = [
    ...((employees ?? []) as { id: string; name: string }[]).map((e) => ({ type: "employee" as const, id: e.id, label: e.name })),
    ...((suppliers ?? []) as { id: string; name: string }[]).map((s) => ({ type: "supplier" as const, id: s.id, label: s.name })),
    ...((devices ?? []) as { id: string; name: string }[]).map((d) => ({ type: "device" as const, id: d.id, label: d.name })),
  ];
  const linkLabel = new Map(links.map((l) => [`${l.type}:${l.id}`, l.label]));
  const counts = new Map<string, number>();
  for (const d of rows) counts.set(d.category, (counts.get(d.category) ?? 0) + 1);
  const initialCategory: DocumentCategory | undefined = vazba?.startsWith("employee:") ? "zamestnanci" : vazba?.startsWith("supplier:") ? "faktury" : vazba?.startsWith("device:") ? "revize" : undefined;
  const base = (p: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries({ kategorie, pohled, q, ...p })) if (v) sp.set(k, v);
    const s = sp.toString();
    return `/admin/dokumenty${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Smlouvy a dokumenty"
        subtitle={admin.isManager ? "Nájem, revize, HACCP, úřady, smlouvy se zaměstnanci a dodavateli. Každý dokument má verze a podpisy, konec platnosti hlídá úkol." : "Vaše smlouvy a dokumenty k podpisu. Ostatní dokumenty firmy vidí správce."}
        actions={admin.isManager && !novy ? <Link href={base({ novy: "1" })} className={buttonClass("primary")}>Nahrát dokument</Link> : undefined}
      />
      {admin.isManager && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Aktivních" value={pohled || kategorie || q ? "·" : rows.length} small />
          <Stat label="Končí do 60 dní" value={expiring ?? 0} warn={(expiring ?? 0) > 0} href={base({ pohled: "konci" })} small />
          <Stat label="V archivu" value={archived ?? 0} href={base({ pohled: "archiv" })} small />
          <Stat label="Zaměstnanci bez smlouvy" value={<Link href="/admin/zamestnanci" className="hover:underline">zkontrolovat</Link>} small />
        </div>
      )}
      {admin.isManager && novy && (
        <section className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[20px]">Nový dokument</h2>
            <Link href={base({ novy: undefined })} className="text-sm text-muted hover:underline">
              zavřít
            </Link>
          </div>
          <DocumentUpload mode="new" links={links} initialLink={vazba} initialCategory={initialCategory} />
        </section>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Pills
          items={[
            { href: base({ pohled: undefined }), label: "Aktivní", on: !pohled },
            { href: base({ pohled: "konci" }), label: `Končí platnost · ${expiring ?? 0}`, on: pohled === "konci" },
            { href: base({ pohled: "archiv" }), label: `Archiv · ${archived ?? 0}`, on: pohled === "archiv" },
          ]}
        />
        <StockFilters
          action="/admin/dokumenty"
          hidden={{ pohled }}
          search={{ name: "q", value: q, placeholder: "Hledat v názvu" }}
          selects={[{ name: "kategorie", value: kategorie, label: "Kategorie", options: [{ value: "", label: "Všechny kategorie" }, ...(Object.keys(DOCUMENT_CATEGORY_LABEL) as DocumentCategory[]).map((c) => ({ value: c, label: `${DOCUMENT_CATEGORY_LABEL[c]}${counts.get(c) ? ` · ${counts.get(c)}` : ""}` }))] }]}
        />
      </div>
      <div className="mt-4">
        {rows.length === 0 ? (
          <p className="text-muted">{pohled === "archiv" ? "Archiv je prázdný." : pohled === "konci" ? "Nic nekončí. Dobrá zpráva." : q || kategorie ? "Nic nenalezeno." : admin.isManager ? "Zatím žádný dokument. Začněte nájemní smlouvou, revizemi a smlouvami se zaměstnanci." : "Zatím pro vás nejsou žádné dokumenty."}</p>
        ) : (
          <Table head={["Dokument", "Kategorie", "Vazba", "Platnost", "Nahráno"]}>
            {rows.map((d) => {
              const expired = !!d.valid_to && d.valid_to < today;
              const ending = !expired && !!d.valid_to && d.valid_to <= soon;
              return (
                <tr key={d.id}>
                  <Td>
                    <Link href={`/admin/dokumenty/${d.id}`} className="font-semibold text-brick-text hover:underline">
                      {d.title}
                    </Link>
                    {d.note && <div className="max-w-md truncate text-small text-muted">{d.note}</div>}
                  </Td>
                  <Td>{DOCUMENT_CATEGORY_LABEL[d.category]}</Td>
                  <Td className="text-muted">{d.linked_type ? `${DOCUMENT_LINK_LABEL[d.linked_type]}${d.linked_id ? `: ${linkLabel.get(`${d.linked_type}:${d.linked_id}`) ?? ""}` : ""}` : "—"}</Td>
                  <Td className={`whitespace-nowrap ${expired || ending ? "font-semibold text-brick-text" : "text-muted"}`}>
                    {d.valid_to ? `${expired ? "skončila " : "do "}${formatDay(d.valid_to)}` : d.valid_from ? `od ${formatDay(d.valid_from)}` : "bez omezení"}
                  </Td>
                  <Td className="whitespace-nowrap text-muted">{formatDay(d.created_at.slice(0, 10))}</Td>
                </tr>
              );
            })}
          </Table>
        )}
      </div>
    </>
  );
}
