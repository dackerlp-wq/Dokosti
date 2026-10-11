import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addSignature, archiveDocument, updateDocument } from "@/app/admin/(app)/dokumenty/actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { DocumentUpload, type LinkOption } from "@/components/admin/document-upload";
import { PageHeader } from "@/components/admin/page-header";
import { SignaturePad } from "@/components/admin/signature-pad";
import { Table, Td } from "@/components/admin/table";
import { Button, buttonClass } from "@/components/ui/button";
import { DOCUMENT_CATEGORY_LABEL, DOCUMENT_LINK_LABEL, formatDate, formatDay, SIGNATURE_METHOD_LABEL, type DocumentCategory, type DocumentLink, type DocumentRow, type DocumentVersionRow, type SignatureRow } from "@/lib/admin";
import { getAdmin, getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Dokument" };

function fileSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(bytes / 1024))} kB`;
}

/** Detail dokumentu: údaje, verze (ke stažení), podpisy k aktuální verzi, archivace. */
export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("brigada");
  const admin = (await getAdmin())!;
  const { id } = await params;
  const db = await getAuthSupabase();
  const { data } = await db.from("documents").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const d = data as DocumentRow;
  const [{ data: vers }, { data: employees }, { data: suppliers }, { data: devices }] = await Promise.all([
    db.from("document_versions").select("*").eq("document_id", id).order("version", { ascending: false }),
    admin.isManager ? db.from("employees").select("id, name").order("name") : Promise.resolve({ data: [] }),
    admin.isManager ? db.from("suppliers").select("id, name").order("name") : Promise.resolve({ data: [] }),
    admin.isManager ? db.from("devices").select("id, name").order("sort_order") : Promise.resolve({ data: [] }),
  ]);
  const versions = (vers ?? []) as DocumentVersionRow[];
  const { data: sigs } = versions.length ? await db.from("document_signatures").select("*").in("version_id", versions.map((v) => v.id)).order("signed_at") : { data: [] };
  const signatures = (sigs ?? []) as SignatureRow[];
  const latest = versions[0];
  const bySig = new Map<string, SignatureRow[]>();
  for (const s of signatures) bySig.set(s.version_id, [...(bySig.get(s.version_id) ?? []), s]);
  const links: LinkOption[] = [
    ...((employees ?? []) as { id: string; name: string }[]).map((e) => ({ type: "employee" as const, id: e.id, label: e.name })),
    ...((suppliers ?? []) as { id: string; name: string }[]).map((s) => ({ type: "supplier" as const, id: s.id, label: s.name })),
    ...((devices ?? []) as { id: string; name: string }[]).map((x) => ({ type: "device" as const, id: x.id, label: x.name })),
  ];
  const linkValue = d.linked_type ? `${d.linked_type}:${d.linked_id ?? ""}` : "";
  const linkText = d.linked_type ? `${DOCUMENT_LINK_LABEL[d.linked_type]}${d.linked_id ? `: ${links.find((l) => l.type === d.linked_type && l.id === d.linked_id)?.label ?? ""}` : ""}` : null;
  const linkHref = d.linked_type === "employee" && d.linked_id ? `/admin/zamestnanci/${d.linked_id}` : d.linked_type === "supplier" && d.linked_id ? `/admin/nakup?dodavatel=${d.linked_id}` : d.linked_type === "device" ? "/admin/provoz/zarizeni" : null;
  const today = new Date().toISOString().slice(0, 10);
  const expired = !!d.valid_to && d.valid_to < today;

  return (
    <>
      <PageHeader
        crumbs={[{ href: "/admin/dokumenty", label: "Smlouvy a dokumenty" }, { label: DOCUMENT_CATEGORY_LABEL[d.category] }]}
        title={d.title}
        badges={
          <>
            {d.archived_at && <span className="text-small font-semibold rounded-control border border-line bg-white px-2 py-0.5 text-muted">archiv</span>}
            {expired && <span className="text-small font-semibold rounded-control bg-brick px-2 py-0.5 text-cream">platnost skončila</span>}
          </>
        }
        subtitle={
          <>
            {d.valid_from || d.valid_to ? `Platí ${d.valid_from ? `od ${formatDay(d.valid_from)}` : ""}${d.valid_to ? ` do ${formatDay(d.valid_to)}` : ""}` : "Bez omezení platnosti"}
            {linkText && (
              <>
                {" · "}
                {linkHref ? (
                  <Link href={linkHref} className="text-brick-text hover:underline">
                    {linkText}
                  </Link>
                ) : (
                  linkText
                )}
              </>
            )}
            {" · "}
            {versions.length} {versions.length === 1 ? "verze" : versions.length < 5 ? "verze" : "verzí"}, {signatures.length} {signatures.length === 1 ? "podpis" : signatures.length < 5 ? "podpisy" : "podpisů"}
          </>
        }
        actions={
          latest ? (
            <>
              <a href={`/admin/dokumenty-soubor/${latest.id}`} target="_blank" rel="noopener" className={buttonClass("secondary")}>
                Otevřít
              </a>
              <a href={`/admin/dokumenty-soubor/${latest.id}?stahnout=1`} className={buttonClass("primary")}>
                Stáhnout v{latest.version}
              </a>
            </>
          ) : undefined
        }
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-[20px]">Verze</h2>
            {versions.length === 0 ? (
              <p className="text-muted">Dokument zatím nemá žádný soubor.</p>
            ) : (
              <Table head={["Verze", "Soubor", "Co se změnilo", "Podpisy", "Nahráno", ""]}>
                {versions.map((v) => (
                  <tr key={v.id} className={v.id === latest?.id ? "font-semibold" : ""}>
                    <Td>v{v.version}{v.id === latest?.id && <span className="text-eyebrow uppercase ml-1 text-brick-text">aktuální</span>}</Td>
                    <Td>
                      <a href={`/admin/dokumenty-soubor/${v.id}`} target="_blank" rel="noopener" className="text-brick-text hover:underline">
                        {v.file_name}
                      </a>
                      <div className="text-small font-normal text-muted">{fileSize(v.size_bytes)}</div>
                    </Td>
                    <Td className="font-normal text-muted">{v.note || "—"}</Td>
                    <Td className="font-normal">{(bySig.get(v.id) ?? []).length === 0 ? <span className="text-muted">bez podpisu</span> : (bySig.get(v.id) ?? []).map((s) => s.signer_name).join(", ")}</Td>
                    <Td className="whitespace-nowrap font-normal text-muted">{formatDate(v.created_at)}</Td>
                    <Td className="text-right">
                      <a href={`/admin/dokumenty-soubor/${v.id}?stahnout=1`} className="text-sm font-normal text-brick-text hover:underline">
                        stáhnout
                      </a>
                    </Td>
                  </tr>
                ))}
              </Table>
            )}
            {admin.isManager && !d.archived_at && (
              <div className="mt-3">
                <p className="mb-1 text-label text-green">Nová verze (dodatek, podepsaný sken, oprava)</p>
                <DocumentUpload mode="version" documentId={d.id} category={d.category} nextVersion={(latest?.version ?? 0) + 1} />
              </div>
            )}
          </section>

          {latest && !d.archived_at && (
            <section>
              <h2 className="mb-2 text-[20px]">Podpisy k verzi v{latest.version}</h2>
              {(bySig.get(latest.id) ?? []).length > 0 && (
                <ul className="mb-3 divide-y divide-line rounded-card border border-line bg-white">
                  {(bySig.get(latest.id) ?? []).map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
                      <span>
                        <span className="font-semibold">{s.signer_name}</span> <span className="text-muted">· {SIGNATURE_METHOD_LABEL[s.method].toLowerCase()} · {formatDate(s.signed_at)}</span>
                      </span>
                      {s.signature_path && (
                        <a href={`/admin/dokumenty-soubor/${latest.id}?podpis=${s.id}`} target="_blank" rel="noopener" className="text-brick-text hover:underline">
                          zobrazit podpis
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <div className="rounded-card border border-line bg-white p-4">
                <p className="mb-2 text-sm text-muted">Podpis na tabletu nebo myší. Podepisuje se vždy aktuální verze; po nahrání nové verze je potřeba podepsat znovu.</p>
                <SignaturePad versionId={latest.id} defaultName={admin.name} />
                {admin.isManager && (
                  <div className="mt-4 grid gap-3 border-t border-line pt-3 sm:grid-cols-2">
                    <form action={addSignature} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="version_id" value={latest.id} />
                      <input type="hidden" name="method" value="externi" />
                      <label className="flex-1">
                        <span className="mb-1 block text-label text-green">Podepsáno mimo systém (papír)</span>
                        <input name="signer_name" placeholder="Kdo podepsal" required className="min-h-9 py-1" />
                      </label>
                      <Button type="submit" variant="secondary" className="min-h-9">
                        Zapsat
                      </Button>
                    </form>
                    <p className="self-end text-small text-muted">Podepsaný sken nahrajte jako novou verzi s poznámkou „podepsaný sken“, podpis se zapíše k ní.</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          {admin.isManager ? (
            <form action={updateDocument} className="rounded-card border border-line bg-white p-4">
              <input type="hidden" name="id" value={d.id} />
              <h2 className="mb-3 text-[18px]">Údaje</h2>
              <div className="grid gap-3">
                <label className="block">
                  <span className="mb-1 block text-label text-green">Název</span>
                  <input name="title" defaultValue={d.title} required />
                </label>
                <label className="block">
                  <span className="mb-1 block text-label text-green">Kategorie</span>
                  <select name="category" defaultValue={d.category}>
                    {(Object.keys(DOCUMENT_CATEGORY_LABEL) as DocumentCategory[]).map((c) => (
                      <option key={c} value={c}>
                        {DOCUMENT_CATEGORY_LABEL[c]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-label text-green">Vazba</span>
                  <select name="link_select" defaultValue={linkValue} disabled>
                    <option value="">bez vazby</option>
                    <option value="firma:">Firma / provozovna</option>
                    {links.map((l) => (
                      <option key={`${l.type}:${l.id}`} value={`${l.type}:${l.id}`}>
                        {DOCUMENT_LINK_LABEL[l.type as DocumentLink]}: {l.label}
                      </option>
                    ))}
                  </select>
                  <input type="hidden" name="linked_type" value={d.linked_type ?? ""} />
                  <input type="hidden" name="linked_id" value={d.linked_id ?? ""} />
                  <span className="mt-1 block text-small text-muted">Vazba se nastavuje při nahrání; jinou vazbu uděláte novým dokumentem.</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-label text-green">Platí od</span>
                    <input name="valid_from" type="date" defaultValue={d.valid_from ?? ""} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-label text-green">Platí do</span>
                    <input name="valid_to" type="date" defaultValue={d.valid_to ?? ""} />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1 block text-label text-green">Připomenout (dní předem)</span>
                  <input name="remind_days" type="number" min={0} max={365} defaultValue={d.remind_days} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-label text-green">Poznámka</span>
                  <textarea name="note" rows={3} defaultValue={d.note} />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <Button type="submit" className="min-h-9">
                  Uložit
                </Button>
                <ConfirmButton
                  action={archiveDocument}
                  fields={d.archived_at ? { id: d.id, restore: "1" } : { id: d.id }}
                  title={d.archived_at ? "Obnovit dokument" : "Archivovat dokument"}
                  text={d.archived_at ? "Dokument se vrátí mezi aktivní a bude se znovu hlídat konec platnosti." : "Dokument zmizí ze seznamu aktivních, soubory a podpisy zůstanou. Úkol o konci platnosti se zavře."}
                  confirmLabel={d.archived_at ? "Obnovit" : "Archivovat"}
                  variant="ghost"
                  className="min-h-9 text-[11px]"
                >
                  {d.archived_at ? "Obnovit z archivu" : "Archivovat"}
                </ConfirmButton>
              </div>
            </form>
          ) : (
            <div className="rounded-card border border-line bg-white p-4 text-sm">
              <h2 className="mb-2 text-[18px]">Údaje</h2>
              <p>{DOCUMENT_CATEGORY_LABEL[d.category]}</p>
              {d.note && <p className="mt-1 text-muted">{d.note}</p>}
            </div>
          )}
          <div className="rounded-card border border-line bg-white p-4 text-small text-muted">
            <p>Soubory jsou v soukromém úložišti, odkazy ke stažení platí dvě minuty. Verze se nikdy nepřepisují, každá změna je nová verze. Podpis se váže k verzi, u které vznikl.</p>
            <p className="mt-2">
              Nahráno {formatDay(d.created_at.slice(0, 10))}. Historie v{" "}
              <Link href={`/admin/denik?q=${encodeURIComponent(d.title)}`} className="text-brick-text underline">
                deníku
              </Link>
              .
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
