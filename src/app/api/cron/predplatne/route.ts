import { NextResponse, type NextRequest } from "next/server";
import { sendEmail } from "@/lib/email/send";
import { orderConfirmation, orderNotification, subscriptionFailed, subscriptionReminder, type OrderForEmail } from "@/lib/email/templates";
import { SITE_URL } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import type { SubscriptionView } from "@/lib/subscriptions";
import { getSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Denní cron předplatného (Vercel Cron, vercel.json). Pošle připomínky a založí objednávky
 * na dodávky, u kterých nastala uzávěrka. Ověřuje CRON_SECRET, stejnou hodnotu má tabulka secrets.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getSupabase();
  if (!db) return NextResponse.json({ error: "no database" }, { status: 500 });

  const today = new Date().toISOString().slice(0, 10);
  const settings = await getSettings();
  const { data, error } = await db.rpc("subscriptions_due", { p_secret: secret, p_today: today });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const due = (data ?? []) as { action: "remind" | "order"; subscription: SubscriptionView }[];
  const log: string[] = [];

  for (const { action, subscription: s } of due) {
    const manageUrl = `${SITE_URL}/predplatne/${s.token}`;
    try {
      if (action === "remind") {
        await sendEmail(db, s.customer_email, subscriptionReminder(s, settings, manageUrl), "predplatne-pripominka", null);
        await db.rpc("subscription_mark", { p_secret: secret, p_id: s.id, p_action: "reminded" });
        log.push(`remind ${s.id}`);
        continue;
      }
      if (s.skip_next) {
        await db.rpc("subscription_mark", { p_secret: secret, p_id: s.id, p_action: "skipped" });
        log.push(`skip ${s.id}`);
        continue;
      }
      const order = {
        customer_name: s.customer_name,
        customer_email: s.customer_email,
        customer_phone: s.customer_phone ?? "",
        street: s.street,
        city: s.city,
        zip: s.zip,
        note: s.note ? `${s.note} (pravidelný odběr)` : "Pravidelný odběr",
        shipping_method: s.shipping_method,
        payment_method: s.payment_method,
        delivery_date: s.shipping_method === "rozvoz" ? s.next_date : "",
        coupon_code: "",
        points_redeem: 0,
        subscribe_interval: String(s.interval_days),
        subscription_id: s.id,
      };
      const items = s.items.filter((i) => i.available !== false).map((i) => ({ product_slug: i.product_slug, qty: i.qty }));
      if (items.length === 0) throw new Error("žádná položka není skladem");
      const { data: created, error: orderError } = await db.rpc("create_order", { p_order: order, p_items: items });
      if (orderError || !created) throw new Error(orderError?.message ?? "create_order selhalo");
      const r = created as { order_number: string };
      await db.rpc("subscription_mark", { p_secret: secret, p_id: s.id, p_action: "ordered", p_order_number: r.order_number });
      log.push(`order ${s.id} ${r.order_number}`);

      const { data: full } = await db.rpc("order_for_email", { p_order_number: r.order_number });
      if (full) {
        const o = full as OrderForEmail;
        await sendEmail(db, o.customer_email, orderConfirmation(o, settings), "potvrzeni", o.id);
        if (settings.shop.email.includes("@")) {
          await sendEmail(db, settings.shop.email, orderNotification(o, settings, `${SITE_URL}/admin/objednavky/${o.id}`), "upozorneni", o.id);
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      log.push(`fail ${s.id} ${message}`);
      await db.rpc("subscription_mark", { p_secret: secret, p_id: s.id, p_action: "failed", p_error: message });
      if (settings.shop.email.includes("@")) {
        await sendEmail(db, settings.shop.email, subscriptionFailed(s, message, settings, `${SITE_URL}/admin/predplatne/${s.id}`), "predplatne-chyba", null);
      }
    }
  }
  return NextResponse.json({ today, processed: due.length, log });
}
