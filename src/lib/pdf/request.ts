import { buildPlan, newAnimal, type AnimalInput, type Plan } from "@/lib/barf";
import type { Product } from "@/lib/catalog";

/** Vstup pro plán (z odkazu nebo e-mailu): zvířata a délka nákupu. */
export type PlanRequest = { animals: AnimalInput[]; days: number };

/** base64url bez Bufferu, aby to šlo i v prohlížeči. */
function toBase64Url(text: string) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromBase64Url(raw: string) {
  const b64 = raw.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (raw.length % 4)) % 4);
  const bin = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** Zakóduje vstup do URL parametru (base64url JSON). */
export function encodePlanRequest(req: PlanRequest) {
  return toBase64Url(JSON.stringify(req));
}

/** Přečte vstup z parametru; neplatná data vrátí null. Každé zvíře se doplní o výchozí hodnoty. */
export function decodePlanRequest(raw: string | null): PlanRequest | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(raw)) as Partial<PlanRequest>;
    if (!Array.isArray(parsed.animals) || parsed.animals.length === 0 || parsed.animals.length > 6) return null;
    const animals = parsed.animals.map((a) => {
      const base = newAnimal(a.species === "kocka" ? "kocka" : "pes");
      const out: AnimalInput = { ...base, ...a, addons: { ...base.addons, ...(a.addons ?? {}) }, exclude: a.exclude ?? [], removed: a.removed ?? [], swaps: a.swaps ?? {} };
      out.name = String(out.name ?? "").slice(0, 40);
      out.weightKg = Number(out.weightKg);
      if (!(out.weightKg > 0 && out.weightKg < 200)) throw new Error("weight");
      return out;
    });
    const days = [7, 14, 28, 30].includes(Number(parsed.days)) ? Number(parsed.days) : 14;
    return { animals, days };
  } catch {
    return null;
  }
}

export function plansFor(req: PlanRequest, products: Product[]): Plan[] {
  return req.animals.map((a) => buildPlan(products, a, req.days));
}
