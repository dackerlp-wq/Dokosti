"use server";

import { sendEmail } from "@/lib/email/send";
import { getSettings } from "@/lib/settings";
import { getSupabase } from "@/lib/supabase/server";

export type InquiryState = { ok?: true; error?: string } | null;

/** Dotaz z poradny: uloží do databáze a pošle prodejně e-mail. */
export async function submitInquiry(_prev: InquiryState, fd: FormData): Promise<InquiryState> {
  const name = String(fd.get("name") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim();
  const animal = String(fd.get("animal") ?? "").trim();
  const ageWeight = String(fd.get("age_weight") ?? "").trim();
  const question = String(fd.get("question") ?? "").trim();
  if (String(fd.get("website") ?? "")) return { ok: true }; // past na roboty
  if (!name || !email.includes("@") || question.length < 10) {
    return { error: "Doplňte prosím jméno, e-mail a dotaz (aspoň pár slov)." };
  }

  const db = getSupabase();
  if (!db) {
    console.info("[dotaz, Supabase není nastavené]", { name, email, animal, ageWeight, question });
    return { ok: true };
  }
  const { error } = await db.rpc("submit_inquiry", { p_name: name, p_email: email, p_animal: animal, p_age_weight: ageWeight, p_question: question });
  if (error) return { error: "Dotaz se nepodařilo odeslat. Zkuste to znovu nebo nám zavolejte." };

  const settings = await getSettings();
  if (settings.shop.email.includes("@")) {
    const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
    const text = `Dotaz z poradny\n\n${name} · ${email}\n${animal}${ageWeight ? ` · ${ageWeight}` : ""}\n\n${question}`;
    await sendEmail(
      db,
      settings.shop.email,
      {
        subject: `Dotaz z poradny: ${name}`,
        text,
        html: `<p><strong>${esc(name)}</strong> · <a href="mailto:${esc(email)}">${esc(email)}</a><br>${esc(animal)}${ageWeight ? ` · ${esc(ageWeight)}` : ""}</p><p style="white-space:pre-line">${esc(question)}</p>`,
      },
      "poradna",
      null,
    );
  }
  return { ok: true };
}
