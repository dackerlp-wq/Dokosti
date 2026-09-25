import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmailMessage } from "@/lib/email/templates";

/**
 * Odeslání e-mailu přes Resend (https://resend.com). Bez RESEND_API_KEY se e-mail
 * jen uloží do logu se stavem „čeká“; po nastavení domény se začne odesílat.
 * `db` může být anon klient (log_email je security definer).
 */
export async function sendEmail(
  db: SupabaseClient,
  to: string,
  msg: EmailMessage,
  kind: string,
  orderId: string | null,
  attachments: { filename: string; content: Buffer }[] = [],
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  let status: "ceka" | "odeslano" | "chyba" = "ceka";
  let error: string | null = null;
  let providerId: string | null = null;

  if (apiKey && from) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to,
          subject: msg.subject,
          html: msg.html,
          text: msg.text,
          reply_to: process.env.EMAIL_REPLY_TO || undefined,
          attachments: attachments.length ? attachments.map((a) => ({ filename: a.filename, content: a.content.toString("base64") })) : undefined,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
      if (res.ok) {
        status = "odeslano";
        providerId = body.id ?? null;
      } else {
        status = "chyba";
        error = body.message ?? `HTTP ${res.status}`;
      }
    } catch (e) {
      status = "chyba";
      error = e instanceof Error ? e.message : String(e);
    }
  }

  const { error: logError } = await db.rpc("log_email", {
    p_to: to,
    p_subject: msg.subject,
    p_html: msg.html,
    p_text: msg.text,
    p_kind: kind,
    p_order_id: orderId,
    p_status: status,
    p_error: error,
    p_provider_id: providerId,
  });
  if (logError) console.error("log_email", logError);
}
