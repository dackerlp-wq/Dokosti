"use client";

import { useActionState } from "react";
import { submitInquiry, type InquiryState } from "@/app/(shop)/jak-zacit-s-barfem/actions";
import { Button } from "@/components/ui/button";
import { Field, fieldInput } from "@/components/ui/field";

export function InquiryForm() {
  const [state, action, pending] = useActionState<InquiryState, FormData>(submitInquiry, null);
  if (state?.ok) {
    return (
      <div className="rounded-card border border-line bg-white p-5 shadow-card">
        <p className="text-heading-lg text-green">Dotaz je u nás.</p>
        <p className="mt-1 text-sm text-muted">Ozveme se zpravidla do jednoho pracovního dne.</p>
      </div>
    );
  }
  return (
    <form action={action} className="grid gap-5 rounded-card border border-line bg-white p-5 shadow-card sm:grid-cols-2">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <Field label="Jméno" name="name" required autoComplete="name" />
      <Field label="E-mail" name="email" type="email" required autoComplete="email" />
      <label className="block">
        <span className="mb-1 block text-label text-green">Pes, nebo kočka?</span>
        <select name="animal" defaultValue="pes" className={fieldInput}>
          <option value="pes">Pes</option>
          <option value="kocka">Kočka</option>
          <option value="oba">Pes i kočka</option>
        </select>
      </label>
      <Field label="Věk a hmotnost" name="age_weight" placeholder="např. 3 roky, 22 kg" />
      <label className="block sm:col-span-2">
        <span className="mb-1 block text-label text-green">Váš dotaz</span>
        <textarea name="question" rows={4} required minLength={10} className="px-5 py-3.5" placeholder="Co vašeho psa nebo kočku trápí, s čím pomoct…" />
      </label>
      {state?.error && (
        <p role="alert" className="text-sm text-brick-text sm:col-span-2">
          {state.error}
        </p>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" variant="action" size="md" disabled={pending}>
          {pending ? "Odesílám…" : "Odeslat dotaz"}
        </Button>
      </div>
    </form>
  );
}


