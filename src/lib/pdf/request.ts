import { buildPlan, newAnimal, type AnimalInput, type Plan } from "@/lib/barf";
import type { Product } from "@/lib/catalog";

/** Vstup pro plán (z odkazu nebo e-mailu): zvířata a délka nákupu. */
export type PlanRequest = { animals: AnimalInput[]; days: number };

/** Zakóduje vstup do URL parametru (base64url JSON). */
export function encodePlanRequest(req: PlanRequest) {
  return Buffer.from(JSON.stringify(req), "utf8").toString("base64url");
}

/** Přečte vstup z parametru; neplatná data vrátí null. Každé zvíře se doplní o výchozí hodnoty. */
export function decodePlanRequest(raw: string | null): PlanRequest | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<PlanRequest>;
    if (!Array.isArray(parsed.animals) || parsed.animals.length === 0 || parsed.animals.length > 6) return null;
    const animals = parsed.animals.map((a) => {
      const base = newAnimal(a.species === "kocka" ? "kocka" : "pes");
      const out: AnimalInput = { ...base, ...a, addons: { ...base.addons, ...(a.addons ?? {}) }, exclude: a.exclude ?? [], removed: a.removed ?? [] };
      out.name = String(out.name ?? "").slice(0, 40);
      out.weightKg = Number(out.weightKg);
      if (!(out.weightKg > 0 && out.weightKg < 200)) throw new Error("weight");
      return out;
    });
    const days = [7, 14, 28].includes(Number(parsed.days)) ? Number(parsed.days) : 14;
    return { animals, days };
  } catch {
    return null;
  }
}

export function plansFor(req: PlanRequest, products: Product[]): Plan[] {
  return req.animals.map((a) => buildPlan(products, a, req.days));
}
