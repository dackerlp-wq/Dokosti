import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";
import { orderConfirmation, orderNotification, type OrderForEmail } from "@/lib/email/templates";
import { SITE_URL } from "@/lib/seo";
import type { Settings } from "@/lib/settings";

/**
 * Potvrzení zákazníkovi a upozornění prodejně po založení objednávky (z webu i z adminu).
 * Bez e-mailu zákazníka se pošle jen upozornění. Chyba e-mailu objednávku neruší.
 */
export async function sendNewOrderEmails(db: SupabaseClient, orderNumber: string, settings: Settings, { notifyCustomer = true } = {}): Promise<OrderForEmail | null> {
  try {
    const { data: full } = await db.rpc("order_for_email", { p_order_number: orderNumber });
    if (!full) return null;
    const o = full as OrderForEmail;
    const base = SITE_URL;
    if (notifyCustomer && o.customer_email.includes("@")) await sendEmail(db, o.customer_email, orderConfirmation(o, settings), "potvrzeni", o.id);
    if (settings.shop.email.includes("@")) {
      await sendEmail(db, settings.shop.email, orderNotification(o, settings, `${base}/admin/objednavky/${o.id}`), "upozorneni", o.id);
    }
    return o;
  } catch (e) {
    console.error("order e-mail", e);
    return null;
  }
}
