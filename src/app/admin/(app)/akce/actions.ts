"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { flashError, flashOk } from "@/lib/flash";
import { getAuthSupabase, requireManager } from "@/lib/supabase/auth";

function revalidate() {
  revalidatePath("/admin/akce");
  revalidatePath("/admin/produkty");
  revalidatePath("/", "layout");
}

/** Naplánuje akční cenu produktu. Když začíná dnes, rovnou se spustí. */
export async function createPriceAction(fd: FormData) {
  const admin = await requireManager();
  const productId = String(fd.get("product_id") ?? "");
  const price = Math.round(Number(fd.get("sale_price_czk")));
  const from = String(fd.get("starts_on") ?? "");
  const to = String(fd.get("ends_on") ?? "");
  const name = String(fd.get("name") ?? "").trim().slice(0, 120);
  if (!productId || !Number.isFinite(price) || price < 0 || !from || !to || to < from) return flashError("Vyplňte produkt, akční cenu a platnost (od–do).");
  const db = await getAuthSupabase();
  const { data: p } = await db.from("products").select("variant, price_czk").eq("id", productId).maybeSingle();
  if (!p) return flashError("Produkt nenalezen.");
  if (price >= p.price_czk) return flashError(`Akční cena musí být nižší než ${p.price_czk} Kč.`);
  const { data: clash } = await db.from("price_actions").select("id").eq("product_id", productId).in("status", ["planovana", "aktivni"]).lte("starts_on", to).gte("ends_on", from).limit(1);
  if (clash && clash.length) return flashError("Produkt už má v tomto období jinou akci.");
  const { error } = await db.from("price_actions").insert({ product_id: productId, sale_price_czk: price, starts_on: from, ends_on: to, name, created_by: admin.id });
  if (error) return flashError(error.message);
  const { data: run } = await db.rpc("price_actions_run");
  const started = (run as { started?: number } | null)?.started ?? 0;
  await logActivity(db, admin, { kind: "akce.zalozena", subject: "product", subjectId: productId, text: `Akce ${name ? `„${name}“ ` : ""}na ${p.variant}: ${price} Kč místo ${p.price_czk} Kč, ${from} až ${to}` });
  revalidate();
  await flashOk(started > 0 ? "Akce uložena a hned spuštěna." : `Akce uložena, spustí se ${from}.`);
}

export async function cancelPriceAction(fd: FormData) {
  const admin = await requireManager();
  const id = String(fd.get("id") ?? "");
  const db = await getAuthSupabase();
  const { data: a } = await db.from("price_actions").select("name, status, product_id, products(variant)").eq("id", id).maybeSingle();
  if (!a) return flashError("Akce nenalezena.");
  if (a.status === "skoncena" || a.status === "zrusena") return flashError("Akce už neběží.");
  const { error } = await db.from("price_actions").update({ status: "zrusena" }).eq("id", id);
  if (error) return flashError(error.message);
  await db.rpc("price_actions_run"); // vrátí cenu, pokud akce běžela
  const variant = (a as unknown as { products: { variant: string } | null }).products?.variant ?? "";
  await logActivity(db, admin, { kind: "akce.zrusena", subject: "product", subjectId: a.product_id, text: `Akce ${a.name ? `„${a.name}“ ` : ""}na ${variant} zrušena` });
  revalidate();
  await flashOk("Akce zrušena, cena je zpátky.");
}

/** Ruční spuštění kontroly akcí (jinak běží denní cron). */
export async function runPriceActions() {
  const admin = await requireManager();
  const db = await getAuthSupabase();
  const { data, error } = await db.rpc("price_actions_run");
  if (error) return flashError(error.message);
  const r = data as { started: number; ended: number };
  if (r.started || r.ended) await logActivity(db, admin, { kind: "akce.spusteno", subject: "product", subjectId: "", text: `Akce: ${r.started} spuštěno, ${r.ended} skončilo` });
  revalidate();
  await flashOk(`Zkontrolováno: ${r.started} spuštěno, ${r.ended} skončilo.`);
}
