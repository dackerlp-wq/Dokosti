"use server";

import { feedingPlanEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { renderPlanPdf } from "@/lib/pdf/plan";
import { decodePlanRequest, plansFor } from "@/lib/pdf/request";
import { getProducts } from "@/lib/products";
import { SITE_URL } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { getSupabase } from "@/lib/supabase/server";

/** Pošle plán krmení v PDF na zadaný e-mail. `encoded` je stejný parametr jako u odkazu na PDF. */
export async function emailPlan(email: string, encoded: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const to = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { ok: false, error: "Zadejte platný e-mail." };
  const request = decodePlanRequest(encoded);
  if (!request) return { ok: false, error: "Plán se nepodařilo sestavit." };
  const db = getSupabase();
  if (!db) return { ok: false, error: "Odesílání e-mailů zatím není nastavené." };
  const [products, settings] = await Promise.all([getProducts(), getSettings()]);
  const plans = plansFor(request, products);
  const pdf = await renderPlanPdf(plans, settings.shop);
  const names = plans.map((p) => p.input.name || (p.input.species === "pes" ? "pes" : "kočka"));
  await sendEmail(db, to, feedingPlanEmail(names, `${SITE_URL}/kalkulacka?d=${encoded}`, settings), "plan", null, [{ filename: "plan-krmeni.pdf", content: pdf }]);
  return { ok: true };
}
