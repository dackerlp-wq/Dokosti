"use client";

import { useState } from "react";
import { addVersion, createDocument } from "@/app/admin/(app)/dokumenty/actions";
import { Button } from "@/components/ui/button";
import { DOCUMENT_CATEGORY_LABEL, DOCUMENT_LINK_LABEL, type DocumentCategory, type DocumentLink } from "@/lib/admin";
import { documentPath, MAX_DOCUMENT_BYTES } from "@/lib/documents";
import { getBrowserSupabase } from "@/lib/supabase/client";

export type LinkOption = { type: DocumentLink; id: string; label: string };

/**
 * Nahrání dokumentu: soubor jde rovnou do soukromého bucketu (RLS: jen správce), pak server action
 * zapíše metadata. Použití: nový dokument (s názvem, kategorií, vazbou, platností) nebo nová verze.
 */
export function DocumentUpload({ mode, documentId, category, nextVersion = 1, links = [], initialLink, initialCategory }: { mode: "new" | "version"; documentId?: string; category?: DocumentCategory; nextVersion?: number; links?: LinkOption[]; initialLink?: string; initialCategory?: DocumentCategory }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cat, setCat] = useState<DocumentCategory>(initialCategory ?? category ?? "ostatni");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return setError("Vyberte soubor.");
    if (file.size > MAX_DOCUMENT_BYTES) return setError("Soubor je větší než 25 MB.");
    setBusy(true);
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const id = mode === "new" ? crypto.randomUUID() : documentId!;
    const path = documentPath(mode === "new" ? cat : (category ?? "ostatni"), id, nextVersion, file.name);
    const db = getBrowserSupabase();
    const { error: upErr } = await db.storage.from("dokumenty").upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
    if (upErr) {
      setBusy(false);
      return setError(`Nahrání se nepovedlo: ${upErr.message}`);
    }
    fd.set("id", id);
    fd.set("document_id", id);
    fd.set("storage_path", path);
    fd.set("file_name", file.name);
    fd.set("mime", file.type);
    fd.set("size", String(file.size));
    await (mode === "new" ? createDocument(fd) : addVersion(fd));
    setBusy(false);
    form.reset();
    setFile(null);
  }

  return (
    <form onSubmit={onSubmit} className="rounded-card border border-line bg-white p-4">
      {mode === "new" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-label text-green">Název</span>
            <input name="title" required placeholder="např. Nájemní smlouva, prodejna" />
          </label>
          <label className="block">
            <span className="mb-1 block text-label text-green">Kategorie</span>
            <select name="category" value={cat} onChange={(e) => setCat(e.target.value as DocumentCategory)}>
              {(Object.keys(DOCUMENT_CATEGORY_LABEL) as DocumentCategory[]).map((c) => (
                <option key={c} value={c}>
                  {DOCUMENT_CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-label text-green">Vazba</span>
            <select name="link" defaultValue={initialLink ?? ""} onChange={(e) => { const [t, i] = e.target.value.split(":"); const f = e.currentTarget.form!; (f.elements.namedItem("linked_type") as HTMLInputElement).value = t ?? ""; (f.elements.namedItem("linked_id") as HTMLInputElement).value = i ?? ""; }}>
              <option value="">bez vazby</option>
              <option value="firma:">Firma / provozovna</option>
              {links.map((l) => (
                <option key={`${l.type}:${l.id}`} value={`${l.type}:${l.id}`}>
                  {DOCUMENT_LINK_LABEL[l.type]}: {l.label}
                </option>
              ))}
            </select>
            <input type="hidden" name="linked_type" defaultValue={initialLink?.split(":")[0] ?? ""} />
            <input type="hidden" name="linked_id" defaultValue={initialLink?.split(":")[1] ?? ""} />
          </label>
          <label className="block">
            <span className="mb-1 block text-label text-green">Platí od</span>
            <input name="valid_from" type="date" />
          </label>
          <label className="block">
            <span className="mb-1 block text-label text-green">Platí do</span>
            <input name="valid_to" type="date" />
          </label>
          <label className="block">
            <span className="mb-1 block text-label text-green">Připomenout (dní předem)</span>
            <input name="remind_days" type="number" min={0} defaultValue={30} />
          </label>
          <label className="block sm:col-span-2 lg:col-span-3">
            <span className="mb-1 block text-label text-green">Poznámka</span>
            <input name="note" placeholder="např. výpovědní lhůta 3 měsíce" />
          </label>
        </div>
      ) : (
        <label className="block">
          <span className="mb-1 block text-label text-green">Co se změnilo</span>
          <input name="note" placeholder="např. dodatek č. 2, podepsaný sken" />
        </label>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.txt" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
        <Button type="submit" disabled={busy || !file} className="min-h-9">
          {busy ? "Nahrávám…" : mode === "new" ? "Uložit dokument" : `Nahrát verzi v${nextVersion}`}
        </Button>
        <span className="text-small text-muted">PDF, Word, Excel nebo fotka, do 25 MB. Soukromé úložiště, přístup jen správce a dotyčný zaměstnanec.</span>
      </div>
      {error && <p className="mt-2 text-sm text-brick-text">{error}</p>}
    </form>
  );
}
