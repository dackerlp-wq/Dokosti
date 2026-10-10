"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { DOCUMENT_CATEGORY_LABEL, DOCUMENT_LINK_LABEL, SIGNATURE_METHOD_LABEL, type DocumentCategory, type DocumentLink, type SignatureMethod } from "@/lib/admin";
import { flashError, flashOk } from "@/lib/flash";
import { getAuthSupabase, requireAdmin, requireManager } from "@/lib/supabase/auth";
import { closeAutoTask } from "@/lib/tasks";

const isCategory = (v: string): v is DocumentCategory => v in DOCUMENT_CATEGORY_LABEL;
const isLink = (v: string): v is DocumentLink => v in DOCUMENT_LINK_LABEL;

function metaFrom(fd: FormData) {
  const category = String(fd.get("category") ?? "ostatni");
  const linkType = String(fd.get("linked_type") ?? "").trim();
  return {
    title: String(fd.get("title") ?? "").trim().slice(0, 200),
    category: isCategory(category) ? category : "ostatni",
    linked_type: isLink(linkType) ? linkType : null,
    linked_id: isLink(linkType) ? String(fd.get("linked_id") ?? "").trim() || null : null,
    valid_from: String(fd.get("valid_from") ?? "") || null,
    valid_to: String(fd.get("valid_to") ?? "") || null,
    remind_days: Math.min(365, Math.max(0, Math.round(Number(fd.get("remind_days")) || 30))),
    note: String(fd.get("note") ?? "").trim().slice(0, 2000),
  };
}

/** Nový dokument s první verzí. Soubor už je nahraný v bucketu (klient), tady se zapíší metadata. */
export async function createDocument(fd: FormData) {
  const admin = await requireManager();
  const id = String(fd.get("id") ?? "");
  const meta = metaFrom(fd);
  const path = String(fd.get("storage_path") ?? "");
  if (!id || !meta.title || !path) return flashError("Chybí název nebo soubor.");
  const db = await getAuthSupabase();
  const { error } = await db.from("documents").insert({ id, ...meta, created_by: admin.id });
  if (error) return flashError(`Dokument se nepodařilo uložit: ${error.message}`);
  const { error: e2 } = await db.from("document_versions").insert({ document_id: id, version: 1, storage_path: path, file_name: String(fd.get("file_name") ?? ""), mime: String(fd.get("mime") ?? ""), size_bytes: Number(fd.get("size") ?? 0), created_by: admin.id });
  if (e2) return flashError(`Soubor se nepodařilo zapsat: ${e2.message}`);
  await logActivity(db, admin, { kind: "dokument.nahran", subject: "document", subjectId: id, text: `Nahrán dokument ${meta.title} (${DOCUMENT_CATEGORY_LABEL[meta.category]})` });
  revalidatePath("/admin/dokumenty");
  if (meta.linked_type === "employee" && meta.linked_id) revalidatePath(`/admin/zamestnanci/${meta.linked_id}`);
  await flashOk(`Dokument ${meta.title} uložen.`);
  redirect(`/admin/dokumenty/${id}`);
}

/** Nová verze existujícího dokumentu (soubor nahraný klientem). */
export async function addVersion(fd: FormData) {
  const admin = await requireManager();
  const id = String(fd.get("document_id") ?? "");
  const path = String(fd.get("storage_path") ?? "");
  const db = await getAuthSupabase();
  const { data: last } = await db.from("document_versions").select("version").eq("document_id", id).order("version", { ascending: false }).limit(1).maybeSingle();
  const version = (last?.version ?? 0) + 1;
  const { error } = await db.from("document_versions").insert({ document_id: id, version, storage_path: path, file_name: String(fd.get("file_name") ?? ""), mime: String(fd.get("mime") ?? ""), size_bytes: Number(fd.get("size") ?? 0), note: String(fd.get("note") ?? "").trim().slice(0, 300), created_by: admin.id });
  if (error) return flashError(error.message);
  const { data: d } = await db.from("documents").select("title").eq("id", id).maybeSingle();
  await logActivity(db, admin, { kind: "dokument.verze", subject: "document", subjectId: id, text: `${d?.title ?? "Dokument"}: nová verze v${version}${fd.get("note") ? ` (${String(fd.get("note")).trim()})` : ""}` });
  revalidatePath(`/admin/dokumenty/${id}`);
  await flashOk(`Verze v${version} nahrána.`);
}

/** Úprava metadat (platnost, kategorie, vazba, poznámka). */
export async function updateDocument(fd: FormData) {
  const admin = await requireManager();
  const id = String(fd.get("id") ?? "");
  const meta = metaFrom(fd);
  if (!meta.title) return flashError("Doplňte název.");
  const db = await getAuthSupabase();
  const { error } = await db.from("documents").update(meta).eq("id", id);
  if (error) return flashError(error.message);
  // Změna platnosti: starý úkol o konci platnosti zavřít, cron založí nový podle nového data.
  await closeAutoTask(db, `doc-expiry:${id}`);
  await logActivity(db, admin, { kind: "dokument.upraven", subject: "document", subjectId: id, text: `${meta.title}: údaje upraveny${meta.valid_to ? `, platí do ${meta.valid_to}` : ""}` });
  revalidatePath(`/admin/dokumenty/${id}`);
  revalidatePath("/admin/dokumenty");
  await flashOk("Uloženo.");
}

export async function archiveDocument(fd: FormData) {
  const admin = await requireManager();
  const id = String(fd.get("id") ?? "");
  const restore = fd.get("restore") === "1";
  const db = await getAuthSupabase();
  const { data: d } = await db.from("documents").select("title").eq("id", id).maybeSingle();
  const { error } = await db.from("documents").update({ archived_at: restore ? null : new Date().toISOString() }).eq("id", id);
  if (error) return flashError(error.message);
  if (!restore) await closeAutoTask(db, `doc-expiry:${id}`);
  await logActivity(db, admin, { kind: restore ? "dokument.obnoven" : "dokument.archivovan", subject: "document", subjectId: id, text: `${d?.title ?? "Dokument"} ${restore ? "obnoven z archivu" : "archivován"}` });
  revalidatePath("/admin/dokumenty");
  revalidatePath(`/admin/dokumenty/${id}`);
  await flashOk(restore ? "Dokument obnoven." : "Dokument archivován. Soubory zůstávají, nic se nemaže.");
}

/** Podpis k verzi: z tabletu (obrázek podpisu už je v bucketu), nahraný sken, nebo podepsáno mimo systém. */
export async function addSignature(fd: FormData) {
  const admin = await requireAdmin("brigada");
  const versionId = String(fd.get("version_id") ?? "");
  const method = String(fd.get("method") ?? "tablet") as SignatureMethod;
  const signer = String(fd.get("signer_name") ?? "").trim().slice(0, 120) || admin.name;
  const path = String(fd.get("signature_path") ?? "").trim() || null;
  if (!versionId || !(method in SIGNATURE_METHOD_LABEL)) return flashError("Neplatný podpis.");
  if (method === "tablet" && !path) return flashError("Podpis se nenahrál, zkuste to znovu.");
  const db = await getAuthSupabase();
  const { data: v } = await db.from("document_versions").select("document_id, version, documents(title)").eq("id", versionId).maybeSingle();
  if (!v) return flashError("Verze dokumentu nenalezena.");
  const { error } = await db.from("document_signatures").insert({ version_id: versionId, signer_name: signer, signer_user: admin.id, method, signature_path: path, user_agent: String(fd.get("ua") ?? "").slice(0, 300) });
  if (error) return flashError(`Podpis se nepodařilo uložit: ${error.message}`);
  const title = (v as unknown as { documents: { title: string } | null }).documents?.title ?? "Dokument";
  await logActivity(db, admin, { kind: "dokument.podpis", subject: "document", subjectId: v.document_id, text: `${title} v${v.version}: ${SIGNATURE_METHOD_LABEL[method].toLowerCase()} · ${signer}` });
  revalidatePath(`/admin/dokumenty/${v.document_id}`);
  await flashOk(`Podpis ${signer} uložen k verzi v${v.version}.`);
}
