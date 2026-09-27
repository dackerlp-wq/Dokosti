"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { savePetProfile } from "@/app/(shop)/ucet/actions";
import { PetFields, petComplete } from "@/components/account/pet-form";
import { Button } from "@/components/ui/button";
import { emptyPet, type PetProfile } from "@/lib/club";

/** Přidání nebo úprava profilu zvířete v účtu. */
export function PetEditor({ initial, id, petPoints, onDone }: { initial?: PetProfile; id?: string; petPoints: number; onDone?: () => void }) {
  const [open, setOpen] = useState(Boolean(initial));
  const [pet, setPet] = useState<PetProfile>(initial ?? emptyPet());
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <Plus strokeWidth={1.75} className="h-4 w-4" /> Přidat zvíře
      </Button>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await savePetProfile(pet, id);
          if (!res.ok) return setMsg({ ok: false, text: res.error });
          setMsg({ ok: true, text: res.awarded > 0 ? `Uloženo, připsali jsme ${res.awarded} Kostiček.` : "Uloženo." });
          if (!id) {
            setPet(emptyPet());
            setOpen(false);
          }
          onDone?.();
        });
      }}
      className="rounded-[var(--radius-card)] border border-line bg-paper p-4"
    >
      <PetFields pet={pet} onChange={setPet} idPrefix={id ?? "new"} />
      {petPoints > 0 && !id && !petComplete(pet) && <p className="mt-2 text-xs text-muted">Za profil se jménem, váhou a datem narození připíšeme {petPoints} Kostiček.</p>}
      {msg && <p className={`mt-2 text-sm ${msg.ok ? "text-green" : "text-brick-text"}`}>{msg.text}</p>}
      <div className="mt-3 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Ukládám…" : id ? "Uložit změny" : "Uložit zvíře"}
        </Button>
        <button type="button" onClick={() => { setOpen(false); onDone?.(); }} className="text-sm text-muted hover:underline">
          Zavřít
        </button>
      </div>
    </form>
  );
}

/** Řádek zvířete s možností rozbalit úpravu. */
export function PetRowEditable({ pet, id, summary, petPoints, deleteAction }: { pet: PetProfile; id: string; summary: string; petPoints: number; deleteAction: React.ReactNode }) {
  const [editing, setEditing] = useState(false);
  return (
    <li className="p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>
          <strong>{pet.name}</strong> <span className="text-muted">· {summary}</span>
        </span>
        <span className="flex items-center gap-3">
          <a href="/kalkulacka" className="text-green underline">
            Dávka a doporučení
          </a>
          <button type="button" onClick={() => setEditing((v) => !v)} className="text-green underline">
            {editing ? "Zavřít" : "Upravit"}
          </button>
          {deleteAction}
        </span>
      </div>
      {editing && (
        <div className="mt-3">
          <PetEditor initial={pet} id={id} petPoints={petPoints} onDone={() => setEditing(false)} />
        </div>
      )}
    </li>
  );
}
