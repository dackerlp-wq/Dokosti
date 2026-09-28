"use client";

import { ACTIVITY_LABEL, CONDITION_LABEL, MEAT_LABEL, type MeatKey } from "@/lib/barf";
import { FEEDING_LABEL, type FeedingNow, type PetProfile, REPRODUCTION_LABEL, type Reproduction, SEX_LABEL } from "@/lib/club";
import type { Sex } from "@/lib/jmena";

const MEATS = Object.keys(MEAT_LABEL) as MeatKey[];

/** Pole profilu zvířete, sdílená registrací a účtem. Řízená komponenta. */
export function PetFields({ pet, onChange, idPrefix = "pet" }: { pet: PetProfile; onChange: (p: PetProfile) => void; idPrefix?: string }) {
  const set = (patch: Partial<PetProfile>) => onChange({ ...pet, ...patch });
  const id = (k: string) => `${idPrefix}-${k}`;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2 flex gap-2">
        {(["pes", "kocka"] as const).map((sp) => (
          <button key={sp} type="button" onClick={() => set({ species: sp })} aria-pressed={pet.species === sp} className={`label min-h-10 flex-1 rounded-[var(--radius-control)] border text-[11px] ${pet.species === sp ? "border-green bg-green text-cream" : "border-line bg-cream text-green"}`}>
            {sp === "pes" ? "Pes" : "Kočka"}
          </button>
        ))}
      </div>
      <div className="sm:col-span-2 flex gap-2">
        {(["samec", "samice"] as const).map((sx: Sex) => (
          <button key={sx} type="button" onClick={() => set({ sex: sx, reproduction: sx === "samice" ? pet.reproduction : "" })} aria-pressed={pet.sex === sx} className={`label min-h-10 flex-1 rounded-[var(--radius-control)] border text-[11px] ${pet.sex === sx ? "border-green bg-green text-cream" : "border-line bg-cream text-green"}`}>
            {SEX_LABEL[pet.species][sx]}
          </button>
        ))}
      </div>
      <label className="block">
        <span className="label mb-1 block text-[11px] text-muted">Jméno</span>
        <input id={id("name")} value={pet.name} onChange={(e) => set({ name: e.target.value })} required maxLength={60} />
      </label>
      <label className="block">
        <span className="label mb-1 block text-[11px] text-muted">Plemeno</span>
        <input id={id("breed")} value={pet.breed} onChange={(e) => set({ breed: e.target.value })} maxLength={80} placeholder="nebo kříženec" />
      </label>
      <label className="block">
        <span className="label mb-1 block text-[11px] text-muted">Datum narození</span>
        <input id={id("born")} type="date" value={pet.bornOn} onChange={(e) => set({ bornOn: e.target.value })} max={today} required />
        <span className="mt-1 block text-xs text-muted">Stačí přibližně, podle věku počítáme dávku.</span>
      </label>
      <label className="block">
        <span className="label mb-1 block text-[11px] text-muted">Váha (kg)</span>
        <input id={id("weight")} type="number" inputMode="decimal" min={0.3} max={120} step={0.1} value={pet.weightKg || ""} onChange={(e) => set({ weightKg: Number(e.target.value) })} required />
      </label>
      <label className="block">
        <span className="label mb-1 block text-[11px] text-muted">Aktivita</span>
        <select value={pet.activity} onChange={(e) => set({ activity: e.target.value as PetProfile["activity"] })}>
          {Object.entries(ACTIVITY_LABEL[pet.species]).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="label mb-1 block text-[11px] text-muted">Kondice</span>
        <select value={pet.condition} onChange={(e) => set({ condition: e.target.value as PetProfile["condition"] })}>
          {Object.entries(CONDITION_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="label mb-1 block text-[11px] text-muted">Co teď krmíte</span>
        <select value={pet.feedingNow} onChange={(e) => set({ feedingNow: e.target.value as FeedingNow })}>
          <option value="">Vyberte…</option>
          {Object.entries(FEEDING_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="label mb-1 block text-[11px] text-muted">Značka nebo druh krmiva</span>
        <input value={pet.currentFood} onChange={(e) => set({ currentFood: e.target.value })} maxLength={120} placeholder="nepovinné" />
      </label>
      {pet.sex === "samice" && (
        <label className="block">
          <span className="label mb-1 block text-[11px] text-muted">Březost, kojení</span>
          <select value={pet.reproduction} onChange={(e) => set({ reproduction: e.target.value as Reproduction })}>
            <option value="">Ne</option>
            {Object.entries(REPRODUCTION_LABEL[pet.species]).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      )}
      {pet.sex === "samice" && pet.reproduction === "brezi" && (
        <label className="block">
          <span className="label mb-1 block text-[11px] text-muted">Týden březosti (1–9)</span>
          <input type="number" inputMode="numeric" min={1} max={9} value={pet.pregnancyWeek ?? ""} onChange={(e) => set({ pregnancyWeek: Number(e.target.value) || undefined })} placeholder="např. 6" />
        </label>
      )}
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" checked={pet.neutered} onChange={(e) => set({ neutered: e.target.checked })} className="h-4 min-h-0 w-4 accent-green" />
        {pet.sex === "samice" ? "Kastrovaná" : "Kastrovaný"}
      </label>
      <fieldset className="sm:col-span-2">
        <legend className="label mb-1 text-[11px] text-muted">Nesnáší nebo nechcete (vynecháme při doporučení)</legend>
        <div className="flex flex-wrap gap-2">
          {MEATS.map((m) => {
            const on = pet.exclude.includes(m);
            return (
              <button key={m} type="button" onClick={() => set({ exclude: on ? pet.exclude.filter((x) => x !== m) : [...pet.exclude, m] })} aria-pressed={on} className={`min-h-9 rounded-full border px-3 text-sm ${on ? "border-brick-text bg-brick-text text-cream" : "border-line bg-cream text-ink"}`}>
                {MEAT_LABEL[m]}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-muted">Jde o výběr krmiva, ne o diagnózu. Při zdravotních potížích se poraďte s veterinářem.</p>
      </fieldset>
      <label className="block sm:col-span-2">
        <span className="label mb-1 block text-[11px] text-muted">Poznámka</span>
        <input value={pet.note} onChange={(e) => set({ note: e.target.value })} maxLength={300} placeholder="nepovinné, např. vybíravý, rád kosti" />
      </label>
    </div>
  );
}

export function petComplete(p: PetProfile) {
  return p.name.trim() !== "" && p.weightKg > 0 && /^\d{4}-\d{2}-\d{2}$/.test(p.bornOn);
}
