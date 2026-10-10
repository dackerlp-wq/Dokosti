"use client";

import { useRef, useState } from "react";
import { addSignature } from "@/app/admin/(app)/dokumenty/actions";
import { Button } from "@/components/ui/button";
import { getBrowserSupabase } from "@/lib/supabase/client";

/** Podpis prstem na tabletu nebo myší. PNG se uloží do bucketu (složka podpisy), záznam k verzi dokumentu. */
export function SignaturePad({ versionId, defaultName }: { versionId: string; defaultName: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [dirty, setDirty] = useState(false);
  const [name, setName] = useState(defaultName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvas.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };
  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    const ctx = canvas.current!.getContext("2d")!;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1f3a2d";
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    canvas.current!.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvas.current!.getContext("2d")!;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setDirty(true);
  };
  const end = () => {
    drawing.current = false;
  };
  const clear = () => {
    const c = canvas.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setDirty(false);
  };

  async function sign() {
    if (!dirty || !name.trim()) return setError("Podepište se a vyplňte jméno.");
    setBusy(true);
    setError(null);
    const blob = await new Promise<Blob | null>((res) => canvas.current!.toBlob(res, "image/png"));
    if (!blob) {
      setBusy(false);
      return setError("Podpis se nepodařilo uložit.");
    }
    const path = `podpisy/${versionId}-${Date.now()}.png`;
    const { error: upErr } = await getBrowserSupabase().storage.from("dokumenty").upload(path, blob, { contentType: "image/png" });
    if (upErr) {
      setBusy(false);
      return setError(`Nahrání podpisu se nepovedlo: ${upErr.message}`);
    }
    const fd = new FormData();
    fd.set("version_id", versionId);
    fd.set("method", "tablet");
    fd.set("signer_name", name.trim());
    fd.set("signature_path", path);
    fd.set("ua", navigator.userAgent);
    await addSignature(fd);
    clear();
    setBusy(false);
  }

  return (
    <div>
      <canvas ref={canvas} width={600} height={200} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end} className="w-full touch-none rounded-[var(--radius-control)] border border-dashed border-line bg-white" aria-label="Podpisové pole" />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jméno podepisujícího" aria-label="Jméno podepisujícího" className="min-h-9 w-56 py-1" />
        <Button type="button" onClick={sign} disabled={busy || !dirty} className="min-h-9">
          {busy ? "Ukládám…" : "Podepsat"}
        </Button>
        <Button type="button" variant="secondary" onClick={clear} className="min-h-9">
          Smazat
        </Button>
        <span className="text-xs text-muted">Uloží se jméno, čas a zařízení.</span>
      </div>
      {error && <p className="mt-2 text-sm text-brick-text">{error}</p>}
    </div>
  );
}
