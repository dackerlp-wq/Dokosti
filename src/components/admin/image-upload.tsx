"use client";

import Image from "next/image";
import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

/** Nahraje fotku do bucketu product-images a uloží veřejnou URL do skrytého inputu. */
export function ImageUpload({ name, initialUrl, slug }: { name: string; initialUrl: string | null; slug: string }) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${slug}-${Date.now()}.${ext}`;
    const db = getBrowserSupabase();
    const { error } = await db.storage.from("product-images").upload(path, file, { contentType: file.type });
    if (error) {
      setError("Nahrání se nepovedlo: " + error.message);
    } else {
      setUrl(db.storage.from("product-images").getPublicUrl(path).data.publicUrl);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={url} />
      <div className="relative aspect-square w-full overflow-hidden rounded-[var(--radius-card)] bg-cream">
        {url ? (
          <Image src={url} alt="" fill sizes="300px" className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">Bez fotky</div>
        )}
      </div>
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onChange} disabled={busy} className="text-sm" />
      <p className="text-xs text-muted">Čtvercová, ideálně 1600 × 1600 px, do 5 MB. {busy && "Nahrávám…"}</p>
      {error && <p className="text-sm text-brick-text">{error}</p>}
      {url && (
        <button type="button" onClick={() => setUrl("")} className="label text-[11px] text-brick-text hover:underline">
          Odebrat fotku
        </button>
      )}
    </div>
  );
}
