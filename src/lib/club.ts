import { type Activity, type AnimalInput, type Condition, type MeatKey, newAnimal, type Species, type Stage } from "@/lib/barf";
import type { Sex } from "@/lib/jmena";

export type Reproduction = "" | "brezi" | "kojici";
export const REPRODUCTION_LABEL: Record<Species, Record<Exclude<Reproduction, "">, string>> = {
  pes: { brezi: "Březí", kojici: "Kojí štěňata" },
  kocka: { brezi: "Březí", kojici: "Kojí koťata" },
};
/** Označení podle druhu a pohlaví: pes / fena, kocour / kočka. */
export const SEX_LABEL: Record<Species, Record<Sex, string>> = { pes: { samec: "Pes", samice: "Fena" }, kocka: { samec: "Kocour", samice: "Kočka" } };

/** Profil zvířete tak, jak ho sbírá registrace a účet (strukturovaně, tabulka `pets`). */
export type PetProfile = {
  id?: string;
  species: Species;
  /** Pohlaví: kvůli oslovení (Báře / Rexovi) a březosti. */
  sex: Sex;
  name: string;
  breed: string;
  /** ISO datum narození, může být přibližné. */
  bornOn: string;
  /** Jen u samic: březí nebo kojící, dávka se počítá jinak. */
  reproduction: Reproduction;
  pregnancyWeek?: number;
  weightKg: number;
  neutered: boolean;
  activity: Activity;
  condition: Condition;
  feedingNow: FeedingNow;
  currentFood: string;
  exclude: MeatKey[];
  note: string;
};

export type FeedingNow = "" | "granule" | "barf" | "mix" | "konzervy";
export const FEEDING_LABEL: Record<Exclude<FeedingNow, "">, string> = {
  granule: "Granule",
  barf: "Syrová strava (BARF)",
  mix: "Kombinace granulí a syrového",
  konzervy: "Konzervy nebo kapsičky",
};

export const HEARD_FROM = ["Doporučení od známých", "Prodejna", "Internet, vyhledávač", "Sociální sítě", "Veterinář, chovatel", "Jinde"] as const;

export const PET_SOURCE_LABEL: Record<string, string> = { web: "web", prodejna: "prodejna", admin: "admin" };

export function emptyPet(species: Species = "pes"): PetProfile {
  return { species, sex: "samec", name: "", breed: "", bornOn: "", reproduction: "", weightKg: 0, neutered: true, activity: "bezna", condition: "idealni", feedingNow: "", currentFood: "", exclude: [], note: "" };
}

/** Věk v měsících z data narození (celé měsíce). */
export function ageMonths(bornOn: string, now = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bornOn)) return null;
  const b = new Date(bornOn + "T12:00:00");
  if (Number.isNaN(b.getTime()) || b > now) return null;
  return Math.max(0, (now.getFullYear() - b.getFullYear()) * 12 + now.getMonth() - b.getMonth() - (now.getDate() < b.getDate() ? 1 : 0));
}

/** Životní fáze pro kalkulačku: štěně/kotě do 12 měsíců, senior pes od 7 let, kočka od 11 let. */
export function stageFor(species: Species, months: number | null): Stage {
  if (months === null) return "dospely";
  if (months < 12) return "mlade";
  if (species === "pes" ? months >= 84 : months >= 132) return "senior";
  return "dospely";
}

/** Profil zvířete → vstup kalkulačky (uloží se do `pets.data`, kalkulačka ho načte beze změny). */
export function petToAnimal(p: PetProfile): AnimalInput {
  const months = ageMonths(p.bornOn);
  const stage: Stage = p.sex === "samice" && p.reproduction ? p.reproduction : stageFor(p.species, months);
  return {
    ...newAnimal(p.species),
    name: p.name,
    stage,
    weightKg: p.weightKg,
    condition: p.condition,
    activity: p.activity,
    neutered: p.neutered,
    ageMonths: stage === "mlade" && months !== null ? Math.max(1, months) : undefined,
    pregnancyWeek: stage === "brezi" ? p.pregnancyWeek : undefined,
    rawShare: p.feedingNow === "mix" ? 50 : 100,
    beginner: p.feedingNow === "granule" || p.feedingNow === "konzervy",
    exclude: p.exclude,
  };
}

/** Text pro kasu a admin: „pes, 28 kg, 3 roky, bez kuřecího“. */
export function petSummary(p: { species: string | null; sex?: string | null; weight_kg: number | string | null; born_on: string | null; exclude: string[] | null }, meatLabel: Record<string, string>): string {
  const parts = [p.species === "kocka" ? (p.sex === "samec" ? "kocour" : "kočka") : p.sex === "samice" ? "fena" : "pes"];
  if (p.weight_kg) parts.push(`${Number(p.weight_kg).toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} kg`);
  const m = p.born_on ? ageMonths(p.born_on) : null;
  if (m !== null) parts.push(m < 12 ? `${m} měs.` : `${Math.floor(m / 12)} r.`);
  if (p.exclude?.length) parts.push("bez " + p.exclude.map((k) => (meatLabel[k] ?? k).toLowerCase()).join(", "));
  return parts.join(", ");
}
