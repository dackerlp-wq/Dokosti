"use server";

import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase/server";
import type { ManageAction, SubscriptionView } from "@/lib/subscriptions";

export type ManageResult = { ok: true; subscription: SubscriptionView } | { ok: false; error: string };

/** Změna předplatného tokenem z odkazu (bez přihlášení). Rozhoduje databázová funkce manage_subscription. */
export async function manageSubscription(token: string, action: ManageAction, payload: Record<string, unknown> = {}): Promise<ManageResult> {
  const db = getSupabase();
  if (!db) return { ok: false, error: "Předplatné funguje až s databází." };
  if (!/^[0-9a-f]{32}$/.test(token)) return { ok: false, error: "Neplatný odkaz." };
  const { data, error } = await db.rpc("manage_subscription", { p_token: token, p_action: action, p_payload: payload });
  if (error || !data) {
    const msg = error?.message ?? "";
    return { ok: false, error: msg.includes("cancelled") ? "Toto předplatné je zrušené." : msg.includes("empty") ? "Musí zůstat aspoň jedna položka." : "Změnu se nepodařilo uložit." };
  }
  revalidatePath(`/predplatne/${token}`);
  revalidatePath("/ucet");
  revalidatePath("/admin/predplatne");
  return { ok: true, subscription: data as SubscriptionView };
}
